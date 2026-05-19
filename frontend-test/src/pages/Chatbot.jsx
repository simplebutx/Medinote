import { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { sendChatbotMessage, suggestMedicines } from '../api'

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
  const [message, setMessage] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [confirmedMentions, setConfirmedMentions] = useState([])

  const debounceTimeoutRef = useRef(null)
  const latestRequestIdRef = useRef(0)
  const latestKeywordRef = useRef('')

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
      } catch (error) {
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
    setConfirmedMentions((prev) => (
      prev.includes(selectedName) ? prev : [...prev, selectedName]
    ))
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
      const data = await sendChatbotMessage(message)
      setAnswer(data.answer ?? '응답이 비어 있습니다.')
      clearSuggestions()
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
        <div className="message-input-shell">
          <div className="message-input-highlight" aria-hidden="true">
            {renderHighlightedMessage(message, confirmedMentions)}
          </div>

          <textarea
            className="message-input"
            value={message}
            onChange={handleMessageChange}
            placeholder="질문을 입력하세요"
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

        <button type="submit" disabled={loading}>
          {loading ? '전송 중...' : '전송'}
        </button>
      </form>

      <div>
        <h2>답변</h2>
        <div className="answer-text">
          <ReactMarkdown>{answer}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

export default Chatbot
