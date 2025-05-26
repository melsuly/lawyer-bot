const chatHistory = new Map()

const history = {
  get(chatId) {
    return chatHistory.get(chatId) || []
  },
  addMessage(chatId, role, content) {
    if (!chatHistory.has(chatId)) chatHistory.set(chatId, [])
    const history = chatHistory.get(chatId)
    history.push({ role, content })
    if (history.length > 10) history.shift()
    chatHistory.set(chatId, history)
  },
  addDocumentGeneration(chatId, documentPath) {
    if (!chatHistory.has(chatId)) chatHistory.set(chatId, [])
    const history = chatHistory.get(chatId)
    const documentInfo = `[Документ сгенерирован: ${documentPath}]`

    // Добавляем информацию о документе к последнему сообщению помощника
    if (history.length > 0 && history[history.length - 1].role === 'assistant') {
      history[history.length - 1].content += ` ${documentInfo}`
    } else {
      history.push({ role: 'system', content: documentInfo })
    }

    chatHistory.set(chatId, history)
  },
}

export default history
