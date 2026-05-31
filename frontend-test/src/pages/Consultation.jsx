import React, { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

const Consultation = () => {
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [roomId, setRoomId] = useState('1'); // 테스트용 기본 방 번호
    const [sender, setSender] = useState('테스트유저');
    const [connected, setIsConnected] = useState(false);
    
    const stompClientRef = useRef(null);

    const connect = () => {
        const socket = new SockJS('/api/ws-stomp');
        const stompClient = Stomp.over(socket);

        stompClient.connect({}, (frame) => {
            setIsConnected(true);
            console.log('Connected: ' + frame);
            
            // 구독 설정 (/topic/room/{roomId})
            stompClient.subscribe(`/topic/room/${roomId}`, (sdkEvent) => {
                onMessageReceived(sdkEvent);
            });

            // 입장 메시지 전송
            stompClient.send("/app/consult/message", {}, JSON.stringify({
                type: 'ENTER',
                roomId: roomId,
                sender: sender,
                message: ''
            }));
        }, (error) => {
            console.error('Connection Error: ' + error);
            setIsConnected(false);
        });

        stompClientRef.current = stompClient;
    };

    const disconnect = () => {
        if (stompClientRef.current !== null) {
            stompClientRef.current.disconnect();
        }
        setIsConnected(false);
        console.log("Disconnected");
    };

    const onMessageReceived = (payload) => {
        const message = JSON.parse(payload.body);
        setMessages((prev) => [...prev, message]);
    };

    const sendMessage = () => {
        if (stompClientRef.current && messageInput) {
            const chatMessage = {
                type: 'TALK',
                roomId: roomId,
                sender: sender,
                message: messageInput
            };
            stompClientRef.current.send("/app/consult/message", {}, JSON.stringify(chatMessage));
            setMessageInput('');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
            <h2>실시간 상담 테스트 (WebSocket)</h2>
            
            <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}>
                <input 
                    type="text" 
                    placeholder="방 번호" 
                    value={roomId} 
                    onChange={(e) => setRoomId(e.target.value)} 
                    disabled={connected}
                />
                <input 
                    type="text" 
                    placeholder="내 이름" 
                    value={sender} 
                    onChange={(e) => setSender(e.target.value)} 
                    disabled={connected}
                />
                {!connected ? (
                    <button onClick={connect}>연결하기</button>
                ) : (
                    <button onClick={disconnect}>연결 끊기</button>
                )}
            </div>

            <div style={{ 
                height: '400px', 
                border: '1px solid #ccc', 
                overflowY: 'scroll', 
                padding: '10px',
                marginBottom: '10px',
                backgroundColor: '#f9f9f9'
            }}>
                {messages.map((msg, index) => (
                    <div key={index} style={{ marginBottom: '10px' }}>
                        <strong>{msg.sender}:</strong> {msg.message}
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                    type="text" 
                    style={{ flex: 1 }} 
                    value={messageInput} 
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="메시지를 입력하세요..."
                    disabled={!connected}
                />
                <button onClick={sendMessage} disabled={!connected}>전송</button>
            </div>
        </div>
    );
};

export default Consultation;
