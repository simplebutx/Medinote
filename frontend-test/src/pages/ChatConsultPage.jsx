import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { getAuthSession } from '../api'
import SockJS from 'sockjs-client'
import Stomp from 'stompjs'

function ChatConsultPage() {
  const navigate = useNavigate()
  const session = getAuthSession()

  const [message, setMessage] = useState('')
  const [myRooms, setMyRooms] = useState([])
  const [loadingMyRooms, setLoadingMyRooms] = useState(false)
  const [loading, setLoading] = useState(false)

  // 실시간 상담 관련 상태
  const [roomId, setRoomId] = useState(null)
  const [messages, setMessages] = useState([])
  const [connected, setConnected] = useState(false)

  // 별점 및 피드백 관련 상태
  const [rating, setRating] = useState(5)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false)

  const stompClientRef = useRef(null)
  const subscriptionRef = useRef(null)
  const messagesEndRef = useRef(null)
  const isConnectingRef = useRef(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    fetchMyRooms()
  }, [])

  const disconnect = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
      subscriptionRef.current = null
    }
    if (stompClientRef.current !== null) {
      try {
        stompClientRef.current.disconnect()
      } catch (e) {}
      stompClientRef.current = null
    }
    setConnected(false)
    isConnectingRef.current = false
  }

  const connect = async (targetRoomId, initialMessage = null) => {
    if (isConnectingRef.current || (stompClientRef.current?.connected && roomId === targetRoomId)) return

    isConnectingRef.current = true
    
    try {
      const res = await axios.get(`http://localhost:8082/app/consult/room/${targetRoomId}/messages`)
      setMessages(res.data || [])
    } catch (error) {
      console.error('과거 대화 내역 불러오기 실패:', error)
    }

    const socket = new SockJS('http://localhost:8082/api/ws-stomp')
    const stompClient = Stomp.over(socket)
    stompClient.debug = null

    stompClient.connect({}, (frame) => {
      setConnected(true)
      isConnectingRef.current = false

      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }

      subscriptionRef.current = stompClient.subscribe(`/topic/room/${targetRoomId}`, (sdkEvent) => {
        const newMessage = JSON.parse(sdkEvent.body)
        setMessages((prev) => {
          const isDuplicate = prev.some(msg => 
            (msg.messageId && newMessage.messageId && msg.messageId === newMessage.messageId) ||
            ((msg.content || msg.message) === (newMessage.content || newMessage.message) && 
             msg.senderId === newMessage.senderId && 
             Math.abs(new Date(msg.createdAt).getTime() - new Date().getTime()) < 1000)
          );
          if (isDuplicate) return prev;
          return [...prev, newMessage]
        })
      })

      stompClient.send('/app/consult/message', {}, JSON.stringify({
        type: 'ENTER',
        roomId: targetRoomId,
        senderId: session?.userId,
        senderType: session?.role || 'USER',
        senderName: session?.username || '사용자',
        message: ''
      }))

      if (initialMessage) {
        stompClient.send('/app/consult/message', {}, JSON.stringify({
          type: 'TALK',
          roomId: targetRoomId,
          senderId: session?.userId,
          senderType: session?.role || 'USER',
          senderName: session?.username || '사용자',
          message: initialMessage
        }))
      }
    }, (error) => {
      console.error('WebSocket 연결 실패:', error)
      setConnected(false)
      isConnectingRef.current = false
    })

    stompClientRef.current = stompClient
  }

  useEffect(() => {
    if (roomId) {
      connect(roomId)
    }
    return () => {
      disconnect()
    }
  }, [roomId])

  const conversationIntro = useMemo(() => {
    return roomId 
      ? `현재 #${roomId}번 상담방에서 약사님과 대화 중입니다.`
      : '전문 약사에게 궁금한 점을 직접 문의하세요. 상담이 생성되면 전담 약사가 매칭됩니다.'
  }, [roomId])

  const fetchMyRooms = async () => {
    if (!session?.accessToken) return
    setLoadingMyRooms(true)
    try {
      const response = await axios.get('http://localhost:8082/app/consult/rooms/my', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
      setMyRooms(response.data || [])
    } catch (error) {
      console.error('내 상담 목록 조회 실패:', error)
    } finally {
      setLoadingMyRooms(false)
    }
  }

  const handleSubmit = async (event) => {
    if (event) event.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage) return

    if (!roomId) {
      if (!window.confirm('입력하신 내용으로 약사 상담을 신청하시겠습니까?')) return

      setLoading(true)
      try {
        const res = await axios.post(
          'http://localhost:8082/app/consult/room',
          {},
          {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          },
        )
        const newRoomId = res.data.toString()
        setRoomId(newRoomId)
        setMessage('')
        connect(newRoomId, trimmedMessage)
      } catch (error) {
        alert('상담 신청 실패: ' + (error.response?.data || error.message))
      } finally {
        setLoading(false)
      }
    } else {
      if (stompClientRef.current?.connected) {
        stompClientRef.current.send('/app/consult/message', {}, JSON.stringify({
          type: 'TALK',
          roomId: roomId,
          senderId: session?.userId,
          senderType: session?.role || 'USER',
          senderName: session?.username || '사용자',
          message: trimmedMessage
        }))
        setMessage('')
      } else {
        alert('상담방 연결이 끊어졌습니다. 다시 시도해주세요.')
        connect(roomId)
      }
    }
  }

  const handleEnterRoom = (targetRoomId) => {
    setRoomId(targetRoomId.toString())
    setIsFeedbackSubmitted(false)
    setRating(5)
    setFeedbackComment('')
  }

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault()
    if (!window.confirm('평가를 제출하시겠습니까?')) return

    try {
      await axios.post(`http://localhost:8082/app/consult/room/${roomId}/feedback`, {
        rating,
        comment: feedbackComment,
        pharmacistId: myRooms.find(r => r.roomId.toString() === roomId)?.pharmacistId || 0
      }, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      })
      alert('평가가 등록되었습니다. 감사합니다!')
      setIsFeedbackSubmitted(true)
      fetchMyRooms()
    } catch (error) {
      alert('평가 등록 실패: ' + (error.response?.data || error.message))
    }
  }

  const currentRoom = useMemo(() => {
    return myRooms.find(r => r.roomId.toString() === roomId)
  }, [myRooms, roomId])

  return (
    <div className="app-page">
      <div className="app-page-header">
        <p className="app-page-eyebrow">Consultation</p>
        <h1 className="app-page-title">약사 상담</h1>
        <p className="app-page-description">{conversationIntro}</p>
      </div>

      <section className="chat-layout-card">
        <div className="chat-body-layout">
          <div className="chat-main-panel">
            {roomId ? (
              <div className="chat-scroll-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: 'bold' }}>#{roomId}번 상담방</span>
                  <button 
                    onClick={() => { setRoomId(null); setMessages([]); disconnect(); }} 
                    style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                  >
                    새 상담 신청하기
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
                  {messages.map((msg, index) => {
                    const isMe = msg.senderId === session?.userId && msg.senderType === (session?.role || 'USER');
                    const isSystem = msg.type === 'ENTER';

                    if (isSystem) return <div key={index} style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', margin: '10px 0' }}>{msg.message}</div>;

                    return (
                      <div key={index} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
                        <div style={{ 
                          maxWidth: '70%', 
                          padding: '10px 14px', 
                          borderRadius: '16px', 
                          backgroundColor: isMe ? '#2563eb' : '#f1f5f9', 
                          color: isMe ? '#fff' : '#1e293b',
                          fontSize: '14px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}>
                          {!isMe && <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#64748b' }}>{msg.senderName} {msg.senderType === 'PHARMACIST' && '🩺'}</div>}
                          {msg.content || msg.message}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            ) : (
              <div className="chat-scroll-panel" style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '50px', marginBottom: '20px' }}>🩺</div>
                <h2 style={{ marginBottom: '10px' }}>약사님께 직접 물어보세요</h2>
                <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '30px' }}>
                  하단 입력창에 궁금한 내용을 적고 전송 버튼을 누르면
                  <br />
                  즉시 상담방이 생성되고 전문 약사님께 알림이 전송됩니다.
                </p>
                <div
                  style={{
                    padding: '20px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '16px',
                    display: 'inline-block',
                    textAlign: 'left',
                  }}
                >
                  <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>상담 가능 내용:</p>
                  <ul style={{ fontSize: '14px', color: '#475569', paddingLeft: '20px' }}>
                    <li>복용 중인 약의 부작용 문의</li>
                    <li>함께 먹으면 안 되는 약 확인</li>
                    <li>정확한 복용 시간 및 방법 안내</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="chat-input-area" style={{ borderTop: '1px solid #e2e8f0', padding: '16px' }}>
              {currentRoom?.status === 'CLOSED' ? (
                <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  {isFeedbackSubmitted ? (
                    <div style={{ textAlign: 'center', color: '#059669', fontWeight: 'bold' }}>
                      ✅ 소중한 의견 감사합니다! 평가가 완료되었습니다.
                    </div>
                  ) : (
                    <form onSubmit={handleFeedbackSubmit}>
                      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                        <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#1e293b' }}>🩺 상담은 만족스러우셨나요?</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '24px' }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span 
                              key={star} 
                              onClick={() => setRating(star)} 
                              style={{ cursor: 'pointer', color: star <= rating ? '#eab308' : '#cbd5e1' }}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                          type="text"
                          placeholder="약사님께 한줄평을 남겨주세요 (선택사항)"
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          style={{ flex: 1, padding: '10px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
                        />
                        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                          평가 제출
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px' }}>
                  <div className="message-input-shell chat-message-shell" style={{ flex: 1 }}>
                    <textarea
                      className="message-input"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder={roomId ? "메시지를 입력하세요." : "약사님께 보낼 첫 메시지를 입력하세요."}
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                      style={{ position: 'static', color: '#111', background: '#f1f5f9', minHeight: '60px' }}
                    />
                  </div>
                  <button type="submit" className="chat-send-button" disabled={loading} style={{ height: 'auto', alignSelf: 'stretch' }}>
                    {loading ? '...' : '전송'}
                  </button>
                </form>
              )}
            </div>
          </div>

          <aside className="chat-sidebar">
            <section className="chat-side-card warning">
              <h2>상담 안내</h2>
              <p>급한 증상이나 응급 상황은 가까운 병원 방문을 권장합니다.</p>
            </section>

            <section className="chat-side-card" style={{ marginTop: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ margin: 0 }}>나의 상담 내역</h2>
                <button onClick={fetchMyRooms} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '12px', cursor: 'pointer' }}>새로고침</button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, maxHeight: '500px' }}>
                {loadingMyRooms ? (
                  <p style={{ fontSize: '13px', color: '#94a3b8' }}>불러오는 중...</p>
                ) : myRooms.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#94a3b8' }}>신청 내역이 없습니다.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {myRooms.map((room) => (
                      <div 
                        key={room.roomId} 
                        style={{ ...roomCardSidebarStyle, borderLeft: `4px solid ${room.status === 'MATCHED' ? '#22c55e' : room.status === 'PENDING' ? '#eab308' : '#cbd5e1'}` }} 
                        onClick={() => handleEnterRoom(room.roomId)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>#{room.roomId}번 상담</div>
                          <div style={{ 
                            fontSize: '10px', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            backgroundColor: room.status === 'MATCHED' ? '#dcfce7' : room.status === 'PENDING' ? '#fef08a' : '#f1f5f9',
                            color: room.status === 'MATCHED' ? '#166534' : room.status === 'PENDING' ? '#854d0e' : '#475569',
                            fontWeight: '700'
                          }}>
                            {room.status === 'PENDING' ? '매칭 대기' : room.status === 'MATCHED' ? '상담 중' : '종료'}
                          </div>
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#334155', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          marginBottom: '4px'
                        }}>
                          {room.firstMessage || '메시지 없음'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'right' }}>
                          {new Date(room.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  )
}

const roomCardSidebarStyle = {
  padding: '12px',
  borderRadius: '8px',
  backgroundColor: '#f8fafc',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  border: '1px solid #e2e8f0',
}

export default ChatConsultPage
