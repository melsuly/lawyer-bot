import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx'
import fs from 'fs'
import path from 'path'

const document = {
  /**
   * Генерирует официальный документ по ГОСТ РК (docx)
   * @param {string|string[]} header - Титульная часть (строка или массив строк)
   * @param {string|string[]} title - Заголовок (строка или массив строк)
   * @param {string|string[]} content - Основная часть документа (строка или массив строк)
   * @param {string|string[]} signatory - Подпись (строка или массив строк)
   * @returns {Promise<string>} - Путь к файлу
   */
  async generate(header, title, content, signatory) {
    const dir = path.resolve('generated')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir)

    // Имя по timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.]/g, '')
      .slice(0, 14)
    const fileName = `document_${timestamp}.docx`
    const filePath = path.join(dir, fileName)

    // Функция для создания параграфов из строки или массива строк
    const createParagraphs = (text, alignment, isTitle = false, isContent = false) => {
      const lines = Array.isArray(text) ? text : [text]
      return lines.map((line, index) =>
        new Paragraph({
          alignment,
          children: [
            new TextRun({
              text: line,
              font: 'Times New Roman',
              size: 28,
              bold: isTitle,
            }),
          ],
          spacing: { after: isContent ? 200 : (index === lines.length - 1 ? 300 : 150) },
          indent: isContent ? { firstLine: 720 } : undefined, // Отступ первой строки для контента
        })
      )
    }

    // Документ
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1134,
                bottom: 1134,
                left: 1701,
                right: 850,
              },
            },
          },
          children: [
            // Титульная часть (header)
            ...createParagraphs(header, AlignmentType.RIGHT),
            // Заголовок (title)
            ...createParagraphs(title, AlignmentType.CENTER, true),
            // Основной контент
            ...createParagraphs(content, AlignmentType.JUSTIFIED, false, true),
            // Подпись (signatory)
            ...createParagraphs(signatory, AlignmentType.RIGHT),
          ],
        },
      ],
    })

    const buffer = await Packer.toBuffer(doc)
    fs.writeFileSync(filePath, buffer)
    return filePath
  },
}

export default document
