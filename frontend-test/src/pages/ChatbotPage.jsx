import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createChatbotRoom,
  deleteChatbotRoom,
  deleteChatbotMessage,
  getChatbotMessages,
  getChatbotRooms,
  sendChatbotMessage,
  suggestMedicines,
  updateChatbotRoom,
} from '../api'

const introExampleQuestions = [
  '약 복용법 확인',
  '약 부작용 확인',
  '내가 복약중인 약 확인',
  '같이 먹어도 되는지 확인',
  '임산부 주의사항 확인',
]

const profileContextSections = [
  {
    title: '내 건강상태',
    items: ['수유 중', '고령자'],
  },
  {
    title: '기저질환',
    items: ['고혈압', '위장질환'],
  },
  {
    title: '못 먹는 약/성분',
    items: ['아스피린', '페니실린'],
  },
]

const CONSULT_PREFILL_STORAGE_KEY = 'chatConsultPrefillMessage'
const FALLBACK_DISPLAY_MESSAGE = '현재 제공된 약 문서만으로는 답변하기 어렵습니다. 약사 상담으로 이어서 확인해 주세요.'
const INCONCLUSIVE_ANSWER_MARKERS = [
  '확인할 수 없',
  '확인이 어렵',
  '답변이 어렵',
  '확답을 드릴 수 없',
  '확답을 드리기 어렵',
  '문서에 포함되어 있지 않',
  '포함되어 있지 않',
  '직접 관련된 내용을 찾기 어렵',
  '근거를 찾기 어렵',
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

function formatRoomTime(value) {
  if (!value) return '방금'

  try {
    return new Date(value).toLocaleString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '방금'
  }
}

function formatMessageTime(value) {
  if (!value) return '방금'

  try {
    return new Date(value).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '방금'
  }
}

function mapRoom(room) {
  return {
    id: room.roomId,
    title: room.title || '새 대화',
    updatedAt: formatRoomTime(room.updatedAt ?? room.createdAt),
  }
}

function mapMessage(message) {
  return {
    id: message.messageId ?? `${message.roomId}-${message.createdAt}-${message.senderType}`,
    sender: message.senderType === 'USER' ? 'USER' : 'AI',
    time: formatMessageTime(message.createdAt),
    content: message.content || message.answer || '',
  }
}

function splitChatContent(content) {
  if (!content) return { body: '', source: '' }

  const sourceMatch = content.match(/(?:\n+|\s+)출처:\s*(.+)$/s)
  if (!sourceMatch) {
    return { body: content.trimEnd(), source: '' }
  }

  const body = content.slice(0, sourceMatch.index).trimEnd()
  const source = sourceMatch[1].trim()
  return { body, source }
}

function isInconclusiveAnswer(content) {
  if (!content) return false
  return INCONCLUSIVE_ANSWER_MARKERS.some((marker) => content.includes(marker))
}

function findPreviousUserQuestion(messages, currentIndex) {
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    if (messages[index]?.sender === 'USER' && messages[index]?.content) {
      return messages[index].content.trim()
    }
  }
  return ''
}

