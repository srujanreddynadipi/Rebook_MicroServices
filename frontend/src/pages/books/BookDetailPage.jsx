import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { MapPin, Send, Star, Loader2 } from 'lucide-react';

import { getBookById, getRecommendations } from '../../api/bookApi';
import { askAboutBook, getBookAiStatus } from '../../api/aiApi';
import useAuth from '../../hooks/useAuth';
import BookCard from '../../components/book/BookCard';
import CreateRequestModal from '../../components/request/CreateRequestModal';

// ── Shared look-ups ────────────────────────────────────────────────────────
const CATEGORY_LABELS = {
  ENGINEERING: '🔧 Engineering',
  MEDICAL: '💊 Medical',
  NOVELS: '📖 Novels',
  SCHOOL: '🏫 School',
  COMPETITIVE_EXAMS: '🏆 Competitive',
  SELF_HELP: '🌟 Self Help',
  STORY_BOOKS: '👶 Story Books',
  HISTORY: '🕌 History',
  LANGUAGE: '🌍 Language',
  OTHER: '📚 Other',
};

const CONDITION_LABELS = { NEW: 'New', USED_GOOD: 'Good', USED_OLD: 'Old' };

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

// ── Skeleton loader ────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div style={{ padding: '32px max(24px, calc(50% - 720px))', background: 'var(--bg-page)', minHeight: '100vh' }}>
      <div className="grid gap-10" style={{ gridTemplateColumns: '1fr 380px' }}>
        <div>
          <div className="skeleton" style={{ height: 420, borderRadius: 16 }} />
          <div className="skeleton mt-6" style={{ height: 300, borderRadius: 14 }} />
        </div>
        <div>
          <div className="skeleton" style={{ height: 340, borderRadius: 14 }} />
          <div className="skeleton mt-5" style={{ height: 280, borderRadius: 14 }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BookDetailPage
// ══════════════════════════════════════════════════════════════════════════════
export default function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedImage, setSelectedImage] = useState(0);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // ── Fetch book ─────────────────────────────────────────────────────────
  const { data: book, isLoading, isError } = useQuery({
    queryKey: ['book', id],
    queryFn: () => getBookById(id),
  });

  // ── Fetch recommendations ─────────────────────────────────────────────
  const { data: recommendations = [] } = useQuery({
    queryKey: ['recommendations', id],
    queryFn: () => getRecommendations(id),
    enabled: !!book,
  });

  // Reset selected image when book changes
  useEffect(() => setSelectedImage(0), [id]);

  if (isLoading) return <DetailSkeleton />;

  if (isError || !book) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4" style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
        <span style={{ fontSize: '3rem' }}>😕</span>
        <p className="font-['Sora'] font-semibold" style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
          Book not found
        </p>
        <button
          onClick={() => navigate('/books')}
          className="font-['DM_Sans'] font-semibold"
          style={{ height: 42, padding: '0 24px', borderRadius: 'var(--radius-btn)', border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.9375rem' }}
        >
          Browse Books
        </button>
      </div>
    );
  }

  const isOwn = user && String(book.ownerId) === String(user.id);
  const canRequest = book.status === 'AVAILABLE' && !!user && !isOwn;
  const images = book.imageUrls?.length ? book.imageUrls : book.coverImageUrl ? [book.coverImageUrl] : [];
  const category = CATEGORY_LABELS[book.category] ?? book.category;
  const condition = CONDITION_LABELS[book.condition] ?? book.condition;
  const keywords = book.keywords ? book.keywords.split(',').map((k) => k.trim()).filter(Boolean) : [];

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <div
        className="grid gap-10"
        style={{
          padding: '32px max(24px, calc(50% - 720px))',
          gridTemplateColumns: '1fr 380px',
        }}
      >
        {/* ── LEFT COLUMN ──────────────────────────────────────────────────── */}
        <div className="min-w-0">

          {/* Image Gallery */}
          <div>
            <div
              className="relative overflow-hidden"
              style={{
                height: 420,
                borderRadius: 16,
                border: '1px solid var(--border)',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              {images.length > 0 && (
                <img
                  src={images[selectedImage]}
                  alt={book.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2.5 mt-3">
                {images.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className="overflow-hidden flex-shrink-0 transition-opacity hover:opacity-80"
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 8,
                      border: idx === selectedImage ? '2px solid var(--primary)' : '1px solid var(--border)',
                      padding: 0,
                      cursor: 'pointer',
                      background: 'transparent',
                    }}
                  >
                    <img src={url} alt={`${book.title} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Book Info Card */}
          <div
            className="mt-6"
            style={{
              background: 'white',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--border)',
              padding: 28,
            }}
          >
            <h1 className="font-['Sora'] font-bold" style={{ fontSize: '1.75rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {book.title}
            </h1>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-3 mb-3">
              <span
                className="font-['DM_Sans'] font-semibold"
                style={{ background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 10, padding: '3px 12px', fontSize: '0.8125rem' }}
              >
                {category}
              </span>
              <span
                className="font-['DM_Sans'] font-medium"
                style={{ background: '#F7F8FC', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 10px', fontSize: '0.8125rem' }}
              >
                {condition}
              </span>
              {book.isDonation && (
                <span className="font-['DM_Sans'] font-semibold text-white" style={{ background: 'var(--accent-yellow)', borderRadius: 10, padding: '3px 12px', fontSize: '0.8125rem' }}>
                  🎁 Donation
                </span>
              )}
              {book.isLending && (
                <span className="font-['DM_Sans'] font-semibold text-white" style={{ background: 'var(--accent-orange)', borderRadius: 10, padding: '3px 12px', fontSize: '0.8125rem' }}>
                  📖 Lending
                </span>
              )}
            </div>

            {/* Author / Publisher / ISBN */}
            <p className="font-['DM_Sans']" style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
              by <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{book.author}</span>
            </p>
            {(book.publisher || book.isbn) && (
              <p className="font-['DM_Sans'] mt-1" style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                {book.publisher && <>{book.publisher}</>}
                {book.publisher && book.isbn && ' · '}
                {book.isbn && <>ISBN: {book.isbn}</>}
              </p>
            )}

            {/* City + distance */}
            {book.city && (
              <p className="flex items-center gap-1.5 mt-3 font-['DM_Sans']" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                <MapPin size={14} style={{ color: 'var(--primary)' }} />
                {book.city}
                {book.distanceKm != null && (
                  <span style={{ color: 'var(--text-muted)' }}> · {book.distanceKm.toFixed(1)} km away</span>
                )}
              </p>
            )}

            {/* Keywords */}
            {keywords.length > 0 && (
              <>
                <hr className="my-5" style={{ borderColor: 'var(--border)' }} />
                <p className="font-['DM_Sans'] font-medium mb-2" style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                  About this book
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className="font-['DM_Sans']"
                      style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 12px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Owner section */}
            <div
              className="mt-5 flex items-center gap-3"
              style={{ background: 'var(--bg-page)', borderRadius: 10, padding: 16 }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0 font-bold text-white font-['DM_Sans']"
                style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', fontSize: '0.875rem' }}
              >
                {getInitials(book.ownerName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-['DM_Sans'] font-semibold truncate" style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                  {book.ownerName ?? 'Unknown'}
                </p>
                {book.city && (
                  <p className="font-['DM_Sans']" style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    📍 {book.city}
                  </p>
                )}
              </div>
              <Link
                to={`/profile/${book.ownerId}`}
                className="font-['DM_Sans'] font-medium flex-shrink-0 hover:underline"
                style={{ color: 'var(--primary)', fontSize: '0.8125rem' }}
              >
                View Profile →
              </Link>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (sticky) ───────────────────────────────────────── */}
        <div className="flex flex-col gap-5" style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>

          {/* Availability Card */}
          <AvailabilityCard
            book={book}
            canRequest={canRequest}
            isOwn={isOwn}
            user={user}
            onRequestClick={() => setShowRequestModal(true)}
          />

          {/* AI Q&A Panel */}
          <AiQaPanel bookId={id} />

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div
              style={{
                background: 'white',
                borderRadius: 'var(--radius-card)',
                border: '1px solid var(--border)',
                padding: 24,
              }}
            >
              <h3 className="font-['Sora'] font-semibold mb-4" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                Similar Books
              </h3>
              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-1">
                {recommendations.slice(0, 4).map((rec) => (
                  <MiniBookCard key={rec.id} book={rec} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Responsive: stack on mobile */}
      <style>{`
        @media (max-width: 1023px) {
          .grid[style*="1fr 380px"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="sticky"][style*="top: 80px"] {
            position: static !important;
          }
        }
      `}</style>

      {/* Request Modal */}
      {showRequestModal && (
        <CreateRequestModal
          bookId={book.id}
          isDonation={book.isDonation}
          isLending={book.isLending}
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => setShowRequestModal(false)}
        />
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// AvailabilityCard
// ══════════════════════════════════════════════════════════════════════════════
function AvailabilityCard({ book, canRequest, isOwn, user, onRequestClick }) {
  const navigate = useNavigate();

  const statusBanner = {
    AVAILABLE: { bg: '#F6FFED', border: '#B7EB8F', text: '● This book is available', color: '#389E0D' },
    REQUESTED: { bg: '#FFFBE6', border: '#FFE58F', text: '● Someone has requested this', color: '#D46B08' },
    BORROWED: { bg: '#FFF2F0', border: '#FFCCC7', text: '● Currently borrowed', color: 'var(--danger)' },
  };
  const banner = statusBanner[book.status] ?? statusBanner.AVAILABLE;

  return (
    <div style={{ background: 'white', border: '2px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 24 }}>
      {/* Status banner */}
      <div
        className="font-['DM_Sans'] font-semibold"
        style={{
          background: banner.bg,
          borderBottom: `1px solid ${banner.border}`,
          color: banner.color,
          padding: '10px 24px',
          margin: '-24px -24px 20px',
          borderRadius: '14px 14px 0 0',
          fontSize: '0.875rem',
        }}
      >
        {banner.text}
      </div>

      {/* Type indicators */}
      <div className="flex flex-col gap-2">
        {book.isDonation && (
          <div className="flex items-center gap-3" style={{ background: '#FFFBF0', border: '1px solid #FFD666', borderRadius: 10, padding: '12px 16px' }}>
            <span style={{ fontSize: '1.375rem' }}>🎁</span>
            <div>
              <p className="font-['DM_Sans'] font-semibold" style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>Available to Donate</p>
              <p className="font-['DM_Sans']" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Free of cost</p>
            </div>
          </div>
        )}
        {book.isLending && (
          <div className="flex items-center gap-3" style={{ background: '#FFF7F0', border: '1px solid #FFB899', borderRadius: 10, padding: '12px 16px' }}>
            <span style={{ fontSize: '1.375rem' }}>📖</span>
            <div>
              <p className="font-['DM_Sans'] font-semibold" style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>Available to Borrow</p>
              <p className="font-['DM_Sans']" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Request for a few weeks</p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {canRequest && (
        <div className="flex flex-col gap-2 mt-4">
          {book.isDonation && (
            <button
              className="w-full font-['DM_Sans'] font-semibold text-white transition-all duration-200 active:scale-[0.97]"
              style={{ height: 52, borderRadius: 'var(--radius-btn)', background: 'var(--accent-yellow)', border: 'none', fontSize: '1rem', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(0.92)')}
              onMouseLeave={(e) => (e.currentTarget.style.filter = '')}
              onClick={onRequestClick}
            >
              🎁 Request for Donation
            </button>
          )}
          {book.isLending && (
            <button
              className="w-full font-['DM_Sans'] font-semibold text-white transition-all duration-200 active:scale-[0.97]"
              style={{ height: 52, borderRadius: 'var(--radius-btn)', background: 'var(--primary)', border: 'none', fontSize: '1rem', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-dark)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--primary)')}
              onClick={onRequestClick}
            >
              📖 Request to Borrow
            </button>
          )}
        </div>
      )}

      {/* Not logged in CTA */}
      {!user && book.status === 'AVAILABLE' && (
        <button
          className="w-full mt-4 font-['DM_Sans'] font-semibold transition-all duration-200"
          style={{
            height: 52,
            borderRadius: 'var(--radius-btn)',
            border: '2px dashed var(--border)',
            background: 'white',
            color: 'var(--text-secondary)',
            fontSize: '0.9375rem',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/login')}
        >
          Login to Request
        </button>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// AI Q&A Panel
// ══════════════════════════════════════════════════════════════════════════════
function AiQaPanel({ bookId }) {
  const [messages, setMessages] = useState([]); // { role: 'user' | 'ai', text }
  const [question, setQuestion] = useState('');
  const chatEndRef = useRef(null);

  const { data: aiStatus } = useQuery({
    queryKey: ['aiStatus', bookId],
    queryFn: () => getBookAiStatus(bookId),
  });

  const indexed = aiStatus?.indexed ?? false;

  const askMutation = useMutation({
    mutationFn: (q) => askAboutBook(bookId, q),
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: 'ai', text: data.answer ?? 'No answer available.' }]);
    },
    onError: () => {
      setMessages((prev) => [...prev, { role: 'ai', text: 'Sorry, something went wrong. Try again.' }]);
      toast.error('AI query failed');
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || askMutation.isPending) return;
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setQuestion('');
    askMutation.mutate(q);
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, #1A0F3C, #2D1B69)', borderRadius: 'var(--radius-card)', padding: 24, color: 'white' }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '1.375rem' }}>🤖</span>
          <h3 className="font-['Sora'] font-semibold" style={{ fontSize: '1rem' }}>Ask AI About This Book</h3>
        </div>
        <span
          className="font-['DM_Sans'] flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10,
            padding: '3px 10px',
            fontSize: '0.7rem',
          }}
        >
          Powered by OpenAI
        </span>
      </div>

      {indexed ? (
        <>
          {/* Chat history */}
          <div
            className="flex flex-col gap-3 hide-scrollbar"
            style={{ maxHeight: 280, overflowY: 'auto', marginBottom: messages.length ? 16 : 0 }}
          >
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="font-['JetBrains_Mono']"
                  style={{
                    background: msg.role === 'user' ? 'rgba(255,255,255,0.15)' : 'rgba(132,94,247,0.3)',
                    borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    padding: '10px 14px',
                    maxWidth: '88%',
                    fontSize: '0.8125rem',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {askMutation.isPending && (
              <div className="flex justify-start">
                <div
                  className="flex items-center gap-2"
                  style={{ background: 'rgba(132,94,247,0.3)', borderRadius: '12px 12px 12px 4px', padding: '10px 14px' }}
                >
                  <Loader2 size={14} className="animate-spin" />
                  <span className="font-['DM_Sans']" style={{ fontSize: '0.8125rem', opacity: 0.8 }}>Thinking…</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input row */}
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about this book…"
              className="flex-1 font-['DM_Sans']"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 10,
                color: 'white',
                padding: '10px 14px',
                fontSize: '0.875rem',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(132,94,247,0.6)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.2)')}
            />
            <button
              type="submit"
              disabled={askMutation.isPending || !question.trim()}
              className="flex items-center justify-center flex-shrink-0 transition-all duration-200"
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: 'var(--secondary)',
                border: 'none',
                color: 'white',
                cursor: askMutation.isPending ? 'wait' : 'pointer',
                opacity: question.trim() ? 1 : 0.5,
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </>
      ) : (
        /* Not indexed */
        <div className="text-center py-6">
          <span style={{ fontSize: '2.5rem' }}>📄</span>
          <p className="font-['DM_Sans'] font-medium mt-3" style={{ fontSize: '0.9375rem' }}>
            AI analysis not available
          </p>
          <p className="font-['DM_Sans'] mt-1" style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>
            This book hasn&apos;t been indexed yet.
          </p>
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// MiniBookCard (for recommendations strip)
// ══════════════════════════════════════════════════════════════════════════════
function MiniBookCard({ book }) {
  const navigate = useNavigate();

  return (
    <button
      className="flex-shrink-0 text-left overflow-hidden transition-all duration-200 hover:shadow-md"
      style={{
        width: 150,
        background: 'var(--bg-page)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 0,
        cursor: 'pointer',
      }}
      onClick={() => navigate(`/books/${book.id}`)}
    >
      <div
        className="overflow-hidden"
        style={{ height: 100, background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
      >
        {book.coverImageUrl && (
          <img
            src={book.coverImageUrl}
            alt={book.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
      </div>
      <div className="p-2.5">
        <p
          className="font-['Sora'] font-semibold"
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-primary)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.3,
          }}
        >
          {book.title}
        </p>
        <p className="font-['DM_Sans'] mt-0.5 truncate" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          {book.author}
        </p>
      </div>
    </button>
  );
}
