import { useMemo, useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { sendChatbotMessage, suggestMedicines, getAuthSession } from '../api'

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
  const navigate = useNavigate()
  const session = getAuthSession()
  
  const [activeTab, setActiveTab] = useState('ai') // ai, pharmacist, my
  const [message, setMessage] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [confirmedMentions, setConfirmedMentions] = useState([])
  
  // 나의 상담 관련 상태
  const [myRooms, setMyRooms] = useState([])
  const [loadingMyRooms, setLoadingMyRooms] = useState(false)

  const [aiMessages, setAiMessages] = useState([
    {
      id: 1,
      sender: 'AI',
      time: '09:00',
      content: '안녕하세요. 복약 관련 궁금한 점을 물어보세요. 약 이름을 @로 검색해서 함께 보낼 수 있어요.',
    },
  ])

  const [loading, setLoading] = useState(false)

  const debounceTimeoutRef = useRef(null)
  const latestRequestIdRef = useRef(0)
  const latestKeywordRef = useRef('')
  const nextMessageIdRef = useRef(10)

  const conversationIntro = useMemo(() => {
    if (activeTab === 'ai') return 'AI 챗봇으로 복약 정보를 먼저 확인하고, 필요하면 약사 상담으로 이어갈 수 있습니다.'
    if (activeTab === 'pharmacist') return '전문 약사님께 궁금한 점을 남겨주세요. 상담이 생성되면 전담 약사님이 매칭됩니다.'
    return '본인이 신청했던 상담 내역과 매칭 상태를 확인할 수 있습니다.'
  }, [activeTab])

  const fetchMyRooms = async () => {
    if (!session) return
    setLoadingMyRooms(true)
    try {
      const response = await axios.get('http://localhost:8082/app/consult/rooms/my', {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      })
      setMyRooms(response.data)
    } catch (error) {
      console.error('내 상담 목록 조회 실패:', error)
    } finally {
      setLoadingMyRooms(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'my') fetchMyRooms()
  }, [activeTab])

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const handleMessageChange = (event) => {
    const value = event.target.value
    setMessage(value)
    const mentionMatch = value.match(/@([^\s@]*)$/)
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
    if (!mentionMatch) { clearSuggestions(); return; }
    const keyword = mentionMatch[1].trim()
    if (!keyword) { clearSuggestions(); return; }

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

  const clearSuggestions = () => { setSuggestions([]); setShowSuggestions(false); }
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
    if (!trimmedMessage) return

    if (activeTab === 'ai') {
      const userMsg = { id: nextMessageIdRef.current++, sender: 'USER', time: '방금', content: trimmedMessage }
      setAiMessages(prev => [...prev, userMsg])
      setMessage(''); clearSuggestions(); setLoading(true);
      try {
        const data = await sendChatbotMessage(trimmedMessage)
        setAiMessages(prev => [...prev, { id: nextMessageIdRef.current++, sender: 'AI', time: createTimestampLabel(), content: data.answer || '답변을 가져오지 못했습니다.' }])
      } catch (error) {
        setAiMessages(prev => [...prev, { id: nextMessageIdRef.current++, sender: 'AI', time: createTimestampLabel(), content: '에러가 발생했습니다.' }])
      } finally { setLoading(false) }
    } 
    
    else if (activeTab === 'pharmacist') {
      // 실제 약사 상담 신청 로직
      if (!window.confirm('입력하신 내용으로 약사 상담을 신청하시겠습니까?')) return
      clearSuggestions()
      setLoading(true)
      try {
        const res = await axios.post('http://localhost:8082/app/consult/room', {}, {
          headers: { Authorization: `Bearer ${session.accessToken}` }
        })
        const newRoomId = res.data
        alert(`상담이 신청되었습니다! (방 번호: ${newRoomId})\n약사님 매칭 후 대화가 시작됩니다.`)
        // 채팅방으로 즉시 이동 (첫 메시지는 수동으로 입력해야 함)
        navigate('/consultation', { state: { initialRoomId: newRoomId.toString() } })
      } catch (error) {
        alert('상담 신청 실패: ' + (error.response?.data || error.message))
      } finally { setLoading(false) }
    }
  }

  const handleEnterRoom = (roomId) => {
    navigate('/consultation', { state: { initialRoomId: roomId.toString() } });
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
          <button type="button" className={activeTab === 'ai' ? 'chat-tab-button active' : 'chat-tab-button'} onClick={() => setActiveTab('ai')}>AI 챗봇</button>
          <button type="button" className={activeTab === 'pharmacist' ? 'chat-tab-button active' : 'chat-tab-button'} onClick={() => setActiveTab('pharmacist')}>약사 상담 신청</button>
          {session?.role === 'USER' && (
            <button type="button" className={activeTab === 'my' ? 'chat-tab-button active' : 'chat-tab-button'} onClick={() => setActiveTab('my')}>나의 상담 내역</button>
          )}
        </div>

        <div className="chat-body-layout">
          <div className="chat-main-panel">
            {activeTab === 'my' ? (
              <div className="chat-scroll-panel" style={{ padding: '24px' }}>
                {loadingMyRooms ? <p>불러오는 중...</p> : myRooms.length === 0 ? <p style={{ color: '#94a3b8' }}>신청 내역이 없습니다.</p> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {myRooms.map(room => (
                      <div key={room.roomId} style={roomCardStyle} onClick={() => handleEnterRoom(room.roomId)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            ...statusBadgeStyle,
                            backgroundColor: room.status === 'PENDING' ? '#fef08a' : room.status === 'MATCHED' ? '#dcfce7' : '#f1f5f9',
                            color: room.status === 'PENDING' ? '#854d0e' : room.status === 'MATCHED' ? '#166534' : '#475569'
                          }}>
                            {room.status === 'PENDING' ? '⏳ 약사 매칭 대기 중' : room.status === 'MATCHED' ? '✅ 약사 상담 중' : '🔒 종료된 상담'}
                          </span>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(room.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div style={{ marginTop: '10px', fontWeight: 'bold' }}>#{room.roomId}번 약사 1:1 상담방</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                          {room.status === 'PENDING' ? '약사님이 확인 버튼을 누를 때까지 잠시만 기다려주세요.' : '지금 바로 대화를 나눌 수 있습니다.'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'pharmacist' ? (
               <div className="chat-scroll-panel" style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '50px', marginBottom: '20px' }}>🩺</div>
                  <h2 style={{ marginBottom: '10px' }}>약사님께 직접 물어보세요</h2>
                  <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '30px' }}>
                    하단 입력창에 궁금한 내용을 적고 전송 버튼을 누르면<br />
                    즉시 상담방이 생성되고 전문 약사님께 알림이 전송됩니다.
                  </p>
                  <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '16px', display: 'inline-block', textAlign: 'left' }}>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>상담 가능 내용:</p>
                    <ul style={{ fontSize: '14px', color: '#475569', paddingLeft: '20px' }}>
                      <li>복용 중인 약의 부작용 문의</li>
                      <li>함께 먹으면 안 되는 약 확인</li>
                      <li>정확한 복용 시간 및 방법 안내</li>
                    </ul>
                  </div>
               </div>
            ) : (
              <div className="chat-scroll-panel">
                {aiMessages.map((chat) => (
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
            )}

            {activeTab !== 'my' && (
              <form className="chat-input-area" onSubmit={handleSubmit}>
                <div className="message-input-shell chat-message-shell">
                  <div className="message-input-highlight" aria-hidden="true">{renderHighlightedText(message, confirmedMentions)}</div>
                  <textarea className="message-input" value={message} onChange={handleMessageChange} placeholder={activeTab === 'ai' ? "@로 약을 검색하거나 질문을 입력하세요." : "약사님께 보낼 첫 메시지를 입력하세요."} rows={2} />
                </div>
                {activeTab === 'ai' && showSuggestions && (
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
                <button type="submit" className="chat-send-button" disabled={loading}>{loading ? '전송 중' : '전송'}</button>
              </form>
            )}
          </div>

          <aside className="chat-sidebar">
            <section className="chat-side-card">
              <h2>빠른 질문</h2>
              <div className="chat-quick-list">
                {quickQuestions.map((question) => (
                  <button key={question} type="button" onClick={() => setMessage(question)}>{question}</button>
                ))}
              </div>
            </section>
            <section className="chat-side-card warning">
              <h2>상담 안내</h2>
              <p>급한 증상이나 응급 상황은 가까운 병원 방문을 권장합니다.</p>
              <button type="button" onClick={() => setActiveTab('my')}>내 상담 내역 보기</button>
            </section>
          </aside>
        </div>
      </section>
    </div>
  )
}

const roomCardStyle = {
    padding: '20px', border: '1px solid #e2e8f0', borderRadius: '16px',
    backgroundColor: '#fff', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
};

const statusBadgeStyle = {
    fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '20px'
};

export default ChatConsultPage
