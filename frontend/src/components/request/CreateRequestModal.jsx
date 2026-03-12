import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

import { createRequest } from '../../api/requestApi';
import { getBookById } from '../../api/bookApi';

function addWeeks(weeks) {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CreateRequestModal({ bookId, isDonation, isLending, onClose, onSuccess }) {
  const queryClient = useQueryClient();

  const hasBoth = isDonation && isLending;
  const [requestType, setRequestType] = useState(isDonation ? 'DONATION' : 'LENDING');
  const [noOfWeeks, setNoOfWeeks] = useState(2);

  // Fetch book data for mini-card display
  const { data: book } = useQuery({
    queryKey: ['book', String(bookId)],
    queryFn:  () => getBookById(bookId),
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (data) => createRequest(data),
    onSuccess: () => {
      toast.success('Request sent successfully!');
      queryClient.invalidateQueries({ queryKey: ['book', String(bookId)] });
      queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to send request.');
    },
  });

  const handleSubmit = () => {
    mutation.mutate({
      bookId,
      requestType,
      ...(requestType === 'LENDING' ? { noOfWeeks } : {}),
    });
  };

  return (
    <Transition appear show as={Fragment}>
      <Dialog onClose={onClose} className="relative z-[3000]">
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-250"
            enterFrom="opacity-0 translate-y-4 scale-95"
            enterTo="opacity-100 translate-y-0 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel
              style={{
                width: 480,
                maxWidth: 'calc(100vw - 32px)',
                background: 'white',
                borderRadius: 20,
                padding: 32,
                boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
                position: 'relative',
              }}
            >
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute flex items-center justify-center transition-colors hover:bg-gray-100"
                style={{ top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>

              <Dialog.Title className="font-['Sora'] font-bold" style={{ fontSize: '1.375rem', color: 'var(--text-primary)' }}>
                Request This Book
              </Dialog.Title>

              {/* Book mini card */}
              {book && (
                <div className="flex gap-3 mt-5 mb-5">
                  <div
                    className="overflow-hidden flex-shrink-0"
                    style={{ width: 56, height: 72, borderRadius: 8, background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
                  >
                    {book.coverImageUrl && (
                      <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-['DM_Sans'] font-semibold truncate" style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                      {book.title}
                    </p>
                    <p className="font-['DM_Sans'] truncate" style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      by {book.author}
                    </p>
                    <p className="font-['DM_Sans'] truncate" style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {book.ownerName}
                    </p>
                  </div>
                </div>
              )}

              <hr style={{ borderColor: 'var(--border)' }} />

              {/* Request type selector */}
              {hasBoth && (
                <div className="grid grid-cols-2 gap-3 mt-5">
                  {[
                    { type: 'DONATION', icon: '🎁', label: 'Donation', sub: 'Free, keep it forever' },
                    { type: 'LENDING', icon: '📖', label: 'Borrow', sub: 'Return after N weeks' },
                  ].map(({ type, icon, label, sub }) => {
                    const active = requestType === type;
                    return (
                      <button
                        key={type}
                        className="flex flex-col items-center gap-1 py-4 transition-all duration-200 font-['DM_Sans']"
                        style={{
                          borderRadius: 12,
                          border: `2px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                          background: active ? 'var(--primary-light)' : 'white',
                          cursor: 'pointer',
                        }}
                        onClick={() => setRequestType(type)}
                      >
                        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
                        <span className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{label}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{sub}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Weeks slider (lending) */}
              {requestType === 'LENDING' && (
                <div className="mt-5 fade-in-up">
                  <p className="font-['DM_Sans'] font-semibold mb-3" style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                    Borrow for:{' '}
                    <span style={{ color: 'var(--primary)' }}>
                      {noOfWeeks} {noOfWeeks === 1 ? 'week' : 'weeks'}
                    </span>
                  </p>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    value={noOfWeeks}
                    onChange={(e) => setNoOfWeeks(Number(e.target.value))}
                    className="w-full"
                    style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <div
                    className="flex justify-between font-['DM_Sans'] mt-1"
                    style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}
                  >
                    <span>1 week</span>
                    <span>12 weeks</span>
                  </div>
                  <p className="mt-2 font-['DM_Sans']" style={{ color: 'var(--primary)', fontSize: '0.8125rem' }}>
                    Due date: {addWeeks(noOfWeeks)}
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                className="w-full mt-6 font-['DM_Sans'] font-semibold text-white transition-all duration-200 active:scale-[0.97] disabled:opacity-60"
                style={{
                  height: 52,
                  borderRadius: 'var(--radius-btn)',
                  background: 'var(--primary)',
                  border: 'none',
                  fontSize: '1rem',
                  cursor: mutation.isPending ? 'wait' : 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-dark)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--primary)')}
                onClick={handleSubmit}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Sending…
                  </span>
                ) : (
                  'Send Request'
                )}
              </button>

              <button
                className="w-full mt-2 font-['DM_Sans'] transition-colors hover:underline"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.875rem', cursor: 'pointer', padding: '8px 0' }}
                onClick={onClose}
              >
                Cancel
              </button>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
