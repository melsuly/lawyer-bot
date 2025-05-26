import dotenv from 'dotenv'
import gpt from './gpt.js'
import { Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import history from './history.js'

dotenv.config()

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

bot.start(async (ctx) => {
  const response = await gpt.generate(
    'Пользователь запустил бота. Сгенерируй короткое приветственное сообщение'
  )

  await ctx.reply(response.text, {
    parse_mode: 'Markdown',
  })
})

bot.on(message('text'), async (ctx) => {
  const chatId = ctx.chat.id
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
