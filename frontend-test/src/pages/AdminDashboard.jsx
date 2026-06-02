import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { getAuthSession } from '../api';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const session = getAuthSession();
    const [stats, setStats] = useState({ pendingPharmacists: 0, totalUsers: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session || (session.role !== 'ADMIN' && session.role !== 'ROLE_ADMIN')) {
            alert('관리자 전용 페이지입니다.');
            navigate('/login');
            return;
        }

        const fetchStats = async () => {
            try {
                const res = await api.get('/admin/pharmacists/pending');
                setStats({
                    pendingPharmacists: res.data.length,
                    totalUsers: 0 // 전체 유저 조회 API 생기면 연결
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
                    <h1 style={titleStyle}>⚙️ 시스템 관리자 대시보드</h1>
                    <p style={welcomeStyle}>환영합니다, <strong>{session?.email}</strong> 관리자님.</p>
                </div>
            </div>

            <div style={gridStyle}>
                <div style={{...cardStyle, borderLeft: '6px solid #ef4444'}} onClick={() => navigate('/a/approvals')}>
                    <div style={cardLabelStyle}>🚨 승인 대기 약사</div>
                    <div style={cardValueStyle}>{stats.pendingPharmacists}명</div>
                    <div style={cardActionStyle}>지금 검토하기 〉</div>
                </div>

                <div style={{...cardStyle, borderLeft: '6px solid #3b82f6'}} onClick={() => alert('준비중')}>
                    <div style={cardLabelStyle}>👥 전체 회원</div>
                    <div style={cardValueStyle}>- 명</div>
                    <div style={cardActionStyle}>목록 보기 〉</div>
                </div>

                <div style={{...cardStyle, borderLeft: '6px solid #10b981'}} onClick={() => navigate('/a/sync')}>
                    <div style={cardLabelStyle}>🔄 데이터 상태</div>
                    <div style={cardValueStyle}>정상</div>
                    <div style={cardActionStyle}>동기화 관리 〉</div>
                </div>
            </div>

            <div style={{marginTop: '40px'}}>
                <h2 style={sectionTitleStyle}>바로가기</h2>
                <div style={menuListStyle}>
                    <button style={menuButtonStyle} onClick={() => navigate('/a/approvals')}>
                        <span style={menuIconStyle}>📋</span>
                        <div style={menuContentStyle}>
                            <div style={menuTitleStyle}>약사 가입 승인 관리</div>
                            <div style={menuDescStyle}>신규 약사들의 면허증을 확인하고 가입을 승인합니다.</div>
                        </div>
                    </button>
                    
                    <button style={menuButtonStyle} onClick={() => navigate('/a/sync')}>
                        <span style={menuIconStyle}>💾</span>
                        <div style={menuContentStyle}>
                            <div style={menuTitleStyle}>약물 데이터 동기화</div>
                            <div style={menuDescStyle}>공공 데이터 포털의 약물 정보를 최신화합니다.</div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Styles ---
const containerStyle = { maxWidth: '1000px', margin: '20px auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' };
const titleStyle = { fontSize: '32px', fontWeight: '800', color: '#111827', marginBottom: '8px' };
const welcomeStyle = { color: '#6b7280', fontSize: '16px' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' };
const cardStyle = { backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', cursor: 'pointer' };
const cardLabelStyle = { fontSize: '14px', fontWeight: '700', color: '#6b7280', marginBottom: '12px' };
const cardValueStyle = { fontSize: '36px', fontWeight: '800', color: '#111827', marginBottom: '8px' };
const cardActionStyle = { fontSize: '13px', color: '#3b82f6', fontWeight: '600' };
const sectionTitleStyle = { fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '20px' };
const menuListStyle = { display: 'flex', flexDirection: 'column', gap: '12px' };
const menuButtonStyle = { display: 'flex', alignItems: 'center', width: '100%', padding: '24px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', textAlign: 'left', cursor: 'pointer', gap: '20px' };
const menuIconStyle = { fontSize: '28px', backgroundColor: '#f3f4f6', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px' };
const menuContentStyle = { flex: 1 };
const menuTitleStyle = { fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '4px' };
const menuDescStyle = { fontSize: '14px', color: '#6b7280' };

export default AdminDashboard;
