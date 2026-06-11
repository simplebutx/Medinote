import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getAuthSession } from '../api';

const PharmacistRoomList = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const session = getAuthSession();
    
    const [activeTab, setActiveTab] = useState(location.state?.initialTab || 'PENDING'); // PENDING, MATCHED, CLOSED
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchRooms = async (status) => {
        setLoading(true);
        try {
            let endpoint = '';
            if (status === 'PENDING') endpoint = '/rooms/pending';
            else if (status === 'MATCHED') endpoint = '/rooms/active';
            else if (status === 'CLOSED') endpoint = '/rooms/completed';

            const response = await axios.get(`http://localhost:8082/app/consult${endpoint}`, {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`
                }
            });
            setRooms(response.data);
        } catch (error) {
            console.error(`${status} 목록 조회 실패:`, error);
            setRooms([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session || session.role !== 'PHARMACIST') {
            alert('약사 전용 페이지입니다.');
            navigate('/');
            return;
        }
        fetchRooms(activeTab);
    }, [activeTab, navigate]);

    // 상담 수락 (PENDING -> MATCHED)
    const handleAcceptConsultation = async (roomId) => {
        try {
            await axios.post(`http://localhost:8082/app/consult/room/${roomId}/match`, {}, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            alert('상담을 수락했습니다. 상담방으로 이동합니다.');
            // 수락 즉시 해당 상담방으로 입장
            navigate('/consultation', { state: { initialRoomId: roomId } });
        } catch (error) {
            alert('상담 수락 실패: ' + (error.response?.data || error.message));
        }
    };

    // 상담 종료 (MATCHED -> CLOSED)
    const handleCloseConsultation = async (roomId) => {
        if (!window.confirm('상담을 종료하시겠습니까?')) return;
        try {
            await axios.patch(`http://localhost:8082/app/consult/room/${roomId}/close`, {}, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            alert('상담이 종료되었습니다.');
            fetchRooms('MATCHED');
        } catch (error) {
            alert('상담 종료 실패: ' + (error.response?.data || error.message));
        }
    };

    // 채팅방 입장
    const handleEnterRoom = (roomId) => {
        navigate('/consultation', { state: { initialRoomId: roomId } });
    };

    if (loading && rooms.length === 0) return <div style={containerStyle}><h2>로딩 중...</h2></div>;

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h2>🩺 약사 상담 관리</h2>
                <Link to="/" style={linkStyle}>홈으로</Link>
            </div>

            {/* 탭 메뉴 */}
            <div style={tabContainerStyle}>
                <button 
                    onClick={() => setActiveTab('PENDING')} 
                    style={{...tabStyle, borderBottom: activeTab === 'PENDING' ? '3px solid #007AFF' : 'none', color: activeTab === 'PENDING' ? '#007AFF' : '#64748b'}}
                >
                    대기 중
                </button>
                <button 
                    onClick={() => setActiveTab('MATCHED')} 
                    style={{...tabStyle, borderBottom: activeTab === 'MATCHED' ? '3px solid #10b981' : 'none', color: activeTab === 'MATCHED' ? '#10b981' : '#64748b'}}
                >
                    진행 중
                </button>
                <button 
                    onClick={() => setActiveTab('CLOSED')} 
                    style={{...tabStyle, borderBottom: activeTab === 'CLOSED' ? '3px solid #64748b' : 'none', color: activeTab === 'CLOSED' ? '#64748b' : '#64748b'}}
                >
                    완료됨
                </button>
            </div>

            {rooms.length === 0 ? (
                <div style={emptyStyle}>
                    {activeTab === 'PENDING' && "새로운 상담 요청이 없습니다."}
                    {activeTab === 'MATCHED' && "현재 진행 중인 상담이 없습니다."}
                    {activeTab === 'CLOSED' && "완료된 상담 내역이 없습니다."}
                </div>
            ) : (
                <div style={listStyle}>
                    {rooms.map((room) => (
                        <div key={room.roomId} style={cardStyle}>
                            <div style={cardHeaderStyle}>
                                <span style={{
                                    ...badgeStyle, 
                                    backgroundColor: activeTab === 'PENDING' ? '#fef08a' : activeTab === 'MATCHED' ? '#dcfce7' : '#f1f5f9',
                                    color: activeTab === 'PENDING' ? '#854d0e' : activeTab === 'MATCHED' ? '#166534' : '#475569'
                                }}>
                                    {activeTab === 'PENDING' ? '대기중' : activeTab === 'MATCHED' ? '진행중' : '완료'}
                                </span>
                                <span style={timeStyle}>{new Date(room.createdAt).toLocaleString()}</span>
                            </div>
                            <div style={cardBodyStyle}>
                                <p><strong>방 번호:</strong> {room.roomId}</p>
                                <p><strong>사용자:</strong> {room.customerName} (ID: {room.customId})</p>
                                <p><strong>첫 메시지:</strong> {room.firstMessage}</p>
                            </div>

                            {activeTab === 'CLOSED' && room.rating && (
                                <div style={feedbackBoxStyle}>
                                    <div style={{ marginBottom: '5px' }}>
                                        <span style={{ color: '#eab308', fontWeight: 'bold', fontSize: '18px' }}>
                                            {'★'.repeat(room.rating)}{'☆'.repeat(5 - room.rating)}
                                        </span>
                                        <span style={{ marginLeft: '8px', fontSize: '14px', color: '#1e293b', fontWeight: 'bold' }}>
                                            {room.rating}점
                                        </span>
                                    </div>
                                    {room.feedbackComment && (
                                        <div style={{ fontSize: '14px', color: '#475569', fontStyle: 'italic', backgroundColor: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            "{room.feedbackComment}"
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'CLOSED' && room.aiConsultationSummary && (
                                <div style={summaryBoxStyle}>
                                    <div style={summaryTitleStyle}>AI 상담 요약</div>
                                    <div style={summaryTextStyle}>{room.aiConsultationSummary}</div>
                                </div>
                            )}
                            
                            <div style={actionAreaStyle}>
                                {activeTab === 'PENDING' && (
                                    <button onClick={() => handleAcceptConsultation(room.roomId)} style={acceptButtonStyle}>
                                        상담 수락하기
                                    </button>
                                )}
                                {activeTab === 'MATCHED' && (
                                    <>
                                        <button onClick={() => handleEnterRoom(room.roomId)} style={enterButtonStyle}>
                                            채팅방 입장
                                        </button>
                                        <button onClick={() => handleCloseConsultation(room.roomId)} style={closeButtonStyle}>
                                            상담 종료
                                        </button>
                                    </>
                                )}
                                {activeTab === 'CLOSED' && (
                                    <button onClick={() => handleEnterRoom(room.roomId)} style={historyButtonStyle}>
                                        대화 내역 보기
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- 스타일 가이드 ---
const containerStyle = {
    maxWidth: '800px',
    margin: '40px auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
};

const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
};

const tabContainerStyle = {
    display: 'flex',
    gap: '20px',
    marginBottom: '30px',
    borderBottom: '1px solid #e2e8f0'
};

const tabStyle = {
    padding: '10px 5px',
    fontSize: '16px',
    fontWeight: 'bold',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s'
};

const linkStyle = {
    color: '#007AFF',
    textDecoration: 'none',
    fontWeight: 'bold'
};

const emptyStyle = {
    textAlign: 'center',
    padding: '60px',
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    color: '#94a3b8',
    fontSize: '15px'
};

const listStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
};

const cardStyle = {
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '24px',
    backgroundColor: '#ffffff',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
};

const cardHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
};

const badgeStyle = {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '800'
};

const timeStyle = {
    fontSize: '13px',
    color: '#94a3b8'
};

const cardBodyStyle = {
    fontSize: '15px',
    color: '#334155',
    lineHeight: '1.6'
};

const actionAreaStyle = {
    display: 'flex',
    gap: '10px'
};

const acceptButtonStyle = {
    flex: 1,
    padding: '12px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer'
};

const enterButtonStyle = {
    flex: 2,
    padding: '12px',
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer'
};

const closeButtonStyle = {
    flex: 1,
    padding: '12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer'
};

const historyButtonStyle = {
    flex: 1,
    padding: '12px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer'
};

const feedbackBoxStyle = {
    marginTop: '10px',
    padding: '15px',
    backgroundColor: '#fffbeb',
    borderRadius: '12px',
    border: '1px solid #fde68a'
};

const summaryBoxStyle = {
    marginTop: '10px',
    padding: '14px 15px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
};

const summaryTitleStyle = {
    fontSize: '13px',
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: '8px'
};

const summaryTextStyle = {
    fontSize: '14px',
    color: '#334155',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap'
};

export default PharmacistRoomList;
