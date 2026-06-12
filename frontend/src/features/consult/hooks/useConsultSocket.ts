import { Client } from '@stomp/stompjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import SockJS from 'sockjs-client';

import { useUserStore } from '../../../store/useUserStore';
import type {
  ConsultMessageSenderType,
  ConsultSocketMessage,
} from '../types';

const CONSULTATION_BASE_URL =
  import.meta.env.VITE_CONSULTATION_API_URL || 'http://localhost:8082';

function getUserIdFromAccessToken(accessToken?: string | null) {
  if (!accessToken) return 0;

  try {
    const payload = accessToken.split('.')[1];

    if (!payload) return 0;

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = JSON.parse(window.atob(normalizedPayload)) as {
      userId?: number | string;
      user_id?: number | string;
      id?: number | string;
    };

    return Number(
      decodedPayload.userId ?? decodedPayload.user_id ?? decodedPayload.id ?? 0,
    );
  } catch {
    return 0;
  }
}

interface UseConsultSocketParams {
  roomId?: number | null;
  senderType: ConsultMessageSenderType;
  senderName?: string;
  enabled?: boolean;
  onMessage?: (message: ConsultSocketMessage) => void;
}

export const useConsultSocket = ({
  roomId,
  senderType,
  senderName,
  enabled = true,
  onMessage,
}: UseConsultSocketParams) => {
  const accessToken = useUserStore((state) => state.accessToken);

  const clientRef = useRef<Client | null>(null);
  const receivedMessageKeysRef = useRef<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);

  const senderId = useMemo(() => {
    return getUserIdFromAccessToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!enabled || !roomId || !accessToken) {
      return;
    }

    const receivedMessageKeys = receivedMessageKeysRef.current;

    receivedMessageKeys.clear();

    const client = new Client({
      webSocketFactory: () =>
        new SockJS(`${CONSULTATION_BASE_URL}/api/ws-stomp`),
      connectHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
      reconnectDelay: 5000,
      debug: () => {},
      onConnect: () => {
        setIsConnected(true);

        const handleMessageFrame = (frame: { body: string }) => {
          const messageKey = frame.body;

          if (receivedMessageKeys.has(messageKey)) {
            return;
          }

          receivedMessageKeys.add(messageKey);
          window.setTimeout(() => {
            receivedMessageKeys.delete(messageKey);
          }, 1000);

          try {
            const parsedMessage = JSON.parse(frame.body) as ConsultSocketMessage;
            onMessage?.(parsedMessage);
          } catch (error) {
            console.error('상담 메시지 파싱 실패:', error);
          }
        };

        client.subscribe(`/topic/chat/room/${roomId}`, handleMessageFrame);
        client.subscribe(`/topic/room/${roomId}`, handleMessageFrame);

        client.publish({
          destination: '/app/consult/message',
          body: JSON.stringify({
            type: 'ENTER',
            roomId,
            senderId,
            senderType,
            senderName,
            message: `${senderName ?? senderType}님이 입장했습니다.`,
          }),
        });
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onStompError: (frame) => {
        console.error('상담 WebSocket STOMP 오류:', frame);
      },
      onWebSocketError: (error) => {
        console.error('상담 WebSocket 연결 오류:', error);
      },
    });

    clientRef.current = client;
    client.activate();

    return () => {
      setIsConnected(false);
      receivedMessageKeys.clear();
      client.deactivate();
      clientRef.current = null;
    };
  }, [accessToken, enabled, onMessage, roomId, senderId, senderName, senderType]);

  const sendMessage = (message: string) => {
    if (!roomId || !clientRef.current || !clientRef.current.connected) {
      return false;
    }

    clientRef.current.publish({
      destination: '/app/consult/message',
      body: JSON.stringify({
        type: 'TALK',
        roomId,
        senderId,
        senderType,
        senderName,
        message,
      }),
    });

    return true;
  };

  return {
    isConnected,
    sendMessage,
  };
};
