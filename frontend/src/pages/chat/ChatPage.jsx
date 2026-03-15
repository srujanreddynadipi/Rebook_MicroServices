import { useState, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, Outlet } from 'react-router-dom';
import { MessageCircle, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';

import { getInbox } from '../../api/chatApi';
import { getUserById } from '../../api/userApi';
import { AuthContext } from '../../context/AuthContext';
import { WebSocketContext } from '../../context/WebSocketContext';
import { formatChatTime, getInitials } from '../../utils/helpers';

/* ── Skeleton inbox item ─────────────────────────────────────────────────── */
function InboxSkeleton() {
  return (
    <div className="flex gap-3 p-4 items-center">
      <div className="skeleton rounded-full flex-shrink-0" style={{ width: 44, height: 44 }} />
      <div className="flex-1 min-w-0">
        <div className="skeleton mb-1.5" style={{ height: 14, width: '55%' }} />
        <div className="skeleton"        style={{ height: 12, width: '80%' }} />
      </div>
    </div>
  );
}

/* ── Single inbox row ────────────────────────────────────────────────────── */
function InboxItem({ convo, isActive, onClick }) {
  const { data: profile } = useQuery({
    queryKey: ['userProfile', convo.otherUserId],
    queryFn: () => getUserById(convo.otherUserId).then((res) => res.data),
    enabled: !!convo.otherUserId,
    staleTime: 5 * 60 * 1000,
  });

  const userName = profile?.name || convo.otherUserName || (convo.otherUserId ? `User #${convo.otherUserId}` : 'User');
  const timeLabel = formatChatTime(convo.lastMessageTime ?? convo.lastMessageAt);

  const initial = getInitials(userName)[0] || 'U';

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex gap-3 p-4 transition-colors hover:bg-gray-50 focus:outline-none"
      style={{
        borderBottom: '1px solid var(--border)',
        background: isActive ? 'var(--primary-light)' : 'transparent',
        cursor: 'pointer',
        border: 'none',
      }}
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-full text-white font-['DM_Sans'] font-bold"
        style={{
          width: 44, height: 44,
          background: isActive ? 'var(--primary)' : 'var(--secondary)',
          fontSize: '1rem',
        }}
      >
        {initial}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1">
          <p
            className="font-['DM_Sans'] font-semibold truncate"
            style={{
              color: 'var(--text-primary)',
              fontSize: '0.9375rem',
            }}
          >
            <Link
              to={`/users/${convo.otherUserId}`}
              onClick={(e) => e.stopPropagation()}
              style={{ color: 'inherit', textDecoration: 'none' }}
              className="hover:underline"
            >
              {userName}
            </Link>
          </p>
          <span
            className="font-['DM_Sans'] text-xs flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            {timeLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          <p
            className="font-['DM_Sans'] text-sm truncate flex-1"
            style={{ color: convo.unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {convo.lastMessage ?? 'No messages yet'}
          </p>

          {/* Unread badge */}
          {convo.unreadCount > 0 && (
            <span
              className="flex-shrink-0 font-['DM_Sans'] font-bold text-xs text-white flex items-center justify-center rounded-full"
              style={{ minWidth: 20, height: 20, padding: '0 5px', background: 'var(--primary)' }}
            >
              {convo.unreadCount > 99 ? '99+' : convo.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ── Main ChatPage ────────────────────────────────────────────────────────── */
export default function ChatPage() {
  const navigate                 = useNavigate();
  const { requestId: activeId }  = useParams();    // present when nested route active
  const { connected }            = useContext(WebSocketContext);

  // On mobile, if a chat is open hide the inbox list
  const [mobileShowList, setMobileShowList] = useState(!activeId);

  const { data: inbox = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['inbox'],
    queryFn:  getInbox,
    refetchInterval: 15_000,
  });

  const handleSelectConvo = (requestId) => {
    navigate(`/chat/${requestId}`);
    setMobileShowList(false);
  };

  /* ── Inbox panel ── */
  const InboxPanel = (
    <div
      className="bg-white flex flex-col"
      style={{
        borderRight: '1px solid var(--border)',
        minWidth: 280,
        width: 320,
        maxWidth: '100%',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 sticky top-0 bg-white z-10"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <MessageCircle size={18} style={{ color: 'var(--primary)' }} />
          <h2 className="font-['Sora'] font-bold" style={{ fontSize: '1.0625rem', color: 'var(--text-primary)' }}>
            Messages
          </h2>
        </div>
        {/* WS connection dot */}
        <span
          title={connected ? 'Connected' : 'Offline'}
          className="flex items-center gap-1 font-['DM_Sans'] text-xs"
          style={{ color: connected ? 'var(--primary)' : 'var(--text-muted)' }}
        >
          {connected
            ? <Wifi size={13} />
            : <WifiOff size={13} />
          }
          {connected ? 'Live' : 'Offline'}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <InboxSkeleton key={i} />)

        ) : isError ? (
          <div className="p-6 text-center">
            <AlertCircle size={28} style={{ color: 'var(--danger)', margin: '0 auto 8px' }} />
            <p className="font-['DM_Sans'] text-sm" style={{ color: 'var(--text-secondary)' }}>
              Failed to load inbox.
            </p>
            <button
              onClick={refetch}
              className="font-['DM_Sans'] text-sm mt-2 hover:underline"
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>

        ) : inbox.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p
              className="font-['Sora'] font-semibold mb-1"
              style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}
            >
              No conversations yet
            </p>
            <p
              className="font-['DM_Sans'] text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              When your requests are approved, you can chat with book owners here.
            </p>
          </div>

        ) : inbox.map((convo) => (
          <InboxItem
            key={convo.requestId}
            convo={convo}
            isActive={String(convo.requestId) === String(activeId)}
            onClick={() => handleSelectConvo(convo.requestId)}
          />
        ))}
      </div>
    </div>
  );

  /* ── Empty right-panel placeholder (no conversation selected) ── */
  const EmptyPane = (
    <div className="flex-1 flex flex-col items-center justify-center" style={{ background: 'var(--bg-page)' }}>
      <MessageCircle size={56} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
      <p
        className="font-['Sora'] font-semibold mb-2"
        style={{ color: 'var(--text-primary)', fontSize: '1.125rem' }}
      >
        Select a conversation
      </p>
      <p className="font-['DM_Sans'] text-sm" style={{ color: 'var(--text-secondary)' }}>
        Choose a chat from the list on the left
      </p>
    </div>
  );

  return (
    <div
      style={{
        height: '100vh',
        paddingTop: 64,        // navbar height
        display: 'flex',
        background: 'var(--bg-page)',
      }}
    >
      {/* ── Desktop: side-by-side ── */}
      <div className="hidden md:flex flex-1 overflow-hidden" style={{ height: '100%' }}>
        {InboxPanel}
        <div className="flex-1 overflow-hidden">
          {activeId ? <Outlet /> : EmptyPane}
        </div>
      </div>

      {/* ── Mobile: toggle between list and chat ── */}
      <div className="flex md:hidden flex-1 overflow-hidden" style={{ height: '100%' }}>
        {mobileShowList ? (
          InboxPanel
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Back button on mobile */}
            <button
              onClick={() => { setMobileShowList(true); navigate('/chat'); }}
              className="font-['DM_Sans'] font-medium text-sm flex items-center gap-1.5 px-4 py-2 sticky top-0 z-10 bg-white"
              style={{ border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--primary)', cursor: 'pointer' }}
            >
              ← Inbox
            </button>
            {activeId ? <Outlet /> : EmptyPane}
          </div>
        )}
      </div>
    </div>
  );
}
