import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { getAuthSession } from '../api'

function ChatConsultPage() {
  const navigate = useNavigate()
  const session = getAuthSession()

  const [activeTab, setActiveTab] = useState('pharmacist')
  const [message, setMessage] = useState('')
  const [myRooms, setMyRooms] = useState([])
  const [loadingMyRooms, setLoadingMyRooms] = useState(false)
  const [loading, setLoading] = useState(false)

  const conversationIntro = useMemo(() => {
    if (activeTab === 'pharmacist') {
      return '전문 약사에게 궁금한 점을 직접 문의하세요. 상담이 생성되면 전담 약사가 매칭됩니다.'
    }
    return '본인이 신청했던 상담 내역과 매칭 상태를 확인할 수 있습니다.'
  }, [activeTab])

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

  useEffect(() => {
    if (activeTab === 'my') {
      fetchMyRooms()
    }
  }, [activeTab])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage) return

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
      const newRoomId = res.data
      alert(`상담이 신청되었습니다! (방 번호: ${newRoomId})\n약사님 매칭 후 대화가 시작됩니다.`)
      navigate('/consultation', { state: { initialRoomId: newRoomId.toString() } })
    } catch (error) {
      alert('상담 신청 실패: ' + (error.response?.data || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleEnterRoom = (roomId) => {
    navigate('/consultation', { state: { initialRoomId: roomId.toString() } })
  }

  return (
    <div className="app-page">
      <div className="app-page-header">
        <p className="app-page-eyebrow">Consultation</p>
        <h1 className="app-page-title">약사 상담</h1>
        <p className="app-page-description">{conversationIntro}</p>
      </div>

      <section className="chat-layout-card">
        <div className="chat-tab-row">
          <button
            type="button"
            className={activeTab === 'pharmacist' ? 'chat-tab-button active' : 'chat-tab-button'}
            onClick={() => setActiveTab('pharmacist')}
          >
            약사 상담 신청
          </button>
          {session?.role === 'USER' && (
            <button
              type="button"
              className={activeTab === 'my' ? 'chat-tab-button active' : 'chat-tab-button'}
              onClick={() => setActiveTab('my')}
            >
              나의 상담 내역
            </button>
          )}
        </div>

        <div className="chat-body-layout">
          <div className="chat-main-panel">
            {activeTab === 'my' ? (
              <div className="chat-scroll-panel" style={{ padding: '24px' }}>
                {loadingMyRooms ? (
                  <p>불러오는 중...</p>
                ) : myRooms.length === 0 ? (
                  <p style={{ color: '#94a3b8' }}>신청 내역이 없습니다.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {myRooms.map((room) => (
                      <div key={room.roomId} style={roomCardStyle} onClick={() => handleEnterRoom(room.roomId)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span
                            style={{
                              ...statusBadgeStyle,
                              backgroundColor:
                                room.status === 'PENDING'
                                  ? '#fef08a'
                                  : room.status === 'MATCHED'
                                    ? '#dcfce7'
                                    : '#f1f5f9',
                              color:
                                room.status === 'PENDING'
                                  ? '#854d0e'
                                  : room.status === 'MATCHED'
                                    ? '#166534'
                                    : '#475569',
                            }}
                          >
                            {room.status === 'PENDING'
                              ? '약사 매칭 대기 중'
                              : room.status === 'MATCHED'
                                ? '약사 상담 중'
                                : '종료된 상담'}
                          </span>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {new Date(room.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ marginTop: '10px', fontWeight: 'bold' }}>#{room.roomId}번 약사 1:1 상담방</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                          {room.status === 'PENDING'
                            ? '약사님이 확인 버튼을 누를 때까지 잠시만 기다려주세요.'
                            : '지금 바로 대화를 나눌 수 있습니다.'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

            {activeTab === 'pharmacist' && (
              <form className="chat-input-area" onSubmit={handleSubmit}>
                <div className="message-input-shell chat-message-shell">
                  <textarea
                    className="message-input"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="약사님께 보낼 첫 메시지를 입력하세요."
                    rows={2}
                  />
                </div>
                <button type="submit" className="chat-send-button" disabled={loading}>
                  {loading ? '전송 중' : '전송'}
                </button>
              </form>
            )}
          </div>

          <aside className="chat-sidebar">
            <section className="chat-side-card warning">
              <h2>상담 안내</h2>
              <p>급한 증상이나 응급 상황은 가까운 병원 방문을 권장합니다.</p>
              <button type="button" onClick={() => setActiveTab('my')}>
                내 상담 내역 보기
              </button>
            </section>
          </aside>
        </div>
      </section>
    </div>
  )
}

const roomCardStyle = {
  padding: '20px',
  border: '1px solid #e2e8f0',
  borderRadius: '16px',
  backgroundColor: '#fff',
  cursor: 'pointer',
  transition: 'all 0.2s',
  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
}

const statusBadgeStyle = {
  fontSize: '11px',
  fontWeight: 'bold',
  padding: '4px 10px',
  borderRadius: '20px',
}

export default ChatConsultPage
