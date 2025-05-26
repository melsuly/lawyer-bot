import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx'
import fs from 'fs'
import path from 'path'

const document = {
  /**
   * Генерирует официальный документ по ГОСТ РК (docx)
   * @param {string} header - Титульная часть
   * @param {string} title - Заголовок
   * @param {string} content - Основная часть документа
   * @param {string} signatory - Подпись
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
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: header,
                  font: 'Times New Roman',
                  size: 28,
                }),
              ],
              spacing: { after: 300 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: title,
                  font: 'Times New Roman',
                  size: 28,
                  bold: true,
                }),
              ],
              spacing: { after: 300 },
            }),
            ...content.split('\n').map(
              (line) =>
                new Paragraph({
                  alignment: AlignmentType.JUSTIFIED,
                  children: [
                    new TextRun({
                      text: line,
                      font: 'Times New Roman',
                      size: 28,
                    }),
                  ],
                  spacing: { after: 200 },
                })
            ),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: signatory,
                  font: 'Times New Roman',
                  size: 28,
                }),
              ],
            }),
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
