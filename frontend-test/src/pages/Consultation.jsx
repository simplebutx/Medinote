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

    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [roomId, setRoomId] = useState(initialRoomId || '');
    const [senderName, setSenderName] = useState(session?.username || '사용자');
    const [senderId, setSenderId] = useState(session?.userId || '');
    const [senderType, setSenderType] = useState(session?.role || 'USER');
    const [connected, setIsConnected] = useState(false);
    
    const stompClientRef = useRef(null);
    const subscriptionRef = useRef(null);
    const isConnectingRef = useRef(false); // 연결 중복 방지 플래그
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (initialRoomId && session && !connected) {
            connect(initialRoomId);
        }
        return () => {
            disconnect();
        };
    }, [initialRoomId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const connect = async (targetRoomId = roomId) => {
        if (!targetRoomId) {
            alert("방 번호를 입력해주세요.");
            return;
        }

        // 이미 연결되었거나 연결 중인 경우 차단
        if (isConnectingRef.current || connected) return;
        isConnectingRef.current = true;

        let finalRoomId = targetRoomId;

        // 1. 유저일 경우 방 생성 로직
        if (senderType === 'USER' && !initialRoomId) {
            try {
                const createRes = await axios.post('http://localhost:8082/app/consult/room', {}, {
                    headers: { Authorization: `Bearer ${session.accessToken}` }
                });
                finalRoomId = createRes.data.toString();
                setRoomId(finalRoomId);
            } catch (error) {
                console.error("방 생성 실패:", error);
                alert("상담 신청에 실패했습니다.");
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
    const connect = () => {
        const socket = new SockJS('/api/ws-stomp');
        const stompClient = Stomp.over(socket);
        stompClient.debug = null;

        stompClient.connect({}, (frame) => {
            setIsConnected(true);
            isConnectingRef.current = false;

            // 기존 구독 해제 후 재구독
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
            }

            subscriptionRef.current = stompClient.subscribe(`/topic/room/${finalRoomId}`, (sdkEvent) => {
                onMessageReceived(sdkEvent);
            });

            stompClient.send("/app/consult/message", {}, JSON.stringify({
                type: 'ENTER',
                roomId: finalRoomId,
                senderId: parseInt(senderId),
                senderType: senderType,
                senderName: senderName,
                message: ''
            }));
        }, (error) => {
            console.error('Connection Error: ' + error);
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
        const incomingContent = message.content || message.message;

        setMessages((prev) => {
            // 더 강력한 중복 체크: ID가 있으면 ID로, 없으면 내용+시간+보낸이로 비교
            const isDuplicate = prev.some(msg => {
                if (msg.messageId && message.messageId) return msg.messageId === message.messageId;
                return (msg.content || msg.message) === incomingContent &&
                       msg.senderId === message.senderId &&
                       msg.type === message.type;
            });

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
                        <div style={roomTitleStyle}>실시간 상담방 {roomId}</div>
                        <div style={statusTextStyle}>{connected ? '● 온라인' : '○ 오프라인'}</div>
                    </div>
                    <div style={{width:'60px'}}></div>
                </div>
            </div>

            <div style={chatBodyStyle}>
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
                                    readOnly={senderType === 'USER'}
                                />
                            </div>
                            <button onClick={() => connect()} style={connectButtonStyle}>
                                {senderType === 'USER' && !roomId ? '새 상담 신청하기' : '상담 연결하기'}
                            </button>
                            <div style={{marginTop:'20px', textAlign:'center'}}>
                                <Link to={senderType === 'PHARMACIST' ? "/pharmacist/rooms" : "/my/consultations"} style={{color:'#007AFF', fontSize:'14px'}}>
                                    {senderType === 'PHARMACIST' ? "대기 목록으로" : "내 상담 내역 보기"}
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={messageListStyle}>
                        {messages.map((msg, index) => {
                            const isMe = msg.senderId === parseInt(getAuthSession()?.userId || senderId) &&
                                         msg.senderType === (getAuthSession()?.role || senderType);
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
                            onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
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
const inputContainerWrapperStyle = { padding: '16px 24px 30px', backgroundColor: 'rgba(255,255,255,0.9)', borderTop: '1px solid #f2f2f7' };
const inputContainerStyle = { display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '1000px', margin: '0 auto' };
const pcInputStyle = { flex: 1, padding: '12px 20px', borderRadius: '24px', border: '1px solid #e5e5ea', backgroundColor: '#f2f2f7', fontSize: '16px', outline: 'none' };
const plusButtonStyle = { fontSize: '28px', color: '#007AFF', cursor: 'pointer', fontWeight: '300' };
const sendButtonStyle = { padding: '10px 20px', borderRadius: '20px', backgroundColor: '#007AFF', color: '#fff', border: 'none', fontSize: '15px', fontWeight: '700', cursor: 'pointer' };

export default Consultation;
