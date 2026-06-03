import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import axios from 'axios';
import { getAuthSession } from '../api';

const Consultation = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const session = getAuthSession();
    const initialRoomId = location.state?.initialRoomId;
    const initialMessage = location.state?.initialMessage;

    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [roomId, setRoomId] = useState(initialRoomId || '');
    const [senderName, setSenderName] = useState(session?.username || '사용자');
    const [senderId, setSenderId] = useState(session?.userId || '');
    const [senderType, setSenderType] = useState(session?.role || 'USER');
    const [connected, setIsConnected] = useState(false);
    const [patientInfo, setPatientInfo] = useState(null);
    
    // 웹소켓 중복 연결 및 구독 방지를 위한 Refs
    const stompClientRef = useRef(null);
    const subscriptionRef = useRef(null);
    const isConnectingRef = useRef(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // 마운트 시 자동 연결 시도 및 언마운트 시 클린업
    useEffect(() => {
        if (initialRoomId && session && !connected) {
            connect(initialRoomId);
        }
        if (initialRoomId && (session?.role === 'PHARMACIST' || session?.role === 'ROLE_PHARMACIST')) {
            fetchPatientInfo(initialRoomId);
        }
        return () => {
            disconnect();
        };
    }, [initialRoomId]);

    const fetchPatientInfo = async (targetRoomId) => {
        try {
            const res = await axios.get(`http://localhost:8082/app/consult/room/${targetRoomId}/patient-info`, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            setPatientInfo(res.data);
        } catch (error) {
            console.error("환자 정보 조회 실패:", error);
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const connect = async (targetRoomId = roomId) => {
        // 이미 연결 중이거나 연결된 상태라면 중복 연결 방지
        if (isConnectingRef.current || connected) return;
        
        if (!targetRoomId && senderType !== 'USER') {
            alert("방 번호를 입력해주세요.");
            return;
        }

        isConnectingRef.current = true;
        let finalRoomId = targetRoomId;

        // 1. 일반 유저가 신규 상담 신청하는 경우 방 자동 생성
        if (senderType === 'USER' && !initialRoomId && !roomId) {
            try {
                const createRes = await axios.post('http://localhost:8082/app/consult/room', {}, {
                    headers: { Authorization: `Bearer ${session.accessToken}` }
                });
                finalRoomId = createRes.data.toString();
                setRoomId(finalRoomId);
            } catch (error) {
                console.error("방 생성 실패:", error);
                alert("상담방 생성에 실패했습니다.");
                isConnectingRef.current = false;
                return;
            }
        }

        // 2. 과거 대화 내역 불러오기
        try {
            const res = await axios.get(`http://localhost:8082/app/consult/room/${finalRoomId}/messages`);
            setMessages(res.data || []);
        } catch (error) {
            console.error("과거 대화 내역 불러오기 실패:", error);
        }

        // 3. 웹소켓 연결
        const socket = new SockJS('http://localhost:8082/api/ws-stomp');
        const stompClient = Stomp.over(socket);
        stompClient.debug = null; // 콘솔 로그 깔끔하게 유지

        stompClient.connect({}, (frame) => {
            setIsConnected(true);
            isConnectingRef.current = false;

            // 이전 구독이 있다면 안전하게 해제
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
            }

            subscriptionRef.current = stompClient.subscribe(`/topic/room/${finalRoomId}`, (sdkEvent) => {
                onMessageReceived(sdkEvent);
            });

            // 입장 알림 전송
            stompClient.send("/app/consult/message", {}, JSON.stringify({
                type: 'ENTER',
                roomId: finalRoomId,
                senderId: parseInt(session?.userId || senderId),
                senderType: senderType,
                senderName: senderName,
                message: ''
            }));

            // 첫 메시지가 있으면 자동으로 전송
            if (initialMessage) {
                stompClient.send("/app/consult/message", {}, JSON.stringify({
                    type: 'TALK',
                    roomId: finalRoomId,
                    senderId: parseInt(session?.userId || senderId),
                    senderType: senderType,
                    senderName: senderName,
                    message: initialMessage
                }));
            }
        }, (error) => {
            console.error('WebSocket Connection Error: ' + error);
            setIsConnected(false);
            isConnectingRef.current = false;
        });

        stompClientRef.current = stompClient;
    };

    const disconnect = () => {
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
        }
        if (stompClientRef.current !== null) {
            try {
                stompClientRef.current.disconnect();
            } catch (e) {}
            stompClientRef.current = null;
        }
        setIsConnected(false);
        isConnectingRef.current = false;
    };

    const onMessageReceived = (payload) => {
        const message = JSON.parse(payload.body);
        setMessages((prev) => {
            // 중복 메시지 방지 로직 (ID 또는 내용+시간 기반)
            const isDuplicate = prev.some(msg => 
                (msg.messageId && message.messageId && msg.messageId === message.messageId) ||
                ((msg.content || msg.message) === (message.content || message.message) && 
                 msg.senderId === message.senderId && 
                 Math.abs(new Date(msg.createdAt).getTime() - new Date().getTime()) < 1000)
            );
            if (isDuplicate) return prev;
            return [...prev, message];
        });
    };

    const sendMessage = () => {
        const currentSession = getAuthSession();
        const finalUserId = currentSession?.userId || currentSession?.id || senderId;

        if (stompClientRef.current && stompClientRef.current.connected && messageInput.trim()) {
            const chatMessage = {
                type: 'TALK',
                roomId: roomId,
                senderId: parseInt(finalUserId),
                senderType: currentSession?.role || senderType,
                senderName: currentSession?.username || senderName,
                message: messageInput
            };
            stompClientRef.current.send("/app/consult/message", {}, JSON.stringify(chatMessage));
            setMessageInput('');
        }
    };

    return (
        <div style={pcContainerStyle}>
            <div style={headerStyle}>
                <div style={titleAreaStyle}>
                    <button onClick={() => navigate(-1)} style={backButtonStyle}>〈 뒤로</button>
                    <div style={{textAlign:'center', flex:1}}>
                        <div style={roomTitleStyle}>실시간 상담방 {roomId || '신규'}</div>
                        <div style={statusTextStyle}>{connected ? '● 온라인' : '○ 오프라인'}</div>
                    </div>
                    <div style={{width:'60px'}}></div>
                </div>
            </div>

            <div style={chatBodyStyle}>
                {(senderType === 'PHARMACIST' || senderType === 'ROLE_PHARMACIST') && patientInfo && (
                    <div style={patientInfoBoxStyle}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                            <strong style={{fontSize:'16px', color:'#065f46'}}>📋 환자 상세 정보</strong>
                            <span style={{fontSize:'12px', color:'#64748b'}}>Room ID: {roomId}</span>
                        </div>
                        <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'8px', fontSize:'14px'}}>
                            <div><span style={labelDimStyle}>성함:</span> {patientInfo.username}</div>
                            <div><span style={labelDimStyle}>나이/성별:</span> {patientInfo.age}세 / {patientInfo.gender === 'MALE' ? '남성' : '여성'}</div>
                            <div><span style={labelDimStyle}>흡연/음주:</span> {patientInfo.isSmoking ? 'Y' : 'N'} / {patientInfo.isDrinking ? 'Y' : 'N'}</div>
                            <div><span style={labelDimStyle}>임신/수유:</span> {patientInfo.isPregnant ? 'Y' : 'N'} / {patientInfo.isBreastfeeding ? 'Y' : 'N'}</div>
                        </div>
                        {patientInfo.chronicDiseases && patientInfo.chronicDiseases.length > 0 && (
                            <div style={{marginTop:'8px', fontSize:'13px', borderTop:'1px dashed #cbd5e1', paddingTop:'8px'}}>
                                <span style={labelDimStyle}>기저질환:</span> {patientInfo.chronicDiseases.join(', ')}
                            </div>
                        )}
                    </div>
                )}
                {!connected ? (
                    <div style={loginOverlayStyle}>
                        <div style={loginBoxStyle}>
                            <h2 style={{marginBottom:'30px', textAlign:'center'}}>상담 시작하기</h2>
                            <div style={{marginBottom:'15px'}}>
                                <label style={inputLabelStyle}>닉네임</label>
                                <input style={loginInputStyle} type="text" value={senderName} readOnly />
                            </div>
                            <div style={{marginBottom:'30px'}}>
                                <label style={inputLabelStyle}>방 번호</label>
                                <input 
                                    style={loginInputStyle}
                                    type="text" 
                                    placeholder={senderType === 'USER' ? "새 상담 시작 (자동생성)" : "접속할 방 번호 입력"} 
                                    value={roomId} 
                                    onChange={(e) => setRoomId(e.target.value)} 
                                    readOnly={senderType === 'USER' && !roomId}
                                />
                            </div>
                            <button onClick={() => connect()} style={connectButtonStyle}>
                                {senderType === 'USER' && !roomId ? '새 상담 신청하기' : '상담 연결하기'}
                            </button>
                            <div style={{marginTop:'20px', textAlign:'center'}}>
                                <Link to={senderType === 'PHARMACIST' ? "/pharmacist/rooms" : "/my/consultations"} style={{color:'#007AFF', fontSize:'14px', textDecoration:'none', fontWeight:'600'}}>
                                    {senderType === 'PHARMACIST' ? "대기 목록으로 돌아가기" : "내 상담 내역 확인하기"}
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={messageListStyle}>
                        {messages.map((msg, index) => {
                            const currentSession = getAuthSession();
                            const myId = parseInt(currentSession?.userId || currentSession?.id || senderId);
                            const myRole = currentSession?.role || senderType;
                            
                            const isMe = msg.senderId === myId && msg.senderType === myRole;
                            const isSystem = msg.type === 'ENTER';

                            if (isSystem) return <div key={index} style={systemMessageStyle}>{msg.message}</div>;

                            return (
                                <div key={index} style={{...messageRowStyle, justifyContent: isMe ? 'flex-end' : 'flex-start'}}>
                                    {!isMe && <div style={avatarStyle}>{msg.senderName?.[0] || '익'}</div>}
                                    <div style={{
                                        ...bubbleStyle,
                                        backgroundColor: isMe ? '#007AFF' : '#F2F2F7',
                                        color: isMe ? 'white' : 'black',
                                        borderRadius: isMe ? '18px 18px 2px 18px' : '18px 18px 18px 2px'
                                    }}>
                                        {!isMe && <div style={senderNameStyle}>{msg.senderName} {msg.senderType === 'PHARMACIST' && '🩺'}</div>}
                                        {msg.content || msg.message}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {connected && (
                <div style={inputContainerWrapperStyle}>
                    <div style={inputContainerStyle}>
                        <div style={plusButtonStyle}>+</div>
                        <input 
                            type="text" 
                            style={pcInputStyle} 
                            value={messageInput} 
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.nativeEvent.isComposing) return;
                                if (e.key === 'Enter') sendMessage();
                            }}
                            placeholder="메시지를 입력하세요..."
                        />
                        <button onClick={sendMessage} style={sendButtonStyle}>전송</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 스타일 가이드 ---
const pcContainerStyle = {
    width: '100%', maxWidth: '1000px', height: '90vh', margin: '20px auto',
    backgroundColor: '#fff', display: 'flex', flexDirection: 'column',
    overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
    borderRadius: '16px', border: '1px solid #eee', position: 'relative',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
};

const headerStyle = { padding: '20px 24px', backgroundColor: 'rgba(255, 255, 255, 0.9)', borderBottom: '1px solid #f2f2f7', backdropFilter: 'blur(20px)', zIndex: 5 };
const titleAreaStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const roomTitleStyle = { fontSize: '20px', fontWeight: '700', color: '#1c1c1e', marginBottom: '4px' };
const statusTextStyle = { fontSize: '13px', color: '#8e8e93', fontWeight: '500' };
const backButtonStyle = { border: 'none', background: 'none', color: '#007AFF', fontSize: '16px', fontWeight: '600', cursor: 'pointer', width: '60px' };
const chatBodyStyle = { flex: 1, overflowY: 'auto', backgroundColor: '#fff', position: 'relative' };
const loginOverlayStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 };
const loginBoxStyle = { width: '400px', padding: '40px', backgroundColor: '#fff', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' };
const inputLabelStyle = { display: 'block', fontSize: '14px', fontWeight: '600', color: '#8e8e93', marginBottom: '8px', marginLeft: '4px' };
const loginInputStyle = { width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e5e5ea', fontSize: '16px', boxSizing: 'border-box', outline: 'none', backgroundColor: '#f2f2f7' };
const connectButtonStyle = { width: '100%', padding: '16px', backgroundColor: '#007AFF', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '17px', fontWeight: '700', cursor: 'pointer' };
const messageListStyle = { padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' };
const messageRowStyle = { display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '4px' };
const bubbleStyle = { maxWidth: '65%', padding: '12px 18px', fontSize: '16px', lineHeight: '1.5', position: 'relative', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' };
const senderNameStyle = { fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#8e8e93' };
const systemMessageStyle = { textAlign: 'center', fontSize: '13px', color: '#8e8e93', margin: '20px 0', fontWeight: '500' };
const avatarStyle = { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '700', color: '#fff', opacity: 0.8 };

const patientInfoBoxStyle = {
    padding: '16px 20px',
    backgroundColor: '#f0fdf4',
    borderBottom: '1px solid #dcfce7',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
};

const labelDimStyle = { color: '#64748b', fontWeight: '500', marginRight: '4px' };

const inputContainerWrapperStyle = { padding: '16px 24px 30px', backgroundColor: 'rgba(255,255,255,0.9)', borderTop: '1px solid #f2f2f7' };
const inputContainerStyle = { display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '1000px', margin: '0 auto' };
const pcInputStyle = { flex: 1, padding: '12px 20px', borderRadius: '24px', border: '1px solid #e5e5ea', backgroundColor: '#f2f2f7', fontSize: '16px', outline: 'none' };
const plusButtonStyle = { fontSize: '28px', color: '#007AFF', cursor: 'pointer', fontWeight: '300' };
const sendButtonStyle = { padding: '10px 20px', borderRadius: '20px', backgroundColor: '#007AFF', color: '#fff', border: 'none', fontSize: '15px', fontWeight: '700', cursor: 'pointer' };

export default Consultation;
