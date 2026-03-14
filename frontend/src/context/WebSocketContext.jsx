import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { AuthContext } from "./AuthContext";

export const WebSocketContext = createContext(null);

const resolveWsUrl = () => {
  const envUrl = import.meta.env.VITE_WS_URL;

  if (!envUrl) {
    return "/ws";
  }

  if (typeof window === "undefined") {
    return envUrl;
  }

  const isDeployedHost = !["localhost", "127.0.0.1"].includes(window.location.hostname);

  try {
    const parsed = new URL(envUrl, window.location.origin);
    if (isDeployedHost && ["localhost", "127.0.0.1"].includes(parsed.hostname)) {
      return "/ws";
    }
  } catch {
    // If URL parsing fails, use raw value.
  }

  return envUrl;
};

const WS_URL = resolveWsUrl();

export function WebSocketProvider({ children }) {
  const { user } = useContext(AuthContext);

  const clientRef      = useRef(null);
  const subsRef        = useRef({});   // keyed by requestId string
  const [connected, setConnected] = useState(false);

  // ── Connect / disconnect based on login state ────────────────────────────
  useEffect(() => {
    if (!user) {
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
        subsRef.current   = {};
        setConnected(false);
      }
      return;
    }

    // Avoid double-connecting (React StrictMode)
    if (clientRef.current) return;

    const token = localStorage.getItem("accessToken");

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,

      onConnect: () => {
        setConnected(true);

        // Subscribe to personal message queue
        client.subscribe("/user/queue/messages", (frame) => {
          try {
            const msg = JSON.parse(frame.body);
            window.dispatchEvent(new CustomEvent("ws:message", { detail: msg }));
          } catch {
            // ignore malformed frames
          }
        });
      },

      onDisconnect: () => setConnected(false),

      onStompError: (frame) => {
        console.error("[WS] STOMP error", frame);
        setConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
      subsRef.current   = {};
      setConnected(false);
    };
  }, [user?.id]); // re-run only when the logged-in user changes // eslint-disable-line react-hooks/exhaustive-deps

  // ── sendMessage ──────────────────────────────────────────────────────────
  const sendMessage = useCallback((messageData) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: "/app/chat.send",
        body: JSON.stringify(messageData),
      });
      return true;
    }
    return false;
  }, []);

  // ── subscribe to /topic/requests/{requestId} ─────────────────────────────
  const subscribe = useCallback((requestId, callback) => {
    if (!clientRef.current?.connected) return;
    const key = String(requestId);
    if (subsRef.current[key]) return; // already subscribed

    const sub = clientRef.current.subscribe(
      `/topic/requests/${key}`,
      (frame) => {
        try { callback(JSON.parse(frame.body)); } catch { /* ignore */ }
      }
    );
    subsRef.current[key] = sub;
  }, []);

  // ── unsubscribe from a request topic ────────────────────────────────────
  const unsubscribe = useCallback((requestId) => {
    const key = String(requestId);
    const sub = subsRef.current[key];
    if (sub) {
      sub.unsubscribe();
      delete subsRef.current[key];
    }
  }, []);

  return (
    <WebSocketContext.Provider value={{ connected, sendMessage, subscribe, unsubscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Convenience hook
export function useWebSocket() {
  return useContext(WebSocketContext);
}
