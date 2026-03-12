import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, Transition } from '@headlessui/react';
import { BookOpen, Loader2, AlertCircle, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

import {
  getReceivedRequests,
  approveRequest,
  rejectRequest,
  updateReturnStatus,
} from '../../api/requestApi';

/* ── Constants ─────────────────────────────────────────────────────────────── */
const STATUS_TABS = [
  { key: '',          label: 'All'       },
  { key: 'PENDING',   label: 'Pending'   },
  { key: 'APPROVED',  label: 'Approved'  },
  { key: 'COMPLETED', label: 'Completed' },
];

const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   bg: '#FFF7E6', color: '#D46B08', border: '#FFD591' },
  APPROVED:  { label: 'Approved',  bg: '#F6FFED', color: '#389E0D', border: '#B7EB8F' },
  REJECTED:  { label: 'Rejected',  bg: '#FFF1F0', color: '#CF1322', border: '#FFA39E' },
  CANCELLED: { label: 'Cancelled', bg: '#F5F5F5', color: '#8C8C8C', border: '#D9D9D9' },
  COMPLETED: { label: 'Completed', bg: '#E6F7FF', color: '#0958D9', border: '#91CAFF' },
};

const TYPE_CONFIG = {
  DONATION: { label: '🎁 Donation', bg: '#FFF4E6', color: '#E05E00' },
  LENDING:  { label: '📖 Lending',  bg: '#F0F4FF', color: '#1877F2' },
};

/* ── Confirm Modal ─────────────────────────────────────────────────────────── */
function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel, confirmColor = '#FF4D4F', loading }) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog onClose={() => !loading && onClose()} className="relative z-[4000]">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel
              style={{
                width: 400,
                maxWidth: 'calc(100vw - 32px)',
                background: 'white',
                borderRadius: 16,
                padding: 28,
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              }}
            >
              <Dialog.Title
                className="font-['Sora'] font-bold mb-2"
                style={{ fontSize: '1.125rem', color: 'var(--text-primary)' }}
              >
                {title}
              </Dialog.Title>
              <p
                className="font-['DM_Sans'] mb-6"
                style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}
              >
                {description}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="font-['DM_Sans'] font-medium px-4 py-2 rounded-lg text-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
                  style={{ border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="font-['DM_Sans'] font-semibold px-4 py-2 rounded-lg text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: confirmColor, border: 'none', cursor: loading ? 'wait' : 'pointer' }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Processing…
                    </span>
                  ) : confirmLabel}
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

