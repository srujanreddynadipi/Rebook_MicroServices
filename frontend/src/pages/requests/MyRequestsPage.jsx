import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, ChevronRight, AlertCircle, Loader2, Phone, Mail, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { getSentRequests, cancelRequest } from '../../api/requestApi';
import { getUserById } from '../../api/userApi';

/* ── Constants ─────────────────────────────────────────────────────────────── */
const STATUS_TABS = [
  { key: 'PENDING',   label: 'Pending'   },
  { key: 'APPROVED',  label: 'Approved'  },
  { key: 'REJECTED',  label: 'Rejected'  },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   bg: '#FFF7E6', color: '#D46B08', border: '#FFD591' },
  APPROVED:  { label: 'Approved',  bg: '#F6FFED', color: '#389E0D', border: '#B7EB8F' },
  REJECTED:  { label: 'Rejected',  bg: '#FFF1F0', color: '#CF1322', border: '#FFA39E' },
  CANCELLED: { label: 'Cancelled', bg: '#F5F5F5', color: '#8C8C8C', border: '#D9D9D9' },
};

const TYPE_CONFIG = {
  DONATION: { label: '🎁 Donation', bg: '#FFF4E6', color: '#E05E00' },
  LENDING:  { label: '📖 Lending',  bg: '#F0F4FF', color: '#1877F2' },
};

