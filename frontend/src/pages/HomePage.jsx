import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowRight, BookOpen, MessageCircle, CheckCircle } from 'lucide-react';

import { getPopularBooks } from '../api/bookApi';

/* ── Static data ───────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { key: 'ENGINEERING',       label: 'Engineering',  icon: '⚙️' },
  { key: 'MEDICAL',           label: 'Medical',      icon: '🏥' },
  { key: 'NOVELS',            label: 'Novels',       icon: '📚' },
  { key: 'SCHOOL',            label: 'School',       icon: '🏫' },
  { key: 'COMPETITIVE_EXAMS', label: 'Competitive',  icon: '🏆' },
  { key: 'SELF_HELP',         label: 'Self Help',    icon: '🌱' },
  { key: 'STORY_BOOKS',       label: 'Stories',      icon: '📖' },
  { key: 'HISTORY',           label: 'History',      icon: '🏛️' },
  { key: 'LANGUAGE',          label: 'Language',     icon: '🌍' },
  { key: 'OTHER',             label: 'Other',        icon: '✨' },
];

const HOW_IT_WORKS = [
  {
    Icon: BookOpen,
    step: '01',
    title: 'Post Your Book',
    desc: 'List books you own and choose to donate or lend them. Add photos and details to help readers find the right book.',
  },
  {
    Icon: MessageCircle,
    step: '02',
    title: 'Send Request',
    desc: 'Browse books near you and send a lending or donation request to the owner in one tap.',
  },
  {
    Icon: CheckCircle,
    step: '03',
    title: 'Exchange & Read',
    desc: 'Connect with the owner, arrange the handoff, and enjoy your next great read!',
  },
];

const STATS = [
  { value: '5,000+', label: 'Books Listed'    },
  { value: '2,400+', label: 'Exchanges Made'  },
  { value: '1,200+', label: 'Active Members'  },
  { value: '9',      label: 'Cities Covered'  },
];

/* ── Popular Book Card ────────────────────────────────────────────────────── */
function PopularBookCard({ book }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/books/${book.id}`)}
      className="flex-shrink-0 text-left focus:outline-none"
      style={{ width: 140 }}
    >
      <div
        className="overflow-hidden rounded-[10px] mb-2 transition-transform hover:scale-[1.04]"
        style={{ width: 140, height: 196, background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
      >
        {book.coverImageUrl && (
          <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover" />
        )}
      </div>
      <p
        className="font-['DM_Sans'] font-semibold line-clamp-2"
        style={{ color: 'var(--text-primary)', fontSize: '0.875rem', lineHeight: 1.3 }}
      >
        {book.title}
      </p>
      <p className="font-['DM_Sans'] mt-0.5" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
        {book.author}
      </p>
    </button>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');

  const { data: popularBooks = [], isLoading: popularLoading } = useQuery({
    queryKey: ['popularBooks'],
    queryFn:  getPopularBooks,
    staleTime: 5 * 60_000,
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/books?keyword=${encodeURIComponent(searchInput.trim())}`);
    } else {
      navigate('/books');
    }
  };

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: 'linear-gradient(135deg, var(--bg-dark) 0%, #1a0d3d 60%, #0d1a2e 100%)',
          paddingTop: 120,
          paddingBottom: 80,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative blobs */}
        <div style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,201,167,0.12) 0%, transparent 70%)',
          top: -100, right: -100, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(132,94,247,0.12) 0%, transparent 70%)',
          bottom: -50, left: -100, pointerEvents: 'none',
        }} />

        <div
          className="mx-auto px-4 text-center"
          style={{ maxWidth: 760, position: 'relative', zIndex: 1 }}
        >
          {/* Eyebrow */}
          <span
            className="inline-block font-['DM_Sans'] font-semibold mb-4 px-3 py-1 rounded-full text-sm"
            style={{
              background: 'rgba(0,201,167,0.15)',
              color: 'var(--primary)',
              border: '1px solid rgba(0,201,167,0.3)',
            }}
          >
            📚 India's Book-Sharing Community
          </span>

          {/* Headline */}
          <h1
            className="font-['Sora'] font-extrabold mb-5"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', lineHeight: 1.15, color: 'white' }}
          >
            Find Your Next Book —{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Share What You've Read
            </span>
          </h1>

          <p
            className="font-['DM_Sans'] mx-auto mb-8"
            style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.65)', maxWidth: 520 }}
          >
            Donate or lend your books to readers nearby. Request books you need from your
            community. Free, simple, and local.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2 mx-auto" style={{ maxWidth: 520 }}>
            <div className="relative flex-1">
              <Search
                size={18}
                style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: 'rgba(255,255,255,0.4)', pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by title, author, or keyword…"
                className="w-full font-['DM_Sans'] outline-none placeholder:text-white/30"
                style={{
                  height: 52, borderRadius: 12, padding: '0 16px 0 44px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1.5px solid rgba(255,255,255,0.15)',
                  color: 'white', fontSize: '0.9375rem',
                }}
              />
            </div>
            <button
              type="submit"
              className="font-['DM_Sans'] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]"
              style={{
                height: 52, padding: '0 24px', borderRadius: 12,
                background: 'var(--primary)', border: 'none', cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Search
            </button>
          </form>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-8 mt-12">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p
                  className="font-['Sora'] font-bold"
                  style={{ fontSize: '1.5rem', color: 'white' }}
                >
                  {value}
                </p>
                <p className="font-['DM_Sans'] text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular Books ─────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-page)', padding: '64px 0' }}>
        <div className="mx-auto px-4" style={{ maxWidth: 1100 }}>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2
                className="font-['Sora'] font-bold"
                style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}
              >
                Popular Books
              </h2>
              <p className="font-['DM_Sans'] mt-1" style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                Trending on ReBook right now
              </p>
            </div>
            <Link
              to="/books"
              className="font-['DM_Sans'] font-semibold flex items-center gap-1 transition-opacity hover:opacity-75"
              style={{ color: 'var(--primary)', fontSize: '0.9375rem' }}
            >
              View all <ArrowRight size={16} />
            </Link>
          </div>

          {popularLoading ? (
            <div className="flex gap-5 overflow-x-auto pb-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-shrink-0" style={{ width: 140 }}>
                  <div className="skeleton rounded-[10px]" style={{ width: 140, height: 196 }} />
                  <div className="skeleton mt-2" style={{ height: 14, width: '80%' }} />
                  <div className="skeleton mt-1" style={{ height: 12, width: '55%' }} />
                </div>
              ))}
            </div>
          ) : popularBooks.length === 0 ? (
            <p
              className="font-['DM_Sans'] py-10 text-center"
              style={{ color: 'var(--text-muted)' }}
            >
              No popular books yet — be the first to list one!
            </p>
          ) : (
            <div
              className="flex gap-5 overflow-x-auto pb-3"
              style={{ scrollbarWidth: 'thin' }}
            >
              {popularBooks.map((book) => (
                <PopularBookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────────────────── */}
      <section style={{ background: 'white', padding: '64px 0' }}>
        <div className="mx-auto px-4" style={{ maxWidth: 1100 }}>
          <h2
            className="font-['Sora'] font-bold text-center mb-2"
            style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}
          >
            Browse by Category
          </h2>
          <p className="font-['DM_Sans'] text-center mb-8" style={{ color: 'var(--text-secondary)' }}>
            Find books across 10 categories
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: 12,
            }}
          >
            {CATEGORIES.map(({ key, label, icon }) => (
              <Link
                key={key}
                to={`/books?category=${key}`}
                className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{
                  background: 'var(--bg-page)',
                  border: '1px solid var(--border)',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '1.75rem' }}>{icon}</span>
                <span
                  className="font-['DM_Sans'] font-medium text-center"
                  style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.2 }}
                >
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-page)', padding: '64px 0' }}>
        <div className="mx-auto px-4" style={{ maxWidth: 900 }}>
          <h2
            className="font-['Sora'] font-bold text-center mb-2"
            style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}
          >
            How It Works
          </h2>
          <p className="font-['DM_Sans'] text-center mb-12" style={{ color: 'var(--text-secondary)' }}>
            Share books in three easy steps
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 24,
            }}
          >
            {HOW_IT_WORKS.map(({ Icon, step, title, desc }) => (
              <div
                key={step}
                className="text-center rounded-2xl p-8 transition-shadow hover:shadow-md"
                style={{ background: 'white', border: '1px solid var(--border)' }}
              >
                <div
                  className="flex items-center justify-center mx-auto mb-4"
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'var(--primary-light)', color: 'var(--primary)',
                  }}
                >
                  <Icon size={28} />
                </div>
                <span
                  className="font-['Sora'] font-black"
                  style={{ fontSize: '0.8125rem', color: 'var(--primary)', letterSpacing: 2 }}
                >
                  STEP {step}
                </span>
                <h3
                  className="font-['Sora'] font-bold mt-2 mb-3"
                  style={{ fontSize: '1.125rem', color: 'var(--text-primary)' }}
                >
                  {title}
                </h3>
                <p
                  className="font-['DM_Sans']"
                  style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.9375rem' }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Call To Action ────────────────────────────────────────────────── */}
      <section
        style={{
          background: 'linear-gradient(135deg, var(--bg-dark) 0%, #1a0d3d 100%)',
          padding: '80px 16px',
          textAlign: 'center',
        }}
      >
        <div className="mx-auto" style={{ maxWidth: 560 }}>
          <h2
            className="font-['Sora'] font-bold mb-4"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: 'white' }}
          >
            Ready to Start Sharing?
          </h2>
          <p
            className="font-['DM_Sans'] mb-8"
            style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.0625rem' }}
          >
            Join thousands of readers who donate and borrow books in their community.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/register"
              className="font-['DM_Sans'] font-semibold text-white px-6 py-3 rounded-[10px] transition-all hover:opacity-90 active:scale-[0.97]"
              style={{ background: 'var(--primary)', textDecoration: 'none', fontSize: '1rem' }}
            >
              Join ReBook — It's Free
            </Link>
            <Link
              to="/books"
              className="font-['DM_Sans'] font-semibold px-6 py-3 rounded-[10px] transition-all hover:bg-white/10"
              style={{
                background: 'transparent',
                border: '1.5px solid rgba(255,255,255,0.25)',
                color: 'white',
                textDecoration: 'none',
                fontSize: '1rem',
              }}
            >
              Browse Books
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
