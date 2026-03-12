import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import * as bookApi from '../../api/bookApi';

const STATUS_COLORS = {
  AVAILABLE: { bg: 'rgba(82,196,26,0.12)', color: '#389E0D', label: 'Available' },
  REQUESTED: { bg: 'rgba(250,173,20,0.12)', color: '#D48806', label: 'Requested' },
  BORROWED: { bg: 'rgba(255,77,79,0.12)', color: '#CF1322', label: 'Borrowed' },
};

export default function MyBooksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['myBooks', page],
    queryFn: () => bookApi.getMyBooks({ page, size: 12 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => bookApi.deleteBook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success('Book removed');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to delete'),
  });

  const handleDelete = (id, title) => {
    if (window.confirm(`Delete "${title}"? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const books = data?.content || [];
  const totalPages = data?.totalPages || 0;

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: 'calc(100vh - 64px)', padding: '32px 24px' }}>
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '2rem', color: 'var(--text-primary)', margin: 0 }}>
              My Books
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9375rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {data?.totalElements ?? '–'} books listed
            </p>
          </div>
          <Link to="/books/add"
            className="flex items-center gap-2 no-underline"
            style={{
              height: 44, paddingLeft: 20, paddingRight: 20, borderRadius: 'var(--radius-btn)',
              background: 'var(--primary)', color: '#fff', fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600, fontSize: '0.9375rem', transition: 'background 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary-dark)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'var(--primary)'; }}
          >
            <Plus size={18} /> List a Book
          </Link>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 120, borderRadius: 'var(--radius-card)', overflow: 'hidden' }} className="skeleton" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && books.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen size={56} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: 8 }}>
              No books listed yet
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--text-muted)', marginBottom: 24 }}>
              Start sharing books with your community
            </p>
            <Link to="/books/add" className="no-underline"
              style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 8, paddingLeft: 24, paddingRight: 24,
                borderRadius: 'var(--radius-btn)', background: 'var(--primary)', color: '#fff',
                fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
              <Plus size={18} /> List Your First Book
            </Link>
          </div>
        )}

        {/* Book list */}
        {!isLoading && books.length > 0 && (
          <div className="flex flex-col gap-4">
            {books.map((book) => {
              const st = STATUS_COLORS[book.status] || STATUS_COLORS.AVAILABLE;
              const coverUrl = book.imageUrls?.[0];
              return (
                <div key={book.id}
                  className="flex gap-4"
                  style={{
                    background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)',
                    padding: 16, boxShadow: 'var(--shadow-card)', transition: 'box-shadow 0.2s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-hover)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
                >
                  {/* Cover */}
                  <div className="flex-shrink-0" style={{ width: 80, height: 110, borderRadius: 8, overflow: 'hidden' }}>
                    {coverUrl ? (
                      <img src={coverUrl} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                        <BookOpen size={28} color="#fff" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/books/${book.id}`} className="no-underline"
                          style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                          {book.title}
                        </Link>
                        <p className="mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                          by {book.author}
                        </p>
                      </div>

                      {/* Status badge */}
                      <span className="flex-shrink-0"
                        style={{ padding: '3px 10px', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.75rem',
                          background: st.bg, color: st.color }}>
                        ● {st.label}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span style={{ padding: '2px 10px', borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary)',
                        fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {book.category?.replace(/_/g, ' ')}
                      </span>
                      {book.isDonation && (
                        <span style={{ padding: '2px 8px', borderRadius: 10, background: '#FFB830', color: '#fff',
                          fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.7rem' }}>🎁 Donate</span>
                      )}
                      {book.isLending && (
                        <span style={{ padding: '2px 8px', borderRadius: 10, background: 'var(--accent-orange)', color: '#fff',
                          fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.7rem' }}>📖 Lend</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      <button onClick={() => navigate(`/books/edit/${book.id}`)}
                        className="flex items-center gap-1.5 border-none cursor-pointer"
                        style={{
                          height: 34, paddingLeft: 14, paddingRight: 14, borderRadius: 8,
                          background: 'var(--bg-page)', fontFamily: "'DM Sans', sans-serif",
                          fontWeight: 500, fontSize: '0.8125rem', color: 'var(--text-secondary)',
                          border: '1px solid var(--border)', transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button onClick={() => handleDelete(book.id, book.title)}
                        className="flex items-center gap-1.5 border-none cursor-pointer"
                        style={{
                          height: 34, paddingLeft: 14, paddingRight: 14, borderRadius: 8,
                          background: 'var(--bg-page)', fontFamily: "'DM Sans', sans-serif",
                          fontWeight: 500, fontSize: '0.8125rem', color: 'var(--text-secondary)',
                          border: '1px solid var(--border)', transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i)}
                className="border-none cursor-pointer"
                style={{
                  width: 36, height: 36, borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.875rem',
                  background: page === i ? 'var(--primary)' : '#fff', color: page === i ? '#fff' : 'var(--text-secondary)',
                  border: page === i ? 'none' : '1px solid var(--border)', transition: 'all 0.2s',
                }}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
