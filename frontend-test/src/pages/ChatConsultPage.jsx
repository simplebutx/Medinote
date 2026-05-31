import { useMemo, useRef, useState } from 'react'
import { sendChatbotMessage, suggestMedicines } from '../api'

const quickQuestions = [
  '타이레놀 식후에 먹어야 해?',
  '아스피린이랑 같이 먹어도 돼?',
  '오늘 저녁 약 먹었는지 확인해줘',
  '속이 불편한데 계속 먹어도 돼?',
]

const referenceItems = [
  '현재 복용약: 타이레놀정 500mg',
  '주의 성분: 아스피린, NSAIDs',
  '건강 정보: 흡연, 위염',
]

function renderHighlightedText(message, confirmedMentions) {
  if (!message) return null

  const parts = []
  const sortedMentions = [...confirmedMentions].sort((a, b) => b.length - a.length)
  let index = 0

  while (index < message.length) {
    const matchedName =
      message[index] === '@'
        ? sortedMentions.find((name) => message.startsWith(`@${name}`, index))
        : null

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

function createTimestampLabel() {
  return new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ChatConsultPage() {
  const [activeTab, setActiveTab] = useState('ai')
  const [message, setMessage] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [confirmedMentions, setConfirmedMentions] = useState([])
  const [aiMessages, setAiMessages] = useState([
    {
      id: 1,
      sender: 'AI',
      time: '09:00',
      content:
        '안녕하세요. 복약 관련 궁금한 점을 물어보세요. 약 이름을 @로 검색해서 함께 보낼 수 있어요.',
    },
  ])
  const [pharmacistMessages, setPharmacistMessages] = useState([
    {
      id: 1,
      sender: 'PHARMACIST',
      time: '09:05',
      content:
        '약사 상담에서는 복용 중인 약, 현재 증상, 걱정되는 점을 함께 알려주시면 더 정확하게 안내할 수 있어요.',
    },
  ])
  const [loading, setLoading] = useState(false)

  const debounceTimeoutRef = useRef(null)
  const latestRequestIdRef = useRef(0)
  const latestKeywordRef = useRef('')
  const nextMessageIdRef = useRef(10)

  const activeMessages = activeTab === 'ai' ? aiMessages : pharmacistMessages

  const conversationIntro = useMemo(() => {
    if (activeTab === 'ai') {
      return 'AI 챗봇으로 복약 정보를 먼저 확인하고, 필요하면 약사 상담으로 이어갈 수 있습니다.'
    }

    return '약사 상담 탭에서는 현재는 테스트 대화 흐름만 연결되어 있습니다.'
  }, [activeTab])

  const clearSuggestions = () => {
    setSuggestions([])
    setShowSuggestions(false)
  }

  const handleMessageChange = (event) => {
    const value = event.target.value
    setMessage(value)

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

        if (latestKeywordRef.current !== keyword || latestRequestIdRef.current !== requestId) {
          return
        }

        setSuggestions(items)
        setShowSuggestions(items.length > 0)
      } catch (error) {
        if (latestRequestIdRef.current === requestId) {
          clearSuggestions()
        }
      }
    }, 220)
  }

  const handleSuggestionClick = (selectedName) => {
    setMessage((prev) => prev.replace(/@([^\s@]*)$/, `@${selectedName} `))
    setConfirmedMentions((prev) => (prev.includes(selectedName) ? prev : [...prev, selectedName]))
    clearSuggestions()
    latestKeywordRef.current = ''
  }

  const pushMessage = (target, newMessage) => {
    if (target === 'ai') {
      setAiMessages((prev) => [...prev, newMessage])
      return
    }

    setPharmacistMessages((prev) => [...prev, newMessage])
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedMessage = message.trim()
    if (!trimmedMessage) {
      return
    }

    const userMessage = {
      id: nextMessageIdRef.current++,
      sender: 'USER',
      time: '방금',
      content: trimmedMessage,
    }

    pushMessage(activeTab, userMessage)
    setMessage('')
    clearSuggestions()

    if (activeTab === 'ai') {
      setLoading(true)

      try {
        const data = await sendChatbotMessage(trimmedMessage)
        pushMessage('ai', {
          id: nextMessageIdRef.current++,
          sender: 'AI',
          time: createTimestampLabel(),
          content: data.answer || '현재는 답변을 불러오지 못했습니다.',
        })
      } catch (error) {
        pushMessage('ai', {
          id: nextMessageIdRef.current++,
          sender: 'AI',
          time: createTimestampLabel(),
          content: error.response?.data?.message || 'AI 답변을 불러오지 못했습니다.',
        })
      } finally {
        setLoading(false)
      }

      return
    }

    window.setTimeout(() => {
      pushMessage('pharmacist', {
        id: nextMessageIdRef.current++,
        sender: 'PHARMACIST',
        time: createTimestampLabel(),
        content:
          '상담 내용을 확인했습니다. 현재 복용 중인 약과 증상 시작 시점, 함께 먹는 약이 있는지 알려주시면 더 구체적으로 안내드릴게요.',
      })
    }, 400)
  }

  const handleQuickQuestion = (question) => {
    setMessage(question)
  }

  return (
    <div className="app-page">
      <div className="app-page-header">
        <p className="app-page-eyebrow">Chat & Consult</p>
        <h1 className="app-page-title">챗봇 & 약사 상담</h1>
        <p className="app-page-description">{conversationIntro}</p>
      </div>

      <section className="chat-layout-card">
        <div className="chat-tab-row">
          <button
            type="button"
            className={activeTab === 'ai' ? 'chat-tab-button active' : 'chat-tab-button'}
            onClick={() => setActiveTab('ai')}
          >
            AI 챗봇
          </button>
          <button
            type="button"
            className={activeTab === 'pharmacist' ? 'chat-tab-button active' : 'chat-tab-button'}
            onClick={() => setActiveTab('pharmacist')}
          >
            약사 상담
          </button>
        </div>

        <div className="chat-body-layout">
          <div className="chat-main-panel">
            <div className="chat-scroll-panel">
              {activeMessages.map((chat) => (
                <div
                  key={chat.id}
                  className={chat.sender === 'USER' ? 'chat-bubble-row mine' : 'chat-bubble-row'}
                >
                  <div className={chat.sender === 'USER' ? 'chat-bubble mine' : 'chat-bubble'}>
                    <div className="chat-bubble-meta">
                      <strong>{chat.sender === 'USER' ? '나' : chat.sender === 'AI' ? 'AI' : '약사'}</strong>
                      <span>{chat.time}</span>
                    </div>
                    <p>{chat.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <form className="chat-input-area" onSubmit={handleSubmit}>
              <div className="message-input-shell chat-message-shell">
                <div className="message-input-highlight" aria-hidden="true">
                  {renderHighlightedText(message, confirmedMentions)}
                </div>

                <textarea
                  className="message-input"
                  value={message}
                  onChange={handleMessageChange}
                  placeholder="@로 약을 검색하거나 질문을 입력하세요."
                  rows={2}
                />
              </div>

              <button type="submit" className="chat-send-button" disabled={loading}>
                {loading ? '전송 중' : '전송'}
              </button>
            </form>

            {showSuggestions && (
              <ul className="suggestion-list chat-suggestion-list">
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
          </div>

          <aside className="chat-sidebar">
            <section className="chat-side-card">
              <h2>빠른 질문</h2>
              <div className="chat-quick-list">
                {quickQuestions.map((question) => (
                  <button key={question} type="button" onClick={() => handleQuickQuestion(question)}>
                    {question}
                  </button>
                ))}
              </div>
            </section>

            <section className="chat-side-card warning">
              <h2>약사 상담 연결</h2>
              <p>
                복용 중단, 용량 변경, 심한 부작용 의심 등은 AI 답변만으로 판단하지 않고
                약사 상담을 권장합니다.
              </p>
              <button type="button" onClick={() => setActiveTab('pharmacist')}>
                약사 상담으로 이동
              </button>
            </section>

            <section className="chat-side-card">
              <h2>상담 참고 정보</h2>
              <div className="chat-reference-list">
                {referenceItems.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  )
}

export default ChatConsultPage
