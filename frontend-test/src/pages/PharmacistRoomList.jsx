import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getAuthSession } from '../api';

const PharmacistRoomList = () => {
    const [pendingRooms, setPendingRooms] = useState([]);
    const [activeRooms, setActiveRooms] = useState([]);
    const [completedRooms, setCompletedRooms] = useState([]);
    const [activeTab, setActiveTab] = useState('pending'); // pending, matched, completed
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const session = getAuthSession();

    const fetchRooms = async () => {
        if (!session) return;
        setLoading(true);
        try {
            const [p, a, c] = await Promise.all([
                axios.get('http://localhost:8082/app/consult/rooms/pending', { headers: { Authorization: `Bearer ${session.accessToken}` } }),
                axios.get('http://localhost:8082/app/consult/rooms/active', { headers: { Authorization: `Bearer ${session.accessToken}` } }),
                axios.get('http://localhost:8082/app/consult/rooms/completed', { headers: { Authorization: `Bearer ${session.accessToken}` } })
            ]);
            setPendingRooms(p.data);
            setActiveRooms(a.data);
            setCompletedRooms(c.data);
        } catch (error) {
            console.error("방 목록 조회 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
        const interval = setInterval(fetchRooms, 10000); // 10초마다 자동 갱신
        return () => clearInterval(interval);
    }, []);

    const handleAccept = async (roomId) => {
        try {
            await axios.post(`http://localhost:8082/app/consult/room/${roomId}/match`, {}, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            alert("상담을 수락했습니다.");
            navigate('/p/consultation', { state: { initialRoomId: roomId } });
        } catch (error) {
            alert("수락 실패: " + (error.response?.data || error.message));
        }
    };

    const handleClose = async (roomId) => {
        if (!window.confirm("상담을 종료하시겠습니까?")) return;
        try {
            await axios.patch(`http://localhost:8082/app/consult/room/${roomId}/close`, {}, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            fetchRooms();
        } catch (error) {
            alert("종료 실패");
        }
    };

    const renderRoomCard = (room, type) => (
        <div key={room.roomId} style={roomCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={roomIdBadgeStyle}>#{room.roomId}</span>
                        <span style={timeLabelStyle}>{new Date(room.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 신청</span>
                    </div>
                    
                    <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '10px', color: '#1e293b' }}>
                        {room.customerName || "익명"} 환자님
                    </div>

                    {/* 첫 번째 메시지 미리보기 표시 */}
                    <div style={messagePreviewBoxStyle}>
                        <p style={messagePreviewTextStyle}>
                            {room.firstMessage || "상담 요청 메시지가 없습니다."}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginLeft: '20px' }}>
                    {type === 'pending' && (
                        <button onClick={() => handleAccept(room.roomId)} style={acceptButtonStyle}>상담 수락</button>
                    )}
                    {type === 'matched' && (
                        <>
                            <button onClick={() => navigate('/p/consultation', { state: { initialRoomId: room.roomId } })} style={enterButtonStyle}>입장</button>
                            <button onClick={() => handleClose(room.roomId)} style={closeButtonStyle}>종료</button>
                        </>
                    )}
                    {type === 'completed' && (
                        <button onClick={() => navigate('/p/consultation', { state: { initialRoomId: room.roomId } })} style={viewButtonStyle}>기록 확인</button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ maxWidth: '900px' }}>
            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b' }}>상담 관리 센터</h1>
                <p style={{ color: '#64748b' }}>실시간 상담 요청 및 관리 현황입니다.</p>
            </div>

            {/* 탭 전환 */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
                <button onClick={() => setActiveTab('pending')} style={activeTab === 'pending' ? activeTabBtnStyle : tabBtnStyle}>
                    수락 대기 {pendingRooms.length > 0 && <span style={countBadgeStyle}>{pendingRooms.length}</span>}
                </button>
                <button onClick={() => setActiveTab('matched')} style={activeTab === 'matched' ? activeTabBtnStyle : tabBtnStyle}>
                    상담 중 {activeRooms.length > 0 && <span style={countBadgeStyle}>{activeRooms.length}</span>}
                </button>
                <button onClick={() => setActiveTab('completed')} style={activeTab === 'completed' ? activeTabBtnStyle : tabBtnStyle}>
                    종료된 상담
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {loading && <p style={{ textAlign: 'center', color: '#64748b' }}>데이터를 불러오는 중...</p>}
                
                {!loading && activeTab === 'pending' && (
                    pendingRooms.length > 0 ? pendingRooms.map(r => renderRoomCard(r, 'pending')) : <div style={emptyStateStyle}>현재 대기 중인 상담이 없습니다.</div>
                )}
                {!loading && activeTab === 'matched' && (
                    activeRooms.length > 0 ? activeRooms.map(r => renderRoomCard(r, 'matched')) : <div style={emptyStateStyle}>현재 진행 중인 상담이 없습니다.</div>
                )}
                {!loading && activeTab === 'completed' && (
                    completedRooms.length > 0 ? completedRooms.map(r => renderRoomCard(r, 'completed')) : <div style={emptyStateStyle}>완료된 상담 내역이 없습니다.</div>
                )}
            </div>
        </div>
    );
};

// --- Styles ---
const roomCardStyle = { padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', transition: 'all 0.2s' };
const roomIdBadgeStyle = { background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', color: '#475569' };
const timeLabelStyle = { fontSize: '13px', color: '#94a3b8' };
const messagePreviewBoxStyle = { marginTop: '5px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' };
const messagePreviewTextStyle = { margin: 0, fontSize: '15px', color: '#334155', lineHeight: '1.6', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxDirection: 'vertical' };

const tabBtnStyle = { padding: '12px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: '700', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' };
const activeTabBtnStyle = { ...tabBtnStyle, background: '#065f46', color: '#fff', border: 'none' };
const countBadgeStyle = { background: '#ef4444', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '20px' };

const acceptButtonStyle = { padding: '12px 24px', borderRadius: '10px', background: '#065f46', color: '#fff', border: 'none', fontWeight: '800', cursor: 'pointer', minWidth: '100px' };
const enterButtonStyle = { padding: '10px 20px', borderRadius: '8px', background: '#10b981', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' };
const closeButtonStyle = { padding: '10px 20px', borderRadius: '8px', background: '#fff', color: '#ef4444', border: '1px solid #fee2e2', fontWeight: 'bold', cursor: 'pointer' };
const viewButtonStyle = { padding: '10px 20px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 'bold', cursor: 'pointer' };

const emptyStateStyle = { padding: '80px 20px', textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: '16px', border: '2px dashed #f1f5f9' };

export default PharmacistRoomList;