/* ── RequestCard ──────────────────────────────────────────────────────────── */
function RequestCard({ req, onCancel, cancelling }) {
  const status = STATUS_CONFIG[req.status]      ?? STATUS_CONFIG.PENDING;
  const type   = TYPE_CONFIG[req.requestType]  ?? TYPE_CONFIG.DONATION;
  const isLendingApproved = req.requestType === 'LENDING' && req.status === 'APPROVED';
  const isApproved = req.status === 'APPROVED';

  const { data: ownerProfile } = useQuery({
    queryKey: ['userProfile', req.receiverId],
    queryFn:  () => getUserById(req.receiverId).then((res) => res.data),
    enabled:  isApproved && !!req.receiverId,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div
      className="bg-white rounded-[14px] p-5 transition-shadow hover:shadow-md"
      style={{ border: '1px solid var(--border)', marginBottom: 12 }}
    >
      <div className="flex gap-4 items-start">
        {/* Cover thumbnail */}
        <Link to={`/books/${req.bookId}`} className="flex-shrink-0">
          <div
            className="overflow-hidden rounded-[8px]"
            style={{ width: 56, height: 72, background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
          >
            {req.bookCoverImageUrl && (
              <img src={req.bookCoverImageUrl} alt={req.bookTitle} className="w-full h-full object-cover" />
            )}
          </div>
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Link to={`/books/${req.bookId}`} className="hover:underline min-w-0">
              <h3
                className="font-['Sora'] font-semibold line-clamp-1"
                style={{ fontSize: '1rem', color: 'var(--text-primary)' }}
              >
                {req.bookTitle}
              </h3>
            </Link>
            {/* Status badge */}
            <span
              className="font-['DM_Sans'] font-semibold text-xs px-2.5 py-1 rounded-full flex-shrink-0"
              style={{ background: status.bg, color: status.color, border: `1px solid ${status.border}` }}
            >
              {status.label}
            </span>
          </div>

          {req.bookAuthor && (
            <p className="font-['DM_Sans'] mt-0.5" style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
              by {req.bookAuthor}
            </p>
          )}

          {/* Type + Owner + weeks */}
          <div className="flex flex-wrap gap-2 mt-2 items-center">
            <span
              className="font-['DM_Sans'] text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: type.bg, color: type.color }}
            >
              {type.label}
            </span>
            {req.noOfWeeks && (
              <span className="font-['DM_Sans'] text-xs" style={{ color: 'var(--text-muted)' }}>
                {req.noOfWeeks} week{req.noOfWeeks !== 1 ? 's' : ''}
              </span>
            )}
            {req.ownerName && (
              <span className="font-['DM_Sans'] text-xs" style={{ color: 'var(--text-muted)' }}>
                · From: <span style={{ color: 'var(--text-secondary)' }}>{req.ownerName}</span>
              </span>
            )}
          </div>

          {/* Due date + Return status (lending & approved) */}
          {isLendingApproved && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Clock size={13} style={{ color: 'var(--primary)' }} />
              {req.dueDate && (
                <span className="font-['DM_Sans'] text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Due: {new Date(req.dueDate).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
              )}
              {req.returnStatus && (
                <span
                  className="font-['DM_Sans'] text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: req.returnStatus === 'RETURNED' ? '#F6FFED' : '#FFF7E6',
                    color:      req.returnStatus === 'RETURNED' ? '#389E0D' : '#D46B08',
                  }}
                >
                  {req.returnStatus === 'RETURNED' ? 'Returned ✓' : 'Pending Return'}
                </span>
              )}
            </div>
          )}

          {/* Request date */}
          {req.createdAt && (
            <p className="font-['DM_Sans'] text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Requested on{' '}
              {new Date(req.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>

      {/* Owner contact details (only when APPROVED) */}
      {isApproved && ownerProfile && (ownerProfile.mobile || ownerProfile.email) && (
        <div
          className="mt-3 pt-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <p
            className="font-['DM_Sans'] font-semibold text-xs mb-2"
            style={{ color: 'var(--primary)' }}
          >
            Owner Contact Details
          </p>
          <div className="flex flex-wrap gap-4">
            {ownerProfile.mobile && (
              <a
                href={`tel:${ownerProfile.mobile}`}
                className="flex items-center gap-1.5 font-['DM_Sans'] text-sm transition-opacity hover:opacity-80"
                style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
              >
                <Phone size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                {ownerProfile.mobile}
              </a>
            )}
            {ownerProfile.email && (
              <a
                href={`mailto:${ownerProfile.email}`}
                className="flex items-center gap-1.5 font-['DM_Sans'] text-sm transition-opacity hover:opacity-80"
                style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
              >
                <Mail size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                {ownerProfile.email}
              </a>
            )}
          </div>
        </div>
      )}

      {isApproved && (
        <div className="mt-3" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <Link
            to={`/chat/${req.id}`}
            className="inline-flex items-center gap-2 font-['DM_Sans'] font-semibold text-sm text-white py-2 px-3 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: 'var(--primary)', textDecoration: 'none' }}
          >
            <MessageCircle size={15} />
            Chat with Owner
          </Link>
        </div>
      )}

      {/* Cancel button (only visible when PENDING) */}
      {req.status === 'PENDING' && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => onCancel(req.id)}
            disabled={cancelling}
            className="font-['DM_Sans'] font-medium text-sm transition-all hover:opacity-80 disabled:opacity-50"
            style={{
              background: 'none',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              borderRadius: 8,
              padding: '6px 16px',
              cursor: cancelling ? 'wait' : 'pointer',
            }}
          >
            {cancelling ? 'Cancelling…' : 'Cancel Request'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function MyRequestsPage() {
  const queryClient             = useQueryClient();
  const [activeTab, setActiveTab]     = useState('PENDING');
  const [page, setPage]               = useState(0);
  const [cancellingId, setCancellingId] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sentRequests', activeTab, page],
    queryFn:  () => getSentRequests({ status: activeTab, page, size: 10 }),
    keepPreviousData: true,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelRequest,
    onMutate:   (id) => setCancellingId(id),
    onSuccess:  () => {
      toast.success('Request cancelled.');
      queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel.');
    },
    onSettled: () => setCancellingId(null),
  });

  const requests   = data?.content    ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', paddingTop: 80 }}>
      <div className="mx-auto" style={{ maxWidth: 800, padding: '32px 16px' }}>

        {/* Header */}
        <h1
          className="font-['Sora'] font-bold"
          style={{ fontSize: '1.75rem', color: 'var(--text-primary)', marginBottom: 4 }}
        >
          My Requests
        </h1>
        <p className="font-['DM_Sans']" style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          Books you've requested from others
        </p>

        {/* Status tabs */}
        <div
          className="flex gap-1 mb-6 p-1 rounded-xl bg-white"
          style={{ border: '1px solid var(--border)', width: 'fit-content', flexWrap: 'wrap' }}
        >
          {STATUS_TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(0); }}
                className="font-['DM_Sans'] font-medium text-sm rounded-lg px-4 py-1.5 transition-all duration-150"
                style={{
                  background: active ? 'var(--primary)' : 'transparent',
                  color:      active ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
          </div>

        ) : isError ? (
          <div className="text-center py-20">
            <AlertCircle size={40} style={{ color: 'var(--danger)', margin: '0 auto 12px' }} />
            <p className="font-['DM_Sans']" style={{ color: 'var(--text-secondary)' }}>Failed to load requests.</p>
          </div>

        ) : requests.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
            <p
              className="font-['Sora'] font-semibold mb-2"
              style={{ color: 'var(--text-primary)', fontSize: '1.125rem' }}
            >
              No requests found
            </p>
            <p className="font-['DM_Sans'] mb-6" style={{ color: 'var(--text-secondary)' }}>
              You haven't requested any books yet. Browse books →
            </p>
            <Link
              to="/books"
              className="inline-flex items-center gap-2 font-['DM_Sans'] font-semibold text-white py-2.5 px-5 rounded-[10px] transition-opacity hover:opacity-90"
              style={{ background: 'var(--primary)', textDecoration: 'none' }}
            >
              Browse Books <ChevronRight size={16} />
            </Link>
          </div>

        ) : (
          <>
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                req={req}
                onCancel={(id) => cancelMutation.mutate(id)}
                cancelling={cancellingId === req.id && cancelMutation.isPending}
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="font-['DM_Sans'] text-sm px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors hover:bg-white"
                  style={{
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    cursor: page === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  ← Prev
                </button>
                <span className="font-['DM_Sans'] text-sm px-3 py-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Page {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="font-['DM_Sans'] text-sm px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors hover:bg-white"
                  style={{
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
