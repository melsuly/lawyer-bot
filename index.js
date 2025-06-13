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
    return ctx.reply('Привет! Этот бот доступен только после активации. Используй команду /activate <ключ>.')
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
  const parts = ctx.message.text.split(' ')
  if (parts.length < 2) {
    return ctx.reply('Использование: /genkey <количество_дней>')
  }
  const days = parseInt(parts[1], 10)
  if (isNaN(days) || days <= 0) {
    return ctx.reply('Неверное количество дней.')
  }
  const key = await generateKey(days)
  await ctx.reply(`Новый ключ: ${key}\nДействует ${days} дней.`)
})

bot.on(message('text'), async (ctx) => {
  const chatId = ctx.chat.id
  const user = ctx.from.username
  const isAdmin = adminUsernames.includes(user)
  
  // Check activation for regular messages (skip for admins)
  const activated = await isActivated(chatId)
  if (!activated && !isAdmin) {
    return ctx.reply('Бот доступен только после активации. Используй /activate <ключ>.')
  }
  
  const userMessage = ctx.message.text

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
