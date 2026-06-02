import React, { useState, useEffect } from 'react';
import api, { getAuthSession } from '../api';

const AdminPharmacistList = () => {
    const [pendingPharmacists, setPendingPharmacists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);
    const session = getAuthSession();

    const fetchPendingList = async () => {
        if (!session) return;
        setLoading(true);
        try {
            const res = await api.get('/admin/pharmacists/pending');
            setPendingPharmacists(res.data);
        } catch (error) {
            console.error("승인 대기 목록 조회 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingList();
    }, []);

    const handleApprove = async (userId) => {
        if (!window.confirm("이 약사를 승인하시겠습니까?")) return;
        try {
            await api.post(`/admin/pharmacists/${userId}/approve`);
            alert("승인 완료되었습니다.");
            fetchPendingList();
        } catch (error) {
            alert("승인 처리 실패");
        }
    };

    const handleReject = async (userId) => {
        if (!window.confirm("이 약사를 거절하시겠습니까? 인증 정보가 초기화됩니다.")) return;
        try {
            await api.post(`/admin/pharmacists/${userId}/reject`);
            alert("거절 처리되었습니다.");
            fetchPendingList();
        } catch (error) {
            alert("거절 처리 실패");
        }
    };

    if (loading) return <div style={{ padding: '40px', color: '#64748b' }}>데이터를 불러오는 중...</div>;

    return (
        <div style={{ maxWidth: '1200px' }}>
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#1f2937' }}>약사 가입 승인 관리</h1>
                <p style={{ color: '#6b7280' }}>신규 약사 회원의 면허 정보를 검토하고 승인 여부를 결정합니다.</p>
            </div>

            {pendingPharmacists.length === 0 ? (
                <div style={emptyStateStyle}>현재 승인 대기 중인 약사가 없습니다.</div>
            ) : (
                <div style={listContainerStyle}>
                    {/* 헤더 행 */}
                    <div style={listHeaderStyle}>
                        <div style={{ flex: 0.5 }}>UID</div>
                        <div style={{ flex: 1.5 }}>약사 정보</div>
                        <div style={{ flex: 1.5 }}>소속 약국</div>
                        <div style={{ flex: 1.5 }}>면허 번호</div>
                        <div style={{ flex: 1 }}>면허증</div>
                        <div style={{ flex: 1.5, textAlign: 'center' }}>관리</div>
                    </div>

                    {/* 데이터 행 */}
                    {pendingPharmacists.map((pharma) => (
                        <div key={pharma.userId} style={rowStyle}>
                            <div style={{ flex: 0.5, color: '#9ca3af', fontSize: '14px' }}>{pharma.userId}</div>
                            
                            <div style={{ flex: 1.5 }}>
                                <div style={{ fontWeight: '700', color: '#111827' }}>{pharma.username}</div>
                                <div style={{ fontSize: '13px', color: '#6b7280' }}>{pharma.email}</div>
                            </div>

                            <div style={{ flex: 1.5, fontWeight: '600', color: '#374151' }}>
                                {pharma.docNumber}
                            </div>

                            <div style={{ flex: 1.5, fontFamily: 'monospace', color: '#059669', fontWeight: '600' }}>
                                {pharma.licenseNumber}
                            </div>

                            <div style={{ flex: 1 }}>
                                <button 
                                    onClick={() => setSelectedImage(pharma.licenseImage)}
                                    style={viewImageBtnStyle}
                                >
                                    보기
                                </button>
                            </div>

                            <div style={{ flex: 1.5, display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button onClick={() => handleApprove(pharma.userId)} style={smallApproveBtnStyle}>승인</button>
                                <button onClick={() => handleReject(pharma.userId)} style={smallRejectBtnStyle}>거절</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 이미지 확대 모달 */}
            {selectedImage && (
                <div style={modalOverlayStyle} onClick={() => setSelectedImage(null)}>
                    <div style={modalContentStyle}>
                        <div style={{ textAlign: 'right', marginBottom: '10px' }}>
                            <button style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <img src={selectedImage} alt="Full License" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} />
                        <p style={{ color: '#e5e7eb', marginTop: '20px', textAlign: 'center', fontWeight: '500' }}>클릭하여 닫기</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Styles ---
const listContainerStyle = { backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' };
const listHeaderStyle = { display: 'flex', padding: '16px 24px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' };
const rowStyle = { display: 'flex', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.2s' };
const viewImageBtnStyle = { padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#fff', color: '#374151', fontSize: '13px', fontWeight: '600', cursor: 'pointer' };
const smallApproveBtnStyle = { padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer' };
const smallRejectBtnStyle = { padding: '8px 16px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fff', color: '#ef4444', fontSize: '14px', fontWeight: '700', cursor: 'pointer' };
const emptyStateStyle = { padding: '100px 20px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '24px', border: '2px dashed #e5e7eb', color: '#6b7280', fontSize: '18px' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '40px' };
const modalContentStyle = { maxWidth: '1000px', width: '100%', display: 'flex', flexDirection: 'column' };

export default AdminPharmacistList;
