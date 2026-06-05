import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { createChatbotRoom, sendChatbotMessage, suggestMedicines } from '../api'

function renderHighlightedMessage(message, confirmedMentions) {
  if (!message) {
    return null
  }

  const parts = []
  const sortedMentions = [...confirmedMentions].sort((a, b) => b.length - a.length)
  let index = 0

  while (index < message.length) {
    let matchedName = null

    if (message[index] === '@') {
      matchedName = sortedMentions.find((name) => message.startsWith(`@${name}`, index))
    }

    if (matchedName) {
      parts.push(
        <span className="mention-token" key={`${matchedName}-${index}`}>
          @{matchedName}
        </span>,
      )
      index += matchedName.length + 1
      continue
    }

    parts.push(message[index])
    index += 1
  }

  return parts
}

function Chatbot() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [confirmedMentions, setConfirmedMentions] = useState([])

  const debounceTimeoutRef = useRef(null)
  const latestRequestIdRef = useRef(0)
  const latestKeywordRef = useRef('')
  const roomIdRef = useRef(null)

  const clearSuggestions = () => {
    setSuggestions([])
    setShowSuggestions(false)
  }

  const updateMentionSuggestions = (value) => {
    const mentionMatch = value.match(/@([^\s@]*)$/)

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    if (!mentionMatch) {
      latestKeywordRef.current = ''
      clearSuggestions()
      return
    }

    const keyword = mentionMatch[1].trim()

    if (!keyword) {
      latestKeywordRef.current = ''
      clearSuggestions()
      return
    }

    latestKeywordRef.current = keyword
    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const items = await suggestMedicines(keyword)

        const messageStillMatches = latestKeywordRef.current === keyword
        const isLatestRequest = latestRequestIdRef.current === requestId

        if (!messageStillMatches || !isLatestRequest) {
          return
        }

        setSuggestions(items)
        setShowSuggestions(items.length > 0)
      } catch {
        if (latestRequestIdRef.current === requestId) {
          clearSuggestions()
        }
      }
    }, 250)
  }

  const handleMessageChange = (event) => {
    const value = event.target.value
    setMessage(value)
    updateMentionSuggestions(value)
  }

  const handleSuggestionClick = (selectedName) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    latestKeywordRef.current = ''
    latestRequestIdRef.current += 1

    setMessage((prev) => prev.replace(/@([^\s@]*)$/, `@${selectedName} `))
    setConfirmedMentions((prev) => (prev.includes(selectedName) ? prev : [...prev, selectedName]))
    clearSuggestions()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!message.trim()) {
      setAnswer('질문을 입력해 주세요.')
      return
    }

    setLoading(true)

    try {
      if (!roomIdRef.current) {
        const room = await createChatbotRoom(message.trim().slice(0, 14))
        roomIdRef.current = room?.roomId ?? null
      }

      const data = await sendChatbotMessage(roomIdRef.current, message)
      setAnswer(data.answer ?? '응답이 비어 있습니다.')
      clearSuggestions()
    } catch (error) {
      setAnswer(error.response?.data?.message || error.message || '요청에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-page">
      <div className="app-page-header">
        <p className="app-page-eyebrow">Chat & Consult</p>
        <h1 className="app-page-title">챗봇 & 상담</h1>
        <p className="app-page-description">
          AI 챗봇 서비스와 전문 약사 1:1 상담 서비스를 한 곳에서 이용하실 수 있습니다.
        </p>
      </div>

      <div className="app-two-column">
        <section className="app-card">
          <div className="app-card-header">
            <h2>AI 챗봇</h2>
            <p>@로 약 이름을 입력하면 자동완성 목록이 열립니다.</p>
          </div>

          <form onSubmit={handleSubmit} className="app-chat-form">
            <div className="message-input-shell">
              <div className="message-input-highlight" aria-hidden="true">
                {renderHighlightedMessage(message, confirmedMentions)}
              </div>

              <textarea
                className="message-input"
                value={message}
                onChange={handleMessageChange}
                placeholder="질문을 입력하세요."
                rows={4}
              />
            </div>

            {showSuggestions && (
              <ul className="suggestion-list">
                {suggestions.map((suggestion) => (
                  <li key={suggestion}>
                    <button
                      className="suggestion-item"
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button className="app-primary-button" type="submit" disabled={loading}>
              {loading ? '전송 중..' : '전송'}
            </button>
          </form>
        </section>

        <aside className="app-side-stack">
          <section className="app-card">
            <div className="app-card-header">
              <h2>응답</h2>
              <p>응답은 마크다운 형식 그대로 보여줍니다.</p>
            </div>

            <div className="answer-text app-answer-panel">
              <ReactMarkdown>{answer || '아직 응답이 없습니다.'}</ReactMarkdown>
            </div>
          </section>

          <section className="app-card app-muted-card">
            <div className="app-card-header">
              <h2 style={{ color: '#10b981' }}>약사 상담</h2>
              <p>AI 응답으로 부족하다면 전문 약사에게 1:1 상담을 요청해보세요.</p>
            </div>
            <button
              className="app-primary-button"
              style={{ marginTop: '15px', backgroundColor: '#10b981', border: 'none' }}
              onClick={() => navigate('/consultation')}
            >
              약사에게 1:1 상담 요청하기
            </button>
          </section>

          <section className="app-card app-muted-card">
            <div className="app-card-header">
              <h2>현재 범위</h2>
              <p>약사/관리자 전용 기능을 제외하고, 현재 구현된 사용자 챗봇 화면만 정리했습니다.</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default Chatbot
