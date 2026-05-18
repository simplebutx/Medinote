import { useState } from 'react'
import { sendChatbotMessage } from './api'
import './App.css'

function App() {
  const [message, setMessage] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!message.trim()) {
      setAnswer('질문을 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      const data = await sendChatbotMessage(message)
      setAnswer(data.answer ?? '응답이 비어 있습니다.')
    } catch (error) {
      setAnswer(error.response?.data?.message || error.message || '요청에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Chatbot Test</h1>
      <form onSubmit={handleSubmit}>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="질문을 입력하세요"
          rows={4}
        />
        <button type="submit" disabled={loading}>
          {loading ? '전송 중...' : '전송'}
        </button>
      </form>

      <div>
        <h2>답변</h2>
        <p className="answer-text">{answer}</p>
      </div>
    </div>
  )
}

export default App