function ChatbotPage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [confirmedMentions, setConfirmedMentions] = useState([])
  const [rooms, setRooms] = useState([])
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [openMenuRoomId, setOpenMenuRoomId] = useState(null)
  const [openMessageMenuId, setOpenMessageMenuId] = useState(null)

  const debounceTimeoutRef = useRef(null)
  const latestRequestIdRef = useRef(0)
  const latestKeywordRef = useRef('')
  const tempMessageIdRef = useRef(1)

  const pageDescription = useMemo(
    () => 'AI 의약품 정보 도우미으로 복약 정보를 먼저 확인하고, 필요한 경우 상담으로 이어갈 수 있습니다.',
    [],
  )

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const fetchRooms = async () => {
      setLoadingRooms(true)
      try {
        const data = await getChatbotRooms()
        const mappedRooms = (data || []).map(mapRoom)
        setRooms(mappedRooms)
        setSelectedRoomId((prev) => prev ?? mappedRooms[0]?.id ?? null)
      } catch (error) {
        console.error('챗봇 대화방 목록 조회 실패:', error)
      } finally {
        setLoadingRooms(false)
      }
    }

    fetchRooms()
  }, [])

  useEffect(() => {
    if (!selectedRoomId) {
      setMessages([])
      return
    }

    const fetchMessages = async () => {
      setLoadingMessages(true)
      try {
        const data = await getChatbotMessages(selectedRoomId)
        setMessages((data || []).map(mapMessage))
      } catch (error) {
        console.error('챗봇 메시지 조회 실패:', error)
        setMessages([])
      } finally {
        setLoadingMessages(false)
      }
    }

    fetchMessages()
  }, [selectedRoomId])

  const clearSuggestions = () => {
    setSuggestions([])
    setShowSuggestions(false)
  }

  const closeRoomMenu = () => {
    setOpenMenuRoomId(null)
  }

  const closeMessageMenu = () => {
    setOpenMessageMenuId(null)
  }

  const handleMoveToConsultation = (question) => {
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) return
    sessionStorage.setItem(CONSULT_PREFILL_STORAGE_KEY, trimmedQuestion)
    navigate('/app/chat', {
      state: {
        prefillMessage: trimmedQuestion,
      },
    })
  }

  const createNewRoom = async () => {
    try {
      const room = await createChatbotRoom()
      const mappedRoom = mapRoom(room)
      setRooms((prev) => [mappedRoom, ...prev])
      setSelectedRoomId(mappedRoom.id)
      setMessages([])
      setMessage('')
      setConfirmedMentions([])
      closeRoomMenu()
      closeMessageMenu()
      clearSuggestions()
    } catch (error) {
      console.error('챗봇 대화방 생성 실패:', error)
      alert('대화방 생성에 실패했습니다.')
    }
  }

  const handleToggleRoomMenu = (event, roomId) => {
    event.stopPropagation()
    setOpenMenuRoomId((prev) => (prev === roomId ? null : roomId))
  }

  const handleRenameRoom = async (event, room) => {
    event.stopPropagation()
    const nextTitle = window.prompt('대화방 이름을 입력하세요.', room.title)
    if (nextTitle == null) return

    const trimmedTitle = nextTitle.trim()
    if (!trimmedTitle) {
      alert('대화방 이름은 비워둘 수 없습니다.')
      return
    }

    try {
      const updatedRoom = await updateChatbotRoom(room.id, { title: trimmedTitle })
      setRooms((prev) =>
        prev.map((item) =>
          item.id === room.id
            ? {
                ...item,
                title: updatedRoom.title || trimmedTitle,
                updatedAt: formatRoomTime(updatedRoom.updatedAt ?? updatedRoom.createdAt),
              }
            : item,
        ),
      )
      closeRoomMenu()
    } catch (error) {
      console.error('챗봇 대화방 이름 수정 실패:', error)
      alert('대화방 이름 수정에 실패했습니다.')
    }
  }

  const handleDeleteRoom = async (event, room) => {
    event.stopPropagation()
    if (!window.confirm(`"${room.title}" 대화방을 삭제할까요?`)) return

    try {
      await deleteChatbotRoom(room.id)
      const nextRooms = rooms.filter((item) => item.id !== room.id)
      setRooms(nextRooms)
      if (selectedRoomId === room.id) {
        setSelectedRoomId(nextRooms[0]?.id ?? null)
        if (nextRooms.length === 0) {
          setMessages([])
        }
      }
      closeRoomMenu()
    } catch (error) {
      console.error('챗봇 대화방 삭제 실패:', error)
      alert('대화방 삭제에 실패했습니다.')
    }
  }

  const handleToggleMessageMenu = (event, messageId) => {
    event.stopPropagation()
    setOpenMessageMenuId((prev) => (prev === messageId ? null : messageId))
  }

  const handleDeleteMessage = async (event, chat) => {
    event.stopPropagation()
    if (chat.id == null) return
    if (!window.confirm('이 메시지를 삭제할까요?')) return

    try {
      await deleteChatbotMessage(chat.id)
      setMessages((prev) => prev.filter((item) => item.id !== chat.id))
      closeMessageMenu()
    } catch (error) {
      console.error('챗봇 메시지 삭제 실패:', error)
      alert('메시지 삭제에 실패했습니다.')
    }
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

  const handleExampleQuestionClick = (question) => {
    setMessage(question)
    clearSuggestions()
  }

  const handleMessageKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage) return

    const composedMessage = trimmedMessage

    let roomId = selectedRoomId
    if (!roomId) {
      try {
        const room = await createChatbotRoom()
        const mappedRoom = mapRoom(room)
        setRooms((prev) => [mappedRoom, ...prev])
        setSelectedRoomId(mappedRoom.id)
        roomId = mappedRoom.id
      } catch (error) {
        alert('대화방 생성에 실패했습니다.')
        return
      }
    }

    const optimisticMessage = {
      id: `temp-${tempMessageIdRef.current++}`,
      sender: 'USER',
      time: '방금',
      content: composedMessage,
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setMessage('')
    clearSuggestions()
    setLoading(true)

    try {
      const data = await sendChatbotMessage(roomId, composedMessage)
      const refreshedMessages = await getChatbotMessages(roomId)
      setMessages((refreshedMessages || []).map(mapMessage))
      setRooms((prev) =>
        prev.map((room) =>
          room.id === roomId
            ? {
                ...room,
                title:
                  room.title === '새 대화' || !room.title
                    ? trimmedMessage.slice(0, 14) || '새 대화'
                    : room.title,
                updatedAt: formatMessageTime(data.createdAt) || '방금',
              }
            : room,
        ),
      )
    } catch (error) {
      console.error('챗봇 메시지 전송 실패:', error)
      setMessages((prev) => [
        ...prev.filter((item) => item.id !== optimisticMessage.id),
        {
          id: `temp-${tempMessageIdRef.current++}`,
          sender: 'AI',
          time: '방금',
          content: '오류가 발생했습니다.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-page chatbot-page">
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
            {loadingRooms ? (
              <div className="app-placeholder-card">불러오는 중...</div>
            ) : rooms.length === 0 ? (
              <div className="app-placeholder-card">등록된 대화방이 없습니다.</div>
            ) : (
              rooms.map((room) => (
                <div
                  key={room.id}
                  className={room.id === selectedRoomId ? 'chatbot-room-item active' : 'chatbot-room-item'}
                  onClick={() => {
                    closeRoomMenu()
                    setSelectedRoomId(room.id)
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      closeRoomMenu()
                      setSelectedRoomId(room.id)
                    }
                  }}
                >
                  <div className="chatbot-room-item-copy">
                    <strong>{room.title}</strong>
                    <span>{room.updatedAt}</span>
                  </div>

                  <div className="chatbot-room-menu-shell">
                    <button
                      type="button"
                      className="chatbot-room-menu-trigger"
                      aria-label={`${room.title} 메뉴`}
                      onClick={(event) => handleToggleRoomMenu(event, room.id)}
                    >
                      <span />
                      <span />
                      <span />
                    </button>

                    {openMenuRoomId === room.id && (
                      <div className="chatbot-room-menu-popover">
                        <button type="button" onClick={(event) => handleRenameRoom(event, room)}>
                          이름 바꾸기
                        </button>
                        <button type="button" className="danger" onClick={(event) => handleDeleteRoom(event, room)}>
                          대화방 삭제
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        <section className="chat-layout-card">
          <div className="chat-tab-row">
            <button type="button" className="chat-tab-button active">
              AI 의약품 정보 도우미
            </button>
          </div>

          <div className="chat-body-layout">
            <div className="chat-main-panel">
              <div className="chat-scroll-panel">
                <div className="chat-intro-block">
                  <div className="chat-bubble-row">
                    <div className="chat-message-stack">
                      <div className="chat-message-label-row">
                        <div className="chat-message-label">AI 의약품 정보 도우미</div>
                      </div>
                      <div className="chat-bubble">
                        <p>안녕하세요. 복용 중인 약에 대한 질문, 복약 정보 확인, 약 성분 확인을 도와드릴 수 있어요.</p>
                      </div>
                      <div className="chat-intro-actions">
                        {introExampleQuestions.map((question) => (
                          <span key={question} className="chat-intro-chip">
                            {question}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {!selectedRoomId ? (
                  <div className="chat-empty-hint">왼쪽에서 새 대화를 만들어 시작하세요.</div>
                ) : loadingMessages ? (
                  <div className="chat-empty-hint">대화 내용을 불러오는 중입니다.</div>
                ) : messages.length === 0 ? (
                  null
                ) : (
                  messages.map((chat, index) => (
                    <div key={chat.id} className={chat.sender === 'USER' ? 'chat-bubble-row mine' : 'chat-bubble-row'}>
                      <div className={chat.sender === 'USER' ? 'chat-message-stack mine' : 'chat-message-stack'}>
                        <div className={chat.sender === 'USER' ? 'chat-message-label-row mine' : 'chat-message-label-row'}>
                          <div className="chat-message-label">{chat.sender === 'USER' ? '나' : 'AI 의약품 정보 도우미'}</div>
                          <span className="chat-message-time">{chat.time}</span>
                          {chat.id != null && (
                            <div className="chat-message-menu-shell">
                              <button
                                type="button"
                                className="chat-message-menu-trigger"
                                aria-label="메시지 메뉴"
                                onClick={(event) => handleToggleMessageMenu(event, chat.id)}
                              >
                                <span />
                                <span />
                                <span />
                              </button>

                              {openMessageMenuId === chat.id && (
                                <div className="chat-message-menu-popover">
                                  <button type="button" className="danger" onClick={(event) => handleDeleteMessage(event, chat)}>
                                    메시지 삭제
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className={chat.sender === 'USER' ? 'chat-bubble mine' : 'chat-bubble'}>
                          {(() => {
                            const { body, source } = splitChatContent(chat.content)
                            const previousUserQuestion = chat.sender === 'AI' ? findPreviousUserQuestion(messages, index) : ''
                            const showConsultAction = chat.sender === 'AI' && isInconclusiveAnswer(body) && Boolean(previousUserQuestion)
                            const displayBody = showConsultAction ? FALLBACK_DISPLAY_MESSAGE : body
                            return (
                              <div className="chat-bubble-body">
                                <p>{displayBody}</p>
                                {source && <div className="chat-bubble-source">출처: {source}</div>}
                                {showConsultAction && (
                                  <button
                                    type="button"
                                    className="chat-consult-link-button"
                                    onClick={() => handleMoveToConsultation(previousUserQuestion)}
                                  >
                                    약사 상담으로 이어가기
                                  </button>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
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
                    onKeyDown={handleMessageKeyDown}
                    placeholder="@로 약을 검색하고 궁금한 점을 입력하세요."
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

            <aside className="chat-profile-sidebar" aria-label="개인 상태 정보">
              <div className="chat-profile-card">
                <div className="chat-profile-header">
                  <h2>질문에 반영할 내 상태</h2>
                  <p>개인 상태와 기저질환, 주의 약 성분을 함께 보고 약 정보를 확인할 수 있어요.</p>
                </div>

                <div className="chat-profile-section-list">
                  {profileContextSections.map((section) => (
                    <section key={section.title} className="chat-profile-section">
                      <h3>{section.title}</h3>
                      <div className="chat-profile-tags">
                        {section.items.map((item) => (
                          <span key={item} className="chat-profile-tag">
                            {item}
                          </span>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </aside>

          </div>
        </section>
      </section>
    </div>
  )
}

export default ChatbotPage
