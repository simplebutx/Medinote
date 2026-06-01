import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { getAuthSession } from '../api';

const PharmacistDashboard = () => {
    const navigate = useNavigate();
    const session = getAuthSession();
    const [stats, setStats] = useState({ pending: 0, active: 0, completed: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session || (session.role !== 'PHARMACIST' && session.role !== 'ROLE_PHARMACIST')) {
            alert('약사 전용 페이지입니다.');
            navigate('/login');
            return;
        }

        const fetchStats = async () => {
            try {
                // 병렬로 현황 데이터 가져오기
                const [p, a, c] = await Promise.all([
                    axios.get('http://localhost:8082/app/consult/rooms/pending', { headers: { Authorization: `Bearer ${session.accessToken}` } }),
                    axios.get('http://localhost:8082/app/consult/rooms/active', { headers: { Authorization: `Bearer ${session.accessToken}` } }),
                    axios.get('http://localhost:8082/app/consult/rooms/completed', { headers: { Authorization: `Bearer ${session.accessToken}` } })
                ]);
                setStats({
                    pending: p.data.length,
                    active: a.data.length,
                    completed: c.data.length
                });
            } catch (error) {
                console.error("통계 조회 실패", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
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
                <div style={{...cardStyle, borderLeft: '6px solid #f59e0b'}} onClick={() => navigate('/pharmacist/rooms')}>
                    <div style={cardLabelStyle}>🔔 대기 중</div>
                    <div style={cardValueStyle}>{stats.pending}건</div>
                    <div style={cardActionStyle}>수락하러 가기 〉</div>
                </div>

                <div style={{...cardStyle, borderLeft: '6px solid #10b981'}} onClick={() => navigate('/pharmacist/rooms')}>
                    <div style={cardLabelStyle}>💬 진행 중</div>
                    <div style={cardValueStyle}>{stats.active}건</div>
                    <div style={cardActionStyle}>채팅방 입장하기 〉</div>
                </div>

                <div style={{...cardStyle, borderLeft: '6px solid #64748b'}} onClick={() => navigate('/pharmacist/rooms')}>
                    <div style={cardLabelStyle}>✅ 상담 완료</div>
                    <div style={cardValueStyle}>{stats.completed}건</div>
                    <div style={cardActionStyle}>전체 내역 보기 〉</div>
                </div>
            </div>

            <div style={{marginTop: '40px'}}>
                <h2 style={sectionTitleStyle}>업무 도구</h2>
                <div style={menuListStyle}>
                    <button style={menuButtonStyle} onClick={() => navigate('/pharmacist/rooms')}>
                        <span style={menuIconStyle}>📱</span>
                        <div style={menuContentStyle}>
                            <div style={menuTitleStyle}>상담 관리 센터</div>
                            <div style={menuDescStyle}>실시간 환자 상담 및 매칭을 관리합니다.</div>
                        </div>
                    </button>
                    
                    <button style={menuButtonStyle} onClick={() => alert('프로필 관리 페이지는 준비 중입니다.')}>
                        <span style={menuIconStyle}>⚙️</span>
                        <div style={menuContentStyle}>
                            <div style={menuTitleStyle}>내 면허/약국 정보</div>
                            <div style={menuDescStyle}>소속 약국 및 인증 상태를 확인합니다.</div>
                        </div>
                    </button>
                </div>
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
const sectionTitleStyle = { fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '20px' };
const menuListStyle = { display: 'flex', flexDirection: 'column', gap: '12px' };
const menuButtonStyle = { display: 'flex', alignItems: 'center', width: '100%', padding: '24px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', textAlign: 'left', cursor: 'pointer', gap: '20px' };
const menuIconStyle = { fontSize: '28px', backgroundColor: '#f1f5f9', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px' };
const menuContentStyle = { flex: 1 };
const menuTitleStyle = { fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' };
const menuDescStyle = { fontSize: '14px', color: '#64748b' };

export default PharmacistDashboard;
