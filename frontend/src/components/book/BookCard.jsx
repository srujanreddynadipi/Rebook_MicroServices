import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

const CATEGORY_LABELS = {
  ENGINEERING: { emoji: '🔧', label: 'Engineering' },
  MEDICAL: { emoji: '💊', label: 'Medical' },
  NOVELS: { emoji: '📖', label: 'Novels' },
  SCHOOL: { emoji: '🏫', label: 'School' },
  COMPETITIVE_EXAMS: { emoji: '🏆', label: 'Competitive' },
  SELF_HELP: { emoji: '🌟', label: 'Self Help' },
  STORY_BOOKS: { emoji: '👶', label: 'Story Books' },
  HISTORY: { emoji: '🕌', label: 'History' },
  LANGUAGE: { emoji: '🌍', label: 'Language' },
  OTHER: { emoji: '📚', label: 'Other' },
};

const STATUS_CONFIG = {
  AVAILABLE: { label: '● Available', bg: 'rgba(82,196,26,0.9)' },
  REQUESTED: { label: '● Requested', bg: 'rgba(250,173,20,0.9)' },
  BORROWED: { label: '● Borrowed', bg: 'rgba(255,77,79,0.9)' },
};

const CONDITION_LABELS = {
  NEW: 'New',
  USED_GOOD: 'Good',
  USED_OLD: 'Old',
};

function getInitials(name) {
  const safeName = typeof name === 'string' ? name : '';
  return safeName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
}

export default function BookCard({ book, onRequestClick }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const status = STATUS_CONFIG[book.status] ?? STATUS_CONFIG.AVAILABLE;
  const category = CATEGORY_LABELS[book.category];
  const isOwn = user && String(book.ownerId) === String(user.id);
  const canRequest = book.status === 'AVAILABLE' && !!user && !isOwn;

  const handleCardClick = () => navigate(`/books/${book.id}`);

  const handleRequest = (e) => {
    e.stopPropagation();
    onRequestClick?.(book);
  };

  const handleViewDetails = (e) => {
    e.stopPropagation();
    navigate(`/books/${book.id}`);
  };

  return (
    <article
      className="relative overflow-hidden cursor-pointer"
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
      }}
      onClick={handleCardClick}
    >
      {/* ── Image Zone ─────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          height: 200,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          flexShrink: 0,
        }}
      >
        {book.coverImageUrl && (
          <img
            src={book.coverImageUrl}
            alt={book.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}

        {/* Top-left: type badges */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap">
          {book.isDonation && (
            <span
              className="font-['DM_Sans'] font-semibold text-white"
              style={{ background: 'var(--accent-yellow)', borderRadius: 12, padding: '3px 10px', fontSize: '0.7rem' }}
            >
              🎁 Donate
            </span>
          )}
          {book.isLending && (
            <span
              className="font-['DM_Sans'] font-semibold text-white"
              style={{ background: 'var(--accent-orange)', borderRadius: 12, padding: '3px 10px', fontSize: '0.7rem' }}
            >
              📖 Lend
            </span>
          )}
        </div>

        {/* Top-right: status badge */}
        <span
          className="absolute top-2.5 right-2.5 font-['DM_Sans'] font-semibold text-white"
          style={{
            background: status.bg,
            borderRadius: 12,
            padding: '3px 10px',
            fontSize: '0.7rem',
            backdropFilter: 'blur(4px)',
          }}
        >
          {status.label}
        </span>

        {/* Bottom-left: distance badge */}
        {book.distanceKm != null && (
          <span
            className="absolute bottom-2.5 left-2.5 font-['DM_Sans'] text-white"
            style={{
              background: 'rgba(0,0,0,0.55)',
              borderRadius: 12,
              padding: '3px 10px',
              fontSize: '0.75rem',
              backdropFilter: 'blur(4px)',
            }}
          >
            📍 {book.distanceKm.toFixed(1)} km
          </span>
        )}
      </div>

      {/* ── Content Zone ───────────────────────────────────────────────────── */}
      <div className="p-4">
        {/* Category chip */}
        <span
          className="inline-block font-['DM_Sans'] font-semibold uppercase"
          style={{
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            borderRadius: 10,
            padding: '2px 10px',
            fontSize: '0.7rem',
            letterSpacing: '0.04em',
          }}
        >
          {category ? `${category.emoji} ${category.label}` : book.category}
        </span>

        {/* Condition badge (inline, right of category) */}
        {book.condition && (
          <span
            className="inline-block ml-1.5 font-['DM_Sans'] font-medium"
            style={{
              background: '#F7F8FC',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '2px 8px',
              fontSize: '0.7rem',
            }}
          >
            {CONDITION_LABELS[book.condition] ?? book.condition}
          </span>
        )}

        {/* Title */}
        <h3
          className="mt-2 font-['Sora'] font-semibold"
          style={{
            color: 'var(--text-primary)',
            fontSize: '1rem',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {book.title}
        </h3>

        {/* Author */}
        <p
          className="mt-0.5 font-['DM_Sans']"
          style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}
        >
          by {book.author}
        </p>

        {/* Owner row */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 font-['DM_Sans']"
              style={{ background: 'var(--primary)', fontSize: '0.625rem' }}
            >
              {getInitials(book.ownerName)}
            </div>
            <span
              className="font-['DM_Sans'] font-medium truncate"
              style={{ color: 'var(--text-primary)', fontSize: '0.8125rem' }}
            >
              {book.ownerName ?? 'Unknown'}
            </span>
          </div>

          {book.city && (
            <span
              className="flex items-center gap-0.5 flex-shrink-0 font-['DM_Sans']"
              style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}
            >
              <MapPin size={11} />
              {book.city}
            </span>
          )}
        </div>

        {/* Action row */}
        <div
          className="mt-3 flex gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex-1 font-['DM_Sans'] font-medium transition-all duration-200"
            style={{
              height: 38,
              borderRadius: 8,
              border: '1.5px solid var(--border)',
              background: 'white',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.color = 'var(--primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onClick={handleViewDetails}
          >
            View Details
          </button>

          {canRequest && (
            <button
              className="flex-1 text-white font-['DM_Sans'] font-semibold transition-all duration-200"
              style={{
                height: 38,
                borderRadius: 8,
                background: 'var(--primary)',
                border: 'none',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-dark)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--primary)')}
              onClick={handleRequest}
            >
              Request
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
