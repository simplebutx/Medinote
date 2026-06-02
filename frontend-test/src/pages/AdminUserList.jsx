import React, { useState, useEffect } from 'react';
import api, { getAuthSession } from '../api';

const AdminUserList = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('USER'); 
    const [expandedUserId, setExpandedUserId] = useState(null); // 확장된 행 ID
    const session = getAuthSession();

    useEffect(() => {
        const fetchAllUsers = async () => {
            setLoading(true);
            try {
                const res = await api.get('/admin/users');
                // 관리자 본인은 목록에서 제외
                const filteredUsers = res.data.filter(u => u.role !== 'ADMIN' && u.role !== 'ROLE_ADMIN');
                setUsers(filteredUsers);
            } catch (error) {
                console.error("전체 회원 조회 실패:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllUsers();
    }, []);

    // 행 클릭 시 확장/축소 토글
    const toggleExpand = (userId) => {
        setExpandedUserId(expandedUserId === userId ? null : userId);
    };

    // 회원 삭제 (탈퇴) 처리
    const handleDeleteUser = async (e, userId, username) => {
        e.stopPropagation(); // 행 클릭(상세보기) 방지
        if (!window.confirm(`${username} 회원을 탈퇴 처리하시겠습니까? 모든 정보가 삭제됩니다.`)) return;

        try {
            await api.delete(`/admin/users/${userId}`);
            alert("회원이 정상적으로 삭제되었습니다.");
            setUsers(users.filter(u => u.id !== userId));
            if (expandedUserId === userId) setExpandedUserId(null);
        } catch (error) {
            console.error("회원 삭제 실패:", error);
            alert("삭제 처리에 실패했습니다.");
        }
    };

    // 상태 라벨 변환
    const getStatusLabel = (status) => {
        const labels = {
            'ACTIVE': '🟢 승인 완료',
            'WAITING_APPROVAL': '🟠 승인 전',
            'REJECTED': '🔴 반려됨',
            'PENDING': '⚪ 가입 중'
        };
        return labels[status] || status;
    };

    // 현재 탭에 따른 필터링
    const currentUsers = users.filter(u => {
        if (activeTab === 'USER') return u.role === 'USER' || u.role === 'ROLE_USER';
        if (activeTab === 'PHARMACIST') return u.role === 'PHARMACIST' || u.role === 'ROLE_PHARMACIST';
        return false;
    });

    if (loading) return <div className="app-page"><p style={{color:'#64748b'}}>회원 데이터를 불러오는 중...</p></div>;

    return (
        <div className="app-page">
            <div className="app-page-header">
                <p className="app-page-eyebrow">User Management</p>
                <h1 className="app-page-title">전체 회원 관리</h1>
                <p className="app-page-description">서비스에 가입된 모든 사용자 정보를 역할별로 확인하고 관리합니다.</p>
            </div>

            {/* 탭 메뉴 */}
            <div className="chat-tab-row" style={{ marginTop: '24px' }}>
                <button 
                    className={activeTab === 'USER' ? 'chat-tab-button active' : 'chat-tab-button'}
                    onClick={() => { setActiveTab('USER'); setExpandedUserId(null); }}
                >
                    일반 유저 ({users.filter(u => u.role.includes('USER')).length})
                </button>
                <button 
                    className={activeTab === 'PHARMACIST' ? 'chat-tab-button active' : 'chat-tab-button'}
                    onClick={() => { setActiveTab('PHARMACIST'); setExpandedUserId(null); }}
                >
                    전문 약사 ({users.filter(u => u.role.includes('PHARMACIST')).length})
                </button>
            </div>

            {/* 가로형 테이블 리스트 */}
            <div style={tableContainerStyle}>
                <div style={tableHeaderStyle}>
                    <div style={{ flex: 0.5 }}>UID</div>
                    <div style={{ flex: 1.5 }}>이름</div>
                    <div style={{ flex: 2 }}>이메일</div>
                    <div style={{ flex: 1 }}>성별</div>
                    <div style={{ flex: 1.5 }}>생년월일</div>
                    {activeTab === 'USER' && <div style={{ flex: 1, textAlign: 'center' }}>관리</div>}
                    {activeTab === 'PHARMACIST' && <div style={{ flex: 1.5 }}>상태</div>}
                </div>

                {currentUsers.length === 0 ? (
                    <div style={emptyTextStyle}>해당하는 회원이 없습니다.</div>
                ) : (
                    currentUsers.map(user => (
                        <React.Fragment key={user.id}>
                            <div 
                                style={{
                                    ...tableRowStyle, 
                                    cursor: 'pointer',
                                    background: expandedUserId === user.id ? '#f8fafc' : '#fff'
                                }} 
                                onClick={() => toggleExpand(user.id)}
                            >
                                <div style={{ flex: 0.5, color: '#94a3b8', fontSize: '14px' }}>{user.id}</div>
                                <div style={{ flex: 1.5, fontWeight: '700', color: '#1e293b' }}>{user.username}</div>
                                <div style={{ flex: 2, fontSize: '14px', color: '#64748b' }}>{user.email}</div>
                                <div style={{ flex: 1, fontSize: '15px' }}>
                                    {user.gender === 'MALE' ? '남성' : '여성'}
                                </div>
                                <div style={{ flex: 1.5, fontSize: '14px', color: '#334155' }}>
                                    {user.birthDate || '-'}
                                </div>
                                {activeTab === 'USER' && (
                                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                                        <button 
                                            onClick={(e) => handleDeleteUser(e, user.id, user.username)}
                                            style={smallDeleteBtnStyle}
                                        >
                                            탈퇴
                                        </button>
                                    </div>
                                )}
                                {activeTab === 'PHARMACIST' && (
                                    <div style={{ flex: 1.5, fontWeight: '700', fontSize: '13px' }}>
                                        {getStatusLabel(user.status)}
                                    </div>
                                )}
                            </div>
                            
                            {/* 확장 영역: 추가 정보 및 질병 */}
                            {expandedUserId === user.id && (
                                <div style={expandedAreaStyle}>
                                    <div style={detailGridStyle}>
                                        <div>
                                            <div style={detailLabelStyle}>건강 정보 (Health Status)</div>
                                            <div style={badgeRowStyle}>
                                                <span style={user.isPregnant ? activeBadgeStyle : inactiveBadgeStyle}>임신: {user.isPregnant ? 'Y' : 'N'}</span>
                                                <span style={user.isBreastfeeding ? activeBadgeStyle : inactiveBadgeStyle}>수유: {user.isBreastfeeding ? 'Y' : 'N'}</span>
                                                <span style={user.isSmoking ? activeBadgeStyle : inactiveBadgeStyle}>흡연: {user.isSmoking ? 'Y' : 'N'}</span>
                                                <span style={user.isDrinking ? activeBadgeStyle : inactiveBadgeStyle}>음주: {user.isDrinking ? 'Y' : 'N'}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div style={detailLabelStyle}>등록된 질병 (Chronic Diseases)</div>
                                            <div style={diseaseBoxStyle}>
                                                {user.chronicDiseases && user.chronicDiseases.length > 0 ? (
                                                    user.chronicDiseases.map((d, i) => (
                                                        <span key={i} style={diseaseTagStyle}>{d}</span>
                                                    ))
                                                ) : (
                                                    <span style={{color: '#94a3b8', fontSize: '13px'}}>등록된 질병 정보가 없습니다.</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{marginTop: '15px', fontSize: '12px', color: '#94a3b8'}}>
                                        가입 일자: {user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    ))
                )}
            </div>
        </div>
    );
};

// --- Styles ---
const tableContainerStyle = { background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', marginTop: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' };
const tableHeaderStyle = { display: 'flex', padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px', fontWeight: '800' };
const tableRowStyle = { display: 'flex', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s' };
const emptyTextStyle = { padding: '80px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '16px' };
const smallDeleteBtnStyle = { padding: '4px 10px', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fff', color: '#dc2626', fontSize: '12px', fontWeight: '700', cursor: 'pointer' };

const expandedAreaStyle = { padding: '24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', animation: 'fadeIn 0.3s ease' };
const detailGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '40px' };
const detailLabelStyle = { fontSize: '13px', fontWeight: '800', color: '#1e293b', marginBottom: '12px', textTransform: 'uppercase' };
const badgeRowStyle = { display: 'flex', gap: '8px', flexWrap: 'wrap' };
const baseBadgeStyle = { padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' };
const activeBadgeStyle = { ...baseBadgeStyle, background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' };
const inactiveBadgeStyle = { ...baseBadgeStyle, background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' };
const diseaseBoxStyle = { display: 'flex', gap: '8px', flexWrap: 'wrap' };
const diseaseTagStyle = { background: '#fff', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', color: '#334155' };

export default AdminUserList;
