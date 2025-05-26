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
}

export default history
