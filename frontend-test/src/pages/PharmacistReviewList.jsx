import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { getAuthSession } from '../api';

const PharmacistReviewList = () => {
    const navigate = useNavigate();
    const session = getAuthSession();
    
    const [reviews, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAllReviews = async () => {
        setLoading(true);
        try {
            // 완료된 모든 상담 목록을 가져와서 별점이 있는 것만 필터링
            const response = await axios.get(`http://localhost:8082/app/consult/rooms/completed`, {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`
                }
            });
            
            // 별점이 있는 리뷰만 필터링하고 최신순 정렬
            const filteredReviews = (response.data || [])
                .filter(room => room.rating)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                
            setRooms(filteredReviews);
        } catch (error) {
            console.error(`리뷰 목록 조회 실패:`, error);
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
        fetchAllReviews();
    }, [navigate]);

    if (loading) return <div style={containerStyle}><h2>로딩 중...</h2></div>;

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h2>🌟 전체 환자 리뷰 조회</h2>
                <Link to="/p/dashboard" style={linkStyle}>대시보드로</Link>
            </div>

            <div style={{ marginBottom: '20px', color: '#64748b' }}>
                총 {reviews.length}개의 소중한 피드백이 있습니다.
            </div>

            {reviews.length === 0 ? (
                <div style={emptyStyle}>
                    아직 등록된 환자 리뷰가 없습니다.
                </div>
            ) : (
                <div style={listStyle}>
                    {reviews.map((room) => (
                        <div key={room.roomId} style={cardStyle}>
                            <div style={cardHeaderStyle}>
                                <span style={{ color: '#eab308', fontWeight: 'bold', fontSize: '18px' }}>
                                    {'★'.repeat(room.rating)}{'☆'.repeat(5 - room.rating)}
                                </span>
                                <span style={timeStyle}>{new Date(room.createdAt).toLocaleDateString()}</span>
                            </div>
                            
                            <div style={cardBodyStyle}>
                                <div style={commentBoxStyle}>
                                    "{room.feedbackComment || '별점만 남겨주셨습니다.'}"
                                </div>
                                <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                                    <strong>상담 환자:</strong> {room.customerName} | <strong>방 번호:</strong> #{room.roomId}
                                </p>
                                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                                    <strong>상담 내용:</strong> {room.firstMessage}
                                </p>
                            </div>
                            
                            <div style={actionAreaStyle}>
                                <button onClick={() => navigate('/consultation', { state: { initialRoomId: room.roomId } })} style={historyButtonStyle}>
                                    전체 대화 내역 확인하기
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Styles ---
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
    color: '#007AFF',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '14px'
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
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
};

const cardHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
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

const commentBoxStyle = {
    fontSize: '16px',
    color: '#1e293b',
    fontWeight: '500',
    padding: '15px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    fontStyle: 'italic'
};

const actionAreaStyle = {
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'flex-end'
};

const historyButtonStyle = {
    padding: '8px 16px',
    backgroundColor: '#fff',
    color: '#475569',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer'
};

export default PharmacistReviewList;
