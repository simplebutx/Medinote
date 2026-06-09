import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { getAuthSession } from '../api';

const PharmacistDashboard = () => {
    const navigate = useNavigate();
    const session = getAuthSession();
    const [stats, setStats] = useState({ pending: 0, active: 0, completed: 0 });
    const [feedbackStats, setFeedbackStats] = useState({
        averageRating: 0.0,
        totalReviewCount: 0,
        recentFeedbacks: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session || (session.role !== 'PHARMACIST' && session.role !== 'ROLE_PHARMACIST')) {
            alert('약사 전용 페이지입니다.');
            navigate('/login');
            return;
        }

        const fetchDashboardData = async () => {
            try {
                // 현황 데이터 및 피드백 통계 병렬로 가져오기
                const [p, a, c, f] = await Promise.all([
                    axios.get('http://localhost:8082/app/consult/rooms/pending', { headers: { Authorization: `Bearer ${session.accessToken}` } }),
                    axios.get('http://localhost:8082/app/consult/rooms/active', { headers: { Authorization: `Bearer ${session.accessToken}` } }),
                    axios.get('http://localhost:8082/app/consult/rooms/completed', { headers: { Authorization: `Bearer ${session.accessToken}` } }),
                    axios.get('http://localhost:8082/app/consult/rooms/feedback-stats', { headers: { Authorization: `Bearer ${session.accessToken}` } })
                ]);
                
                setStats({
                    pending: p.data.length,
                    active: a.data.length,
                    completed: c.data.length
                });

                setFeedbackStats(f.data);
            } catch (error) {
                console.error("데이터 조회 실패", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [navigate]);

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <div>
                    <h1 style={titleStyle}>👨‍⚕️ 약사 통합 대시보드</h1>
                    <p style={welcomeStyle}>반가워요, <strong>{session?.username}</strong> 약사님! 오늘도 힘내세요.</p>
                </div>
                <div style={{display:'flex', gap:'10px'}}>
                    <button onClick={() => { localStorage.removeItem('authSession'); navigate('/login'); }} style={logoutButtonStyle}>로그아웃</button>
                    <Link to="/" style={homeLinkStyle}>메인홈</Link>
                </div>
            </div>

            <div style={gridStyle}>
                <div style={{...cardStyle, borderLeft: '6px solid #f59e0b'}} onClick={() => navigate('/p/rooms', { state: { initialTab: 'PENDING' } })}>
                    <div style={cardLabelStyle}>🔔 대기 중</div>
                    <div style={cardValueStyle}>{stats.pending}건</div>
                    <div style={cardActionStyle}>수락하러 가기 〉</div>
                </div>

                <div style={{...cardStyle, borderLeft: '6px solid #10b981'}} onClick={() => navigate('/p/rooms', { state: { initialTab: 'MATCHED' } })}>
                    <div style={cardLabelStyle}>💬 진행 중</div>
                    <div style={cardValueStyle}>{stats.active}건</div>
                    <div style={cardActionStyle}>채팅방 입장하기 〉</div>
                </div>

                <div style={{...cardStyle, borderLeft: '6px solid #64748b'}} onClick={() => navigate('/p/rooms', { state: { initialTab: 'CLOSED' } })}>
                    <div style={cardLabelStyle}>✅ 상담 완료</div>
                    <div style={cardValueStyle}>{stats.completed}건</div>
                    <div style={cardActionStyle}>전체 내역 보기 〉</div>
                </div>
            </div>

            <div style={{marginTop: '40px'}}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                    <h2 style={sectionTitleStyle}>🌟 최근 환자 피드백</h2>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#eab308' }}>
                            평균 평점: {feedbackStats.averageRating} / 5.0
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                            총 {feedbackStats.totalReviewCount}개의 후기
                        </div>
                    </div>
                </div>

                {feedbackStats.recentFeedbacks.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '16px', color: '#94a3b8' }}>
                        아직 등록된 후기가 없습니다.
                    </div>
                ) : (
                    <div style={feedbackListStyle}>
                        {feedbackStats.recentFeedbacks.map((fb, idx) => (
                            <div key={idx} style={feedbackCardStyle}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ color: '#eab308', fontWeight: 'bold' }}>
                                        {'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(fb.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: '500', marginBottom: '8px' }}>
                                    "{fb.comment || '별점만 남겨주셨습니다.'}"
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    상담환자: {fb.customerName} (방 번호: #{fb.roomId})
                                </div>
                            </div>
                        ))}
                        <button 
                            onClick={() => navigate('/p/reviews')}
                            style={{ width: '100%', padding: '12px', background: 'none', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b', cursor: 'pointer', fontWeight: '600' }}
                        >
                            모든 후기 상세 조회하기 〉
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Styles ---
const containerStyle = { maxWidth: '1000px', margin: '60px auto', padding: '0 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' };
const titleStyle = { fontSize: '32px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' };
const welcomeStyle = { color: '#64748b', fontSize: '16px' };
const homeLinkStyle = { color: '#64748b', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' };
const logoutButtonStyle = { backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' };
const cardStyle = { backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', cursor: 'pointer', transition: 'all 0.2s' };
const cardLabelStyle = { fontSize: '14px', fontWeight: '700', color: '#64748b', marginBottom: '12px' };
const cardValueStyle = { fontSize: '36px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' };
const cardActionStyle = { fontSize: '13px', color: '#007AFF', fontWeight: '600' };
const sectionTitleStyle = { fontSize: '20px', fontWeight: '700', color: '#1e293b', margin: 0 };
const feedbackListStyle = { display: 'flex', flexDirection: 'column', gap: '16px' };
const feedbackCardStyle = { backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' };

export default PharmacistDashboard;
