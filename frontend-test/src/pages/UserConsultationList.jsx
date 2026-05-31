import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { getAuthSession } from '../api';

const UserConsultationList = () => {
    const navigate = useNavigate();
    const session = getAuthSession();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session) {
            alert('로그인이 필요한 서비스입니다.');
            navigate('/login');
            return;
        }

        const fetchMyRooms = async () => {
            try {
                const response = await axios.get('http://localhost:8082/app/consult/rooms/my', {
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`
                    }
                });
                setRooms(response.data);
            } catch (error) {
                console.error('내 상담 목록 조회 실패:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMyRooms();
    }, [navigate]);

    const handleEnterRoom = (roomId) => {
        navigate('/consultation', { state: { initialRoomId: roomId } });
    };

    if (loading) return <div style={containerStyle}><h2>로딩 중...</h2></div>;

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h2>💬 내 상담 내역</h2>
                <div style={{display:'flex', gap:'10px'}}>
                    <Link to="/consultation" style={actionLinkStyle}>새 상담 신청</Link>
                    <Link to="/" style={linkStyle}>홈으로</Link>
                </div>
            </div>

            {rooms.length === 0 ? (
                <div style={emptyStyle}>
                    아직 신청하신 상담 내역이 없습니다.
                    <br />
                    <Link to="/consultation" style={{color:'#007AFF', display:'inline-block', marginTop:'15px'}}>새로운 상담을 신청해 보세요!</Link>
                </div>
            ) : (
                <div style={listStyle}>
                    {rooms.map((room) => (
                        <div key={room.roomId} style={cardStyle}>
                            <div style={cardHeaderStyle}>
                                <span style={{
                                    ...badgeStyle, 
                                    backgroundColor: room.status === 'PENDING' ? '#fef08a' : room.status === 'MATCHED' ? '#dcfce7' : '#f1f5f9',
                                    color: room.status === 'PENDING' ? '#854d0e' : room.status === 'MATCHED' ? '#166534' : '#475569'
                                }}>
                                    {room.status === 'PENDING' ? '매칭 대기중' : room.status === 'MATCHED' ? '진행중' : '상담 종료'}
                                </span>
                                <span style={timeStyle}>{new Date(room.createdAt).toLocaleString()}</span>
                            </div>
                            <div style={cardBodyStyle}>
                                <p><strong>방 번호:</strong> {room.roomId}</p>
                                <p style={{fontSize:'14px', color:'#64748b'}}>
                                    {room.status === 'PENDING' ? '약사님이 확인 중입니다. 잠시만 기다려 주세요.' : '상담이 연결되었습니다.'}
                                </p>
                            </div>
                            <button onClick={() => handleEnterRoom(room.roomId)} style={enterButtonStyle}>
                                {room.status === 'CLOSED' ? '대화 내용 보기' : '채팅방 입장하기'}
                            </button>
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
    marginBottom: '30px'
};

const linkStyle = {
    color: '#64748b',
    textDecoration: 'none',
    fontWeight: '600'
};

const actionLinkStyle = {
    color: '#007AFF',
    textDecoration: 'none',
    fontWeight: 'bold'
};

const emptyStyle = {
    textAlign: 'center',
    padding: '80px 20px',
    backgroundColor: '#f8fafc',
    borderRadius: '20px',
    color: '#94a3b8',
    fontSize: '16px',
    lineHeight: '1.6'
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
    lineHeight: '1.5'
};

const enterButtonStyle = {
    padding: '12px',
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer'
};

export default UserConsultationList;
