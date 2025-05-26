import OpenAI from 'openai'
import document from './document.js'

const client = function () {
  let instance

  if (!instance) {
    instance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  return instance
}
const model = 'gpt-4.1'
const instructions = `
  Ты - опытный агент-юрист, специализирующийся на вопросах бракоразводного процесса.

  Твоя задача - генерировать документы для подачи в суд или другие уполномоченные органы опираясь на конституцию и законы Республики Казахстан, а также на предоставленную пользователем информацию. Не придумывай ничего нового, а используй только те данные, которые предоставляет пользователь. Если пользователь не предоставляет достаточной информации, задавай уточняющие вопросы.

  Отвечай в простом и понятном стиле, избегая сложной юридической терминологии. Твоя цель - помочь пользователю решить свою проблему.

  Не отвечай на вопросы, которые не связаны с твоими задачами, такими как юридические консультации или советы по другим вопросам.

  # Порядок действий
  1. Пользователь описывает ситуацию, связанную с разводом или отправляеть документы связанные с процессом.
  2. Ты короко описываешь что нужно сделать. Если это необходимо, ты задаешь уточняющие вопросы.
  3. На основе полученной информации ты генерируешь документы, которые пользователь может использовать в суде.

  Формат ответа: Markdown, используй только форматирование текста (жирный, курсив) и списки.
  `
const tools = [
  {
    type: 'function',
    name: 'generate_document',
    description:
      'Генерирует официальный судебный документ (по законам РК) и возвращает путь к .docx файлу. Используй только если пользователь просит сформировать документ.',
    parameters: {
      type: 'object',
      properties: {
        header: {
          type: 'string',
          description:
            'Титульная часть документа (адресат, от кого, ИИН и т.д.)',
        },
        title: {
          type: 'string',
          description:
            "Заголовок документа (например, 'ОТЗЫВ', 'ИСКОВОЕ ЗАЯВЛЕНИЕ')",
        },
        content: {
          type: 'string',
          description: 'Основное содержимое документа',
        },
        signatory: {
          type: 'string',
          description: 'ФИО и подпись, дата, ЭЦП (если нужно)',
        },
      },
      required: ['header', 'title', 'content', 'signatory'],
      additionalProperties: false,
    },
    strict: true,
  },
]

const gpt = {
  async generate(input) {
    const response = await client().responses.create({
      model,
      instructions,
      input,
      tools,
    })

    // Проверка на function call
    for (const item of response.output) {
      if (item.type === 'function_call' && item.name === 'generate_document') {
        const args = JSON.parse(item.arguments)

        const filePath = await document.generate(
          args.header,
          args.title,
          args.content,
          args.signatory
        )

        if (filePath) {
          return { text: 'Документ сгенерирован:', filePath }
        }
      }
    }

    return { text: response.output_text }
  },
}

export default gpt
