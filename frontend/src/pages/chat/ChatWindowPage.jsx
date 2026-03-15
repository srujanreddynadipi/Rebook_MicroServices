import { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, AlertCircle } from 'lucide-react';

import { getInbox, getMessages, sendMessage as sendMessageRest, markAsRead } from '../../api/chatApi';
import { getReceivedRequests, getSentRequests } from '../../api/requestApi';
import { getUserById } from '../../api/userApi';
import { AuthContext } from '../../context/AuthContext';
import { WebSocketContext } from '../../context/WebSocketContext';
import MessageBubble from '../../components/chat/MessageBubble';
import { getInitials } from '../../utils/helpers';

/* ── ChatWindowPage ──────────────────────────────────────────────────────── */
export default function ChatWindowPage() {
  const { requestId }               = useParams();
  const { user }                    = useContext(AuthContext);
  const { connected, sendMessage: wsSend, subscribe, unsubscribe } = useContext(WebSocketContext);
  const queryClient                 = useQueryClient();

  const [input, setInput]           = useState('');
  const [sending, setSending]       = useState(false);
  const [sendError, setSendError]   = useState('');
  const bottomRef                   = useRef(null);
  const textareaRef                 = useRef(null);

  const numericRequestId = requestId ? Number(requestId) : null;

  /* ── Load initial messages ───────────────────────────────────────────── */
  const { data: messages = [], isLoading, isError } = useQuery({
    queryKey: ['messages', requestId],
    queryFn:  () => getMessages(requestId),
    enabled:  !!requestId,
    refetchOnWindowFocus: false,
  });

  const { data: inbox = [] } = useQuery({
    queryKey: ['inbox'],
    queryFn: getInbox,
    enabled: !!requestId,
    staleTime: 15_000,
  });

  const { data: sentRequestsPage } = useQuery({
    queryKey: ['sentRequests', 'APPROVED', 'chat-recipient'],
    queryFn: () => getSentRequests({ status: 'APPROVED', page: 0, size: 500 }),
    enabled: !!requestId,
    staleTime: 30_000,
  });

  const { data: receivedRequestsPage } = useQuery({
    queryKey: ['receivedRequests', 'APPROVED', 'chat-recipient'],
    queryFn: () => getReceivedRequests({ status: 'APPROVED', page: 0, size: 500 }),
    enabled: !!requestId,
    staleTime: 30_000,
  });

  const sentRequests = sentRequestsPage?.content ?? [];
  const receivedRequests = receivedRequestsPage?.content ?? [];
  const matchingSentRequest = sentRequests.find((req) => String(req.id) === String(requestId));
  const matchingReceivedRequest = receivedRequests.find((req) => String(req.id) === String(requestId));

  const resolvedReceiverId = (() => {
    if (matchingSentRequest?.receiverId != null) {
      return Number(matchingSentRequest.receiverId);
    }

    if (matchingReceivedRequest?.senderId != null) {
      return Number(matchingReceivedRequest.senderId);
    }

    const fromInbox = inbox.find((c) => String(c.requestId) === String(requestId))?.otherUserId;
    if (fromInbox != null) return Number(fromInbox);

    const fromMessagesSender = messages.find((m) => String(m.senderId) !== String(user?.id))?.senderId;
    if (fromMessagesSender != null) return Number(fromMessagesSender);

    const fromMessagesReceiver = messages.find((m) => String(m.receiverId) !== String(user?.id))?.receiverId;
    if (fromMessagesReceiver != null) return Number(fromMessagesReceiver);

    return null;
  })();

  const { data: otherUserProfile } = useQuery({
    queryKey: ['userProfile', resolvedReceiverId],
    queryFn: () => getUserById(resolvedReceiverId).then((res) => res.data),
    enabled: !!resolvedReceiverId,
    staleTime: 5 * 60 * 1000,
  });

  const otherUserName = otherUserProfile?.name || (resolvedReceiverId ? `User #${resolvedReceiverId}` : 'User');
  const otherUserInitial = getInitials(otherUserName)[0] || 'U';

  /* ── Mark as read on open ────────────────────────────────────────────── */
  useEffect(() => {
    if (requestId) {
      markAsRead(requestId).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    }
  }, [requestId, queryClient]);

  /* ── Subscribe to WebSocket topic for this request ───────────────────── */
  const handleIncomingMessage = useCallback((msg) => {
    queryClient.setQueryData(['messages', requestId], (prev = []) => {
      // Avoid duplicates (WS may echo our own sends)
      if (prev.some((m) => m.id && m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    // Also refresh inbox unread counts
    queryClient.invalidateQueries({ queryKey: ['inbox'] });
  }, [requestId, queryClient]);

  useEffect(() => {
    if (!requestId) return;

    // Subscribe when connected (or re-subscribe when connection changes)
    if (connected) {
      subscribe(requestId, handleIncomingMessage);
    }

    return () => {
      unsubscribe(requestId);
    };
  }, [requestId, connected, subscribe, unsubscribe, handleIncomingMessage]);

  /* ── Auto-scroll to bottom ───────────────────────────────────────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Send handler ─────────────────────────────────────────────────────── */
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    if (!numericRequestId || !resolvedReceiverId) {
      setSendError('Unable to identify the recipient for this chat yet. Please wait a moment and try again.');
      return;
    }

    setSending(true);
    setSendError('');

    const messageData = {
      requestId: numericRequestId,
      receiverId: resolvedReceiverId,
      content: text,
    };

    // Optimistic local append
    const optimistic = {
      id: null,
      senderId: user?.id,
      content: text,
      createdAt: new Date().toISOString(),
      read: false,
      _optimistic: true,
    };
    queryClient.setQueryData(['messages', requestId], (prev = []) => [...prev, optimistic]);
    setInput('');

    try {
      const sentViaWs = connected && wsSend(messageData);

      if (sentViaWs) {
        // Primary: WebSocket
        // The server will broadcast back via /topic/requests/{id} — handled by subscription
        // Remove optimistic entry; the real one will arrive via WS
      } else {
        // Fallback: REST
        const saved = await sendMessageRest(messageData);
        queryClient.setQueryData(['messages', requestId], (prev = []) =>
          prev.filter((m) => !m._optimistic).concat(saved)
        );
      }
    } catch {
      setSendError('Message failed to send. Please try again.');
      // Remove optimistic entry on failure
      queryClient.setQueryData(['messages', requestId], (prev = []) =>
        prev.filter((m) => !m._optimistic)
      );
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  /* ── Key handler: Enter sends, Shift+Enter newline ──────────────────── */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── Loading state ───────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full gap-3">
        <AlertCircle size={36} style={{ color: 'var(--danger)' }} />
        <p className="font-['DM_Sans']" style={{ color: 'var(--text-secondary)' }}>
          Failed to load messages.
        </p>
      </div>
    );
  }

  /* ── Main render ─────────────────────────────────────────────────────── */
  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--bg-page)' }}
    >
      <div
        className="px-4 py-3 bg-white flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="rounded-full text-white font-['DM_Sans'] font-bold flex items-center justify-center"
            style={{ width: 34, height: 34, background: 'var(--secondary)', fontSize: '0.9rem' }}
          >
            {otherUserInitial}
          </div>
          {resolvedReceiverId ? (
            <Link
              to={`/users/${resolvedReceiverId}`}
              className="font-['Sora'] font-semibold truncate hover:underline"
              style={{ color: 'var(--text-primary)', fontSize: '0.95rem', textDecorationColor: 'var(--primary)' }}
            >
              {otherUserName}
            </Link>
          ) : (
            <p className="font-['Sora'] font-semibold truncate" style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
              {otherUserName}
            </p>
          )}
        </div>
      </div>

      {/* ── Message list ── */}
      <div
        className="flex-1 overflow-y-auto py-4"
        style={{ scrollbarWidth: 'thin' }}
      >
        {messages.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full font-['DM_Sans']"
            style={{ color: 'var(--text-muted)' }}
          >
            <p className="text-2xl mb-2">💬</p>
            <p className="text-sm">No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = String(msg.senderId) === String(user?.id);
            return (
              <MessageBubble
                key={msg.id ?? `opt-${idx}`}
                message={msg}
                isOwn={isOwn}
              />
            );
          })
        )}
        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* ── Composer ── */}
      <div
        className="px-3 py-3 bg-white"
        style={{
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.04)',
        }}
      >
        {sendError && (
          <p
            className="font-['DM_Sans'] text-xs mb-2"
            style={{ color: 'var(--danger)' }}
          >
            {sendError}
          </p>
        )}
        <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          rows={1}
          className="flex-1 font-['DM_Sans'] outline-none resize-none"
          style={{
            padding: '10px 14px',
            borderRadius: 20,
            border: '1.5px solid var(--border)',
            background: 'var(--bg-page)',
            fontSize: '0.9375rem',
            color: 'var(--text-primary)',
            lineHeight: 1.5,
            maxHeight: 120,
            overflowY: 'auto',
          }}
          onInput={(e) => {
            // Auto-grow
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="flex-shrink-0 flex items-center justify-center transition-all active:scale-[0.93] disabled:opacity-40"
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--primary)', border: 'none',
            color: 'white', cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
          }}
          aria-label="Send message"
        >
          {sending
            ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            : <Send size={18} />
          }
        </button>
        </div>
      </div>
    </div>
  );
}
