import dotenv from 'dotenv'
import gpt from './gpt.js'
import { Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import history from './history.js'
import { generateKey, activateUser, isActivated } from './db.js'

dotenv.config()

// Admin usernames from .env (comma-separated)
const adminUsernames = process.env.ADMIN_USERNAMES ? process.env.ADMIN_USERNAMES.split(',') : []

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

// Start command: check activation (skip for admins)
bot.start(async (ctx) => {
  const chatId = ctx.chat.id
  const user = ctx.from.username
  const isAdmin = adminUsernames.includes(user)
  const activated = await isActivated(chatId)

  if (!activated && !isAdmin) {
    return ctx.reply('Привет! Этот бот доступен только после активации.\nОтправьте ключ активации или используйте /activate <ключ>.')
  }

  const response = await gpt.generate(
    'Пользователь запустил бота. Сгенерируй короткое приветственное сообщение'
  )

  history.clear(ctx.chat.id)

  await ctx.reply(response.text, {
    parse_mode: 'Markdown',
  })
})

// Activation command for users
bot.command('activate', async (ctx) => {
  const chatId = ctx.chat.id
  const parts = ctx.message.text.split(' ')
  if (parts.length < 2) {
    return ctx.reply('Использование: /activate <ключ>')
  }
  const key = parts[1].trim()
  try {
    const expiration = await activateUser(chatId, key)
    const date = new Date(expiration).toLocaleString('ru-RU')
    await ctx.reply(`Активировано до ${date}`)
  } catch (err) {
    if (err.message === 'invalid_key') {
      return ctx.reply('Неверный ключ активации.')
    }
    if (err.message === 'key_used') {
      return ctx.reply('Этот ключ уже использован.')
    }
    return ctx.reply('Ошибка активации.')
  }
})

// Admin command to generate activation keys
bot.command('genkey', async (ctx) => {
  const user = ctx.from.username
  if (!adminUsernames.includes(user)) {
    return ctx.reply('Только администраторы могут использовать эту команду.')
  }
  await ctx.reply('Введите количество дней для ключа:')
})

// Handle days input for genkey and activation keys
bot.on(message('text'), async (ctx) => {
  const chatId = ctx.chat.id
  const user = ctx.from.username
  const isAdmin = adminUsernames.includes(user)
  const userMessage = ctx.message.text

  // Check if this is a response to genkey command for admin
  if (isAdmin && /^\d+$/.test(userMessage.trim())) {
    const days = parseInt(userMessage.trim(), 10)
    if (days > 0) {
      try {
        const key = await generateKey(days)
        return ctx.reply(`Новый ключ: \`${key}\`\nДействует ${days} дней.`, { parse_mode: 'Markdown' })
      } catch (err) {
        // If it fails, continue to normal message processing
      }
    }
  }

  // Check activation for regular messages (skip for admins)
  const activated = await isActivated(chatId)
  if (!activated && !isAdmin) {
    // Try to activate with the message as key (if it looks like an activation key)
    if (/^[A-Za-z0-9]{10}$/.test(userMessage.trim())) {
      try {
        const expiration = await activateUser(chatId, userMessage.trim())
        const date = new Date(expiration).toLocaleString('ru-RU')
        return ctx.reply(`✅ Активировано до ${date}`)
      } catch (err) {
        if (err.message === 'invalid_key') {
          return ctx.reply('❌ Неверный ключ активации.\nОтправьте корректный ключ активации или используйте /activate <ключ>.')
        }
        if (err.message === 'key_used') {
          return ctx.reply('❌ Этот ключ уже использован.\nОтправьте новый ключ активации.')
        }
      }
    }
    return ctx.reply('Бот доступен только после активации.\nОтправьте ключ активации или используйте /activate <ключ>.')
  }

  history.addMessage(chatId, 'user', userMessage)

  const chatHistory = history.get(chatId)
  const { text, filePath } = await gpt.generate(chatHistory)

  if (filePath) {
    // Добавляем основной ответ помощника
    history.addMessage(chatId, 'assistant', text)
    // Добавляем информацию о генерации документа
    history.addDocumentGeneration(chatId, filePath)

    await ctx.reply(text, { parse_mode: 'Markdown' })
    await ctx.replyWithDocument({ source: filePath })
  } else {
    history.addMessage(chatId, 'assistant', text)
    await ctx.reply(text, { parse_mode: 'Markdown' })
  }
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
