import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, BookOpen, Clock, MessageSquare, Book, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState } from 'react';
import * as notificationApi from '../../api/notificationApi';
import { parseApiDate } from '../../utils/helpers';

const ICONS = {
  REQUEST_APPROVED: { icon: CheckCircle, color: '#22C55E' },
  REQUEST_RECEIVED: { icon: BookOpen, color: 'var(--primary)' },
  REQUEST_REJECTED: { icon: XCircle, color: 'var(--danger)' },
  REQUEST_RETURNED: { icon: Clock, color: '#F59E0B' },
  NEW_MESSAGE: { icon: MessageSquare, color: '#8B5CF6' },
  BOOK_AVAILABLE: { icon: Book, color: 'var(--accent-orange)' },
  DEFAULT: { icon: Bell, color: 'var(--text-muted)' },
};

function getNavPath(n) {
  const t = n.type || '';
  if (t.includes('MESSAGE') && n.referenceId) return `/chat/${n.referenceId}`;
  if (t.includes('MESSAGE')) return '/chat';
  if (t.includes('REQUEST') && n.referenceId) return `/requests/received`;
  if (t.includes('REQUEST')) return `/requests/received`;
  if (t.includes('BOOK') && n.referenceId) return `/books/${n.referenceId}`;
  return null;
}

function formatNotificationTime(dateValue) {
  const date = parseApiDate(dateValue);
  if (!date) return '';

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const size = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => notificationApi.getNotifications({ page, size }),
    keepPreviousData: true,
  });

  const notifications = (data?.content || data || []).map((item) => ({
    ...item,
    id: item.id ?? item.notificationId,
    read: item.read ?? item.isRead ?? false,
  }));

  const markMut = useMutation({
    mutationFn: (id) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    },
  });

  const markAllMut = useMutation({
    mutationFn: async () => {
      try {
        await notificationApi.markAllAsRead();
      } catch (error) {
        // Backward-compatible fallback during partial deploys where /read-all may not be exposed.
        if (error?.response?.status !== 404) throw error;

        const unreadIds = notifications
          .filter((item) => !item.read && item.id != null)
          .map((item) => item.id);

        await Promise.allSettled(unreadIds.map((id) => notificationApi.markAsRead(id)));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      toast.success('All marked as read');
    },
    onError: () => {
      toast.error('Unable to mark all notifications as read');
    },
  });

  const totalPages = data?.totalPages || 1;

  const handleClick = (n) => {
    const notificationId = n.id ?? n.notificationId;
    if (!n.read && notificationId != null) {
      markMut.mutate(notificationId, {
        onError: (error) => {
          if (error?.response?.status !== 404) {
            toast.error('Could not mark notification as read');
          }
        },
      });
    }
    const path = getNavPath(n);
    if (path) navigate(path);
  };

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: 'calc(100vh - 64px)', padding: '32px 24px' }}>
      <div className="mx-auto" style={{ maxWidth: 640 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '2rem', color: 'var(--text-primary)' }}>
            Notifications
          </h1>
          <button
            type="button"
            onClick={() => markAllMut.mutate()}
            disabled={markAllMut.isPending}
            className="border-none cursor-pointer"
            style={{
              height: 36,
              paddingLeft: 14,
              paddingRight: 14,
              borderRadius: 'var(--radius-btn)',
              background: 'var(--bg-page)',
              border: '1px solid var(--border)',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: '0.8125rem',
              color: 'var(--primary)',
              transition: 'background 0.2s',
            }}
          >
            Mark All as Read
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-card)' }} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Bell size={56} style={{ color: 'var(--border)' }} />
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '1rem', color: 'var(--text-muted)', marginTop: 16 }}>
              No notifications yet
            </p>
          </div>
        )}

        {/* List */}
        {!isLoading && notifications.length > 0 && (
          <div className="flex flex-col gap-2">
            {notifications.map((n, idx) => {
              const meta = ICONS[n.type] || ICONS.DEFAULT;
              const Icon = meta.icon;
              return (
                <button
                  key={n.id ?? `${n.type}-${n.referenceId ?? 'na'}-${n.createdAt ?? n.timestamp ?? idx}`}
                  type="button"
                  onClick={() => handleClick(n)}
                  className="flex items-start gap-3 w-full text-left border-none cursor-pointer"
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-card)',
                    background: n.read ? '#fff' : 'rgba(0,201,167,0.04)',
                    border: n.read ? '1px solid var(--border)' : '1px solid var(--primary)',
                    transition: 'background 0.15s',
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-full shrink-0"
                    style={{ width: 40, height: 40, background: `${meta.color}12` }}
                  >
                    <Icon size={20} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '0.875rem',
                        fontWeight: n.read ? 400 : 600,
                        color: 'var(--text-primary)',
                        lineHeight: 1.4,
                        marginBottom: 2,
                      }}
                    >
                      {n.message || n.title}
                    </p>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formatNotificationTime(n.createdAt || n.timestamp)}
                    </span>
                  </div>
                  {!n.read && (
                    <span
                      className="shrink-0 rounded-full mt-2"
                      style={{ width: 8, height: 8, background: 'var(--primary)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 border-none cursor-pointer"
              style={{
                height: 36,
                paddingLeft: 12,
                paddingRight: 12,
                borderRadius: 8,
                background: page === 0 ? 'var(--border)' : 'var(--primary)',
                color: '#fff',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: '0.8125rem',
                opacity: page === 0 ? 0.5 : 1,
              }}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1 border-none cursor-pointer"
              style={{
                height: 36,
                paddingLeft: 12,
                paddingRight: 12,
                borderRadius: 8,
                background: page >= totalPages - 1 ? 'var(--border)' : 'var(--primary)',
                color: '#fff',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: '0.8125rem',
                opacity: page >= totalPages - 1 ? 0.5 : 1,
              }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
