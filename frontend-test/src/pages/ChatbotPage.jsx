import { useEffect, useMemo, useRef, useState } from 'react'
import { sendChatbotMessage, suggestMedicines } from '../api'

const quickQuestions = [
  '타이레놀 식후에 먹어야 해?',
  '아스피린이랑 같이 먹어도 돼?',
  '오늘 저녁 약 먹었는지 확인해줘',
  '속이 불편한데 계속 먹어도 돼?',
]

const initialMessage = {
  id: 1,
  sender: 'AI',
  time: '09:00',
  content: '안녕하세요. 복약 관련 궁금한 점을 물어보세요. 약 이름을 @로 검색해서 함께 볼 수 있어요.',
}

function createRoom(id) {
  return {
    id,
    title: id === 1 ? '새 대화' : `대화 ${id}`,
    updatedAt: '방금',
    messages: [{ ...initialMessage }],
  }
}

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

function ChatbotPage() {
  const [message, setMessage] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [confirmedMentions, setConfirmedMentions] = useState([])
  const [rooms, setRooms] = useState([createRoom(1)])
  const [selectedRoomId, setSelectedRoomId] = useState(1)
  const [loading, setLoading] = useState(false)

  const debounceTimeoutRef = useRef(null)
  const latestRequestIdRef = useRef(0)
  const latestKeywordRef = useRef('')
  const nextMessageIdRef = useRef(10)
  const nextRoomIdRef = useRef(2)

  const pageDescription = useMemo(
    () => 'AI 챗봇으로 복약 정보를 먼저 확인하고, 필요한 경우 상담으로 이어갈 수 있습니다.',
    [],
  )

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? rooms[0],
    [rooms, selectedRoomId],
  )

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const clearSuggestions = () => {
    setSuggestions([])
    setShowSuggestions(false)
  }

  const createNewRoom = () => {
    const roomId = nextRoomIdRef.current++
    const room = createRoom(roomId)
    setRooms((prev) => [room, ...prev])
    setSelectedRoomId(roomId)
    setMessage('')
    setConfirmedMentions([])
    clearSuggestions()
  }

  const updateRoom = (roomId, updater) => {
    setRooms((prev) =>
      prev.map((room) => (room.id === roomId ? { ...room, ...updater(room) } : room)),
    )
  }

  const handleMessageChange = (event) => {
    const value = event.target.value
    setMessage(value)

    const mentionMatch = value.match(/@([^\s@]*)$/)
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
    if (!mentionMatch) {
      clearSuggestions()
      return
    }

    const keyword = mentionMatch[1].trim()
    if (!keyword) {
      clearSuggestions()
      return
    }

    latestKeywordRef.current = keyword
    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const items = await suggestMedicines(keyword)
        if (latestKeywordRef.current !== keyword || latestRequestIdRef.current !== requestId) return
        setSuggestions(items)
        setShowSuggestions(items.length > 0)
      } catch (error) {
        if (latestRequestIdRef.current === requestId) clearSuggestions()
      }
    }, 220)
  }

  const handleSuggestionClick = (selectedName) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
    latestKeywordRef.current = ''
    latestRequestIdRef.current += 1
    setMessage((prev) => prev.replace(/@([^\s@]*)$/, `@${selectedName} `))
    setConfirmedMentions((prev) => (prev.includes(selectedName) ? prev : [...prev, selectedName]))
    clearSuggestions()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage || !selectedRoom) return

    const roomId = selectedRoom.id
    const userMsg = {
      id: nextMessageIdRef.current++,
      sender: 'USER',
      time: '방금',
      content: trimmedMessage,
    }

    updateRoom(roomId, (room) => ({
      messages: [...room.messages, userMsg],
      updatedAt: '방금',
      title: room.messages.length <= 1 ? trimmedMessage.slice(0, 14) || room.title : room.title,
    }))

    setMessage('')
    clearSuggestions()
    setLoading(true)

    try {
      const data = await sendChatbotMessage(trimmedMessage)
      const botMessage = {
        id: nextMessageIdRef.current++,
        sender: 'AI',
        time: createTimestampLabel(),
        content: data.answer || '답변을 가져오지 못했습니다.',
      }
      updateRoom(roomId, (room) => ({
        messages: [...room.messages, botMessage],
        updatedAt: botMessage.time,
        title: room.title,
      }))
    } catch (error) {
      const botMessage = {
        id: nextMessageIdRef.current++,
        sender: 'AI',
        time: createTimestampLabel(),
        content: '오류가 발생했습니다.',
      }
      updateRoom(roomId, (room) => ({
        messages: [...room.messages, botMessage],
        updatedAt: botMessage.time,
        title: room.title,
      }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-page">
      <div className="app-page-header">
        <p className="app-page-eyebrow">AI Chatbot</p>
        <h1 className="app-page-title">챗봇</h1>
        <p className="app-page-description">{pageDescription}</p>
      </div>

      <section className="chatbot-split-layout">
        <aside className="chatbot-room-panel">
          <div className="chatbot-room-header">
            <div>
              <h2>대화방</h2>
              <p>새 대화를 만들거나 이전 대화를 이어가세요.</p>
            </div>
            <button type="button" className="register-add-button" onClick={createNewRoom}>
              새 대화
            </button>
          </div>

          <div className="chatbot-room-list">
            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                className={room.id === selectedRoomId ? 'chatbot-room-item active' : 'chatbot-room-item'}
                onClick={() => setSelectedRoomId(room.id)}
              >
                <strong>{room.title}</strong>
                <span>{room.updatedAt}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="chat-layout-card">
          <div className="chat-tab-row">
            <button type="button" className="chat-tab-button active">
              AI 챗봇
            </button>
          </div>

          <div className="chat-body-layout">
            <div className="chat-main-panel">
              <div className="chat-scroll-panel">
                {selectedRoom?.messages.map((chat) => (
                  <div key={chat.id} className={chat.sender === 'USER' ? 'chat-bubble-row mine' : 'chat-bubble-row'}>
                    <div className={chat.sender === 'USER' ? 'chat-bubble mine' : 'chat-bubble'}>
                      <div className="chat-bubble-meta">
                        <strong>{chat.sender === 'USER' ? '나' : 'AI'}</strong>
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
                {showSuggestions && (
                  <ul className="suggestion-list chat-suggestion-list">
                    {suggestions.map((suggestion) => (
                      <li key={suggestion}>
                        <button className="suggestion-item" type="button" onClick={() => handleSuggestionClick(suggestion)}>
                          {suggestion}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="submit" className="chat-send-button" disabled={loading}>
                  {loading ? '전송 중' : '전송'}
                </button>
              </form>
            </div>

            <aside className="chat-sidebar">
              <section className="chat-side-card">
                <h2>빠른 질문</h2>
                <div className="chat-quick-list">
                  {quickQuestions.map((question) => (
                    <button key={question} type="button" onClick={() => setMessage(question)}>
                      {question}
                    </button>
                  ))}
                </div>
              </section>
              <section className="chat-side-card warning">
                <h2>상담 안내</h2>
                <p>챗봇으로 해결이 어렵다면 상담 메뉴에서 약사 상담을 요청할 수 있습니다.</p>
              </section>
            </aside>
          </div>
        </section>
      </section>
    </div>
  )
}

export default ChatbotPage