/* ── Incoming Request Card ─────────────────────────────────────────────────── */
function IncomingRequestCard({ req, onApprove, onReject, onUpdateReturn, actioningId }) {
  const status = STATUS_CONFIG[req.status]      ?? STATUS_CONFIG.PENDING;
  const type   = TYPE_CONFIG[req.requestType]  ?? TYPE_CONFIG.DONATION;
  const isLendingApproved = req.requestType === 'LENDING' && req.status === 'APPROVED';
  const isActioning = actioningId === req.id;

  return (
    <div
      className="bg-white rounded-[14px] p-5 transition-shadow hover:shadow-md"
      style={{ border: '1px solid var(--border)', marginBottom: 12 }}
    >
      {/* Top row: requester info + status badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-full font-['DM_Sans'] font-bold text-white"
            style={{ width: 40, height: 40, background: 'var(--secondary)', fontSize: '1rem' }}
          >
            {(req.requesterName ?? 'U')[0].toUpperCase()}
          </div>
          <div>
            <p
              className="font-['DM_Sans'] font-semibold"
              style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}
            >
              {req.requesterName ?? 'Unknown User'}
            </p>
            {req.requesterRating != null && (
              <p className="font-['DM_Sans'] text-xs" style={{ color: 'var(--accent-yellow)' }}>
                {'★'.repeat(Math.round(req.requesterRating))}
                {'☆'.repeat(5 - Math.round(req.requesterRating))}
                {' '}
                <span style={{ color: 'var(--text-muted)' }}>{req.requesterRating.toFixed(1)}</span>
              </p>
            )}
          </div>
        </div>
        <span
          className="font-['DM_Sans'] font-semibold text-xs px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: status.bg, color: status.color, border: `1px solid ${status.border}` }}
        >
          {status.label}
        </span>
      </div>

      {/* Book row */}
      <div className="flex gap-3 items-center mb-3">
        <div
          className="overflow-hidden rounded-[6px] flex-shrink-0"
          style={{ width: 40, height: 52, background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
        >
          {req.bookCoverImageUrl && (
            <img src={req.bookCoverImageUrl} alt={req.bookTitle} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <p
            className="font-['DM_Sans'] font-semibold line-clamp-1"
            style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}
          >
            {req.bookTitle}
          </p>
          <div className="flex items-center gap-2 mt-1">
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
          </div>
        </div>
      </div>

      {/* Request date */}
      {req.createdAt && (
        <p className="font-['DM_Sans'] text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Requested on{' '}
          {new Date(req.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </p>
      )}

      {/* Approve / Reject (PENDING only) */}
      {req.status === 'PENDING' && (
        <div className="flex gap-2.5 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => onApprove(req)}
            disabled={isActioning}
            className="flex items-center gap-1.5 font-['DM_Sans'] font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: '#52C41A',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '7px 18px',
              cursor: isActioning ? 'wait' : 'pointer',
            }}
          >
            <CheckCircle size={15} /> Approve
          </button>
          <button
            onClick={() => onReject(req)}
            disabled={isActioning}
            className="flex items-center gap-1.5 font-['DM_Sans'] font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: '#FF4D4F',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '7px 18px',
              cursor: isActioning ? 'wait' : 'pointer',
            }}
          >
            <XCircle size={15} /> Reject
          </button>
        </div>
      )}

      {/* Return status buttons (APPROVED LENDING only) */}
      {isLendingApproved && (
        <div className="flex flex-wrap gap-2.5 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => onUpdateReturn(req.id, 'RETURNED')}
            disabled={isActioning || req.returnStatus === 'RETURNED'}
            className="flex items-center gap-1.5 font-['DM_Sans'] font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background:    req.returnStatus === 'RETURNED' ? '#F6FFED' : '#52C41A',
              color:         req.returnStatus === 'RETURNED' ? '#389E0D' : 'white',
              border:        req.returnStatus === 'RETURNED' ? '1px solid #B7EB8F' : 'none',
              borderRadius:  8,
              padding:       '7px 18px',
              cursor:        isActioning || req.returnStatus === 'RETURNED' ? 'default' : 'pointer',
            }}
          >
            <RotateCcw size={15} />
            {req.returnStatus === 'RETURNED' ? 'Returned ✓' : 'Mark as Returned'}
          </button>
          <button
            onClick={() => onUpdateReturn(req.id, 'NOT_RETURNED')}
            disabled={isActioning || req.returnStatus === 'NOT_RETURNED'}
            className="flex items-center gap-1.5 font-['DM_Sans'] font-medium text-sm transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background:   req.returnStatus === 'NOT_RETURNED' ? '#FFF7E6' : 'transparent',
              color:        req.returnStatus === 'NOT_RETURNED' ? '#D46B08' : 'var(--text-secondary)',
              border:       `1px solid ${req.returnStatus === 'NOT_RETURNED' ? '#FFD591' : 'var(--border)'}`,
              borderRadius: 8,
              padding:      '7px 18px',
              cursor:       isActioning || req.returnStatus === 'NOT_RETURNED' ? 'default' : 'pointer',
            }}
          >
            Not Returned
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function IncomingRequestsPage() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab]       = useState('');
  const [page, setPage]                 = useState(0);
  const [confirm, setConfirm]           = useState(null); // { req, action: 'approve'|'reject' }
  const [actioningId, setActioningId]   = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['receivedRequests', activeTab, page],
    queryFn:  () =>
      getReceivedRequests({ ...(activeTab ? { status: activeTab } : {}), page, size: 10 }),
    keepPreviousData: true,
  });

  const approveMutation = useMutation({
    mutationFn: approveRequest,
    onMutate: (id) => setActioningId(id),
    onSuccess: () => {
      toast.success('Request approved!');
      queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to approve.'),
    onSettled: () => { setActioningId(null); setConfirm(null); },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectRequest,
    onMutate: (id) => setActioningId(id),
    onSuccess: () => {
      toast.success('Request rejected.');
      queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to reject.'),
    onSettled: () => { setActioningId(null); setConfirm(null); },
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, returnStatus }) => updateReturnStatus(id, { returnStatus }),
    onMutate:   ({ id }) => setActioningId(id),
    onSuccess: () => {
      toast.success('Return status updated.');
      queryClient.invalidateQueries({ queryKey: ['receivedRequests'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to update.'),
    onSettled: () => setActioningId(null),
  });

  const requests   = data?.content    ?? [];
  const totalPages = data?.totalPages ?? 0;

  const handleConfirmAction = () => {
    if (!confirm) return;
    if (confirm.action === 'approve') approveMutation.mutate(confirm.req.id);
    else                              rejectMutation.mutate(confirm.req.id);
  };

  const isConfirmLoading = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', paddingTop: 80 }}>
      <div className="mx-auto" style={{ maxWidth: 800, padding: '32px 16px' }}>

        {/* Header */}
        <h1
          className="font-['Sora'] font-bold"
          style={{ fontSize: '1.75rem', color: 'var(--text-primary)', marginBottom: 4 }}
        >
          Incoming Requests
        </h1>
        <p className="font-['DM_Sans']" style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          Requests for books you've listed
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
            <p className="font-['DM_Sans']" style={{ color: 'var(--text-secondary)' }}>
              Failed to load requests.
            </p>
          </div>

        ) : requests.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
            <p
              className="font-['Sora'] font-semibold mb-2"
              style={{ color: 'var(--text-primary)', fontSize: '1.125rem' }}
            >
              No incoming requests
            </p>
            <p className="font-['DM_Sans']" style={{ color: 'var(--text-secondary)' }}>
              No one has requested your books yet.
            </p>
          </div>

        ) : (
          <>
            {requests.map((req) => (
              <IncomingRequestCard
                key={req.id}
                req={req}
                onApprove={(r) => setConfirm({ req: r, action: 'approve' })}
                onReject={(r)  => setConfirm({ req: r, action: 'reject'  })}
                onUpdateReturn={(id, returnStatus) => returnMutation.mutate({ id, returnStatus })}
                actioningId={actioningId}
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
                <span
                  className="font-['DM_Sans'] text-sm px-3 py-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
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

      {/* Confirm action modal */}
      {confirm && (
        <ConfirmModal
          open
          onClose={() => !isConfirmLoading && setConfirm(null)}
          onConfirm={handleConfirmAction}
          title={confirm.action === 'approve' ? 'Approve Request' : 'Reject Request'}
          description={
            confirm.action === 'approve'
              ? `Approve ${confirm.req.requesterName ?? 'this user'}'s request for "${confirm.req.bookTitle}"?`
              : `Reject ${confirm.req.requesterName ?? 'this user'}'s request for "${confirm.req.bookTitle}"? They will be notified.`
          }
          confirmLabel={confirm.action === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
          confirmColor={confirm.action === 'approve' ? '#52C41A' : '#FF4D4F'}
          loading={isConfirmLoading}
        />
      )}
    </div>
  );
}
