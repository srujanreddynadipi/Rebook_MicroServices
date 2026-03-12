import { useNavigate } from 'react-router-dom';
import { Home, BookOpen } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ background: 'var(--bg-page)', minHeight: 'calc(100vh - 64px)', padding: '32px 24px', textAlign: 'center' }}
    >
      <h1
        style={{
          fontFamily: "'Sora', sans-serif",
          fontWeight: 800,
          fontSize: 'clamp(6rem, 20vw, 12rem)',
          lineHeight: 1,
          color: 'var(--primary)',
          margin: 0,
          opacity: 0.15,
        }}
      >
        404
      </h1>

      <h2
        style={{
          fontFamily: "'Sora', sans-serif",
          fontWeight: 700,
          fontSize: '1.75rem',
          color: 'var(--text-primary)',
          marginTop: -16,
          marginBottom: 8,
        }}
      >
        Page Not Found
      </h2>

      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '1rem',
          color: 'var(--text-muted)',
          maxWidth: 400,
          marginBottom: 32,
        }}
      >
        Looks like this page got donated to someone else. Let&apos;s get you back on track!
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 border-none cursor-pointer"
          style={{
            height: 48,
            paddingLeft: 28,
            paddingRight: 28,
            borderRadius: 'var(--radius-btn)',
            background: 'var(--primary)',
            color: '#fff',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            fontSize: '0.9375rem',
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary-dark)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'var(--primary)'; }}
        >
          <Home size={18} /> Go Home
        </button>

        <button
          onClick={() => navigate('/books')}
          className="flex items-center gap-2 cursor-pointer"
          style={{
            height: 48,
            paddingLeft: 28,
            paddingRight: 28,
            borderRadius: 'var(--radius-btn)',
            background: 'transparent',
            color: 'var(--primary)',
            border: '1.5px solid var(--primary)',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            fontSize: '0.9375rem',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0,201,167,0.06)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <BookOpen size={18} /> Browse Books
        </button>
      </div>
    </div>
  );
}
