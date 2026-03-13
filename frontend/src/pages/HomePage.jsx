import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search, ArrowRight, BookOpen, BookMarked, CheckCircle,
  BookPlus, BookHeart, Star, MapPin, Users, Sparkles,
  Cpu, Heart, GraduationCap, Trophy, Lightbulb, Landmark,
  Globe, Package, Send, HeartHandshake, ArrowUpRight,
} from 'lucide-react';
import { getPopularBooks } from '../api/bookApi';

/* ─────────────────────────────────────────────────────────────────────────────
   Static data
───────────────────────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { key: 'ENGINEERING',       label: 'Engineering',  Icon: Cpu,           grad: 'linear-gradient(135deg,#3b82f6,#06b6d4)' },
  { key: 'MEDICAL',           label: 'Medical',       Icon: Heart,         grad: 'linear-gradient(135deg,#ef4444,#f97316)' },
  { key: 'NOVELS',            label: 'Novels',        Icon: BookOpen,      grad: 'linear-gradient(135deg,#f59e0b,#eab308)' },
  { key: 'SCHOOL',            label: 'School',        Icon: GraduationCap, grad: 'linear-gradient(135deg,#10b981,#14b8a6)' },
  { key: 'COMPETITIVE_EXAMS', label: 'Competitive',   Icon: Trophy,        grad: 'linear-gradient(135deg,#8b5cf6,#6366f1)' },
  { key: 'SELF_HELP',         label: 'Self Help',     Icon: Lightbulb,     grad: 'linear-gradient(135deg,#f59e0b,#f97316)' },
  { key: 'STORY_BOOKS',       label: 'Stories',       Icon: BookMarked,    grad: 'linear-gradient(135deg,#ec4899,#f43f5e)' },
  { key: 'HISTORY',           label: 'History',       Icon: Landmark,      grad: 'linear-gradient(135deg,#78716c,#57534e)' },
  { key: 'LANGUAGE',          label: 'Language',      Icon: Globe,         grad: 'linear-gradient(135deg,#0ea5e9,#38bdf8)' },
  { key: 'OTHER',             label: 'Other',         Icon: Package,       grad: 'linear-gradient(135deg,#6b7280,#9ca3af)' },
];

const HOW_IT_WORKS = [
  {
    n: '01', Icon: BookPlus, title: 'Post Your Book',
    desc: 'List any book you want to donate or lend. Add photos and details for nearby readers.',
    grad: 'linear-gradient(135deg,#14b8a6,#0ea5e9)',
    glow: 'rgba(20,184,166,0.16)',
  },
  {
    n: '02', Icon: Send, title: 'Send a Request',
    desc: 'Browse books near you and send a request to borrow or claim a donation in one tap.',
    grad: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    glow: 'rgba(99,102,241,0.16)',
  },
  {
    n: '03', Icon: HeartHandshake, title: 'Exchange & Read',
    desc: 'Meet the owner, collect your book, and leave a review for the community.',
    grad: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
    glow: 'rgba(139,92,246,0.16)',
  },
];

const STATS = [
  { value: '5,000+', label: 'Books Listed',   Icon: BookOpen },
  { value: '2,400+', label: 'Exchanges Made', Icon: HeartHandshake },
  { value: '1,200+', label: 'Active Members', Icon: Users },
  { value: '50+',    label: 'Cities Active',  Icon: MapPin },
];

const TRUST_PILLS = [
  { emoji: '⭐', title: '4.9 / 5 Rating',   sub: 'From 1,200+ exchanges' },
  { emoji: '🔒', title: '100% Free',         sub: 'No hidden charges ever' },
  { emoji: '📍', title: 'Hyper-Local',       sub: 'Books within 5–50 km' },
  { emoji: '⚡', title: 'Instant Requests',  sub: 'One tap to send' },
];

/* ─────────────────────────────────────────────────────────────────────────────
   PopularBookCard
───────────────────────────────────────────────────────────────────────────── */
function PopularBookCard({ book }) {
  const navigate = useNavigate();
  const cover = book.coverImageUrl || book.coverImage;
  return (
    <button
      onClick={() => navigate(`/books/${book.id}`)}
      style={{ flexShrink: 0, width: 148, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
    >
      <div
        style={{
          width: 148, height: 204, borderRadius: 14, marginBottom: 10,
          overflow: 'hidden', position: 'relative',
          background: 'linear-gradient(135deg,#e0e7ff,#dbeafe)',
          border: '1px solid #e2e8f0',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px) scale(1.03)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.13)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        {cover
          ? <img src={cover} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={40} style={{ color: '#94a3b8' }} /></div>
        }
        {(book.isDonation || book.isLending) && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            background: book.isDonation ? 'linear-gradient(135deg,#14b8a6,#0ea5e9)' : 'linear-gradient(135deg,#8b5cf6,#ec4899)',
            borderRadius: 7, padding: '3px 8px', fontSize: '0.65rem', fontWeight: 700, color: 'white',
          }}>{book.isDonation ? '🎁 Free' : '📖 Lend'}</div>
        )}
      </div>
      <p style={{ color: '#1e293b', fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 4 }}>
        {book.title}
      </p>
      <p style={{ color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {book.author}
      </p>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HomePage
───────────────────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const { data: popularBooks = [], isLoading: popularLoading } = useQuery({
    queryKey: ['popularBooks'],
    queryFn: getPopularBooks,
    staleTime: 5 * 60_000,
  });

  const handleSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/books?keyword=${encodeURIComponent(q)}` : '/books');
  };

  const maxW = { maxWidth: 1080, margin: '0 auto' };
  const sectionPad = { padding: '88px clamp(20px,5vw,80px)' };

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", background: '#f8fafc' }}>

      <style>{`
        @media (max-width: 1023px) {
          .hero-cards { display: none !important; }
          .hero-grid  { grid-template-columns: 1fr !important; }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(28px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes floatY {
          0%,100% { transform:translateY(0); }
          50%      { transform:translateY(-12px); }
        }
        @keyframes shimmer-light {
          0%   { background-position:-200% center; }
          100% { background-position: 200% center; }
        }
        .skel {
          background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
          background-size:200% 100%;
          animation:shimmer-light 1.6s infinite;
          border-radius:10px;
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', minHeight: '88vh',
        display: 'flex', alignItems: 'center', overflow: 'hidden',
        background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: 'clamp(88px,11vh,130px) clamp(20px,5vw,80px) 80px',
      }}>
        {/* Subtle background orbs */}
        <div style={{ position:'absolute', width:640, height:640, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 65%)', top:-180, right:-140, pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:520, height:520, borderRadius:'50%', background:'radial-gradient(circle,rgba(14,165,233,0.07) 0%,transparent 65%)', top:140, left:-160, pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:380, height:380, borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,0.06) 0%,transparent 65%)', bottom:-80, right:'28%', pointerEvents:'none' }} />

        <div style={{ position:'relative', zIndex:1, width:'100%', ...maxW }}>
          <div className="hero-grid" style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,460px)', gap:64, alignItems:'center' }}>

            {/* LEFT */}
            <div style={{ animation:'fadeUp 0.65s ease both' }}>

              {/* Pill */}
              <div style={{
                display:'inline-flex', alignItems:'center', gap:8,
                background:'#eff6ff', border:'1px solid #bfdbfe',
                borderRadius:99, padding:'6px 16px', marginBottom:28,
              }}>
                <Sparkles size={13} style={{ color:'#6366f1' }} />
                <span style={{ color:'#4338ca', fontSize:'0.875rem', fontWeight:600 }}>
                  India's Book Sharing Community
                </span>
              </div>

              {/* Headline */}
              <h1 style={{ fontSize:'clamp(2.75rem,5.5vw,4.5rem)', fontWeight:900, color:'#0f172a', lineHeight:1.07, marginBottom:22, letterSpacing:'-0.025em' }}>
                Share Books.<br />
                <span style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                  Build Community.
                </span>
              </h1>

              <p style={{ fontSize:'1.125rem', color:'#64748b', lineHeight:1.72, maxWidth:480, marginBottom:40 }}>
                Donate or lend your books to readers nearby. Discover
                books you'll love — all from people in your city, completely free.
              </p>

              {/* Search */}
              <form onSubmit={handleSearch}>
                <div style={{
                  display:'flex', gap:8, padding:8,
                  background:'#f8fafc', border:'1.5px solid #e2e8f0',
                  borderRadius:18, maxWidth:520, marginBottom:44,
                  boxShadow:'0 2px 12px rgba(0,0,0,0.05)',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, paddingLeft:12 }}>
                    <Search size={17} style={{ color:'#94a3b8', flexShrink:0 }} />
                    <input
                      type="text" value={query} onChange={e => setQuery(e.target.value)}
                      placeholder="Search by title, author, or keyword…"
                      style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'#0f172a', fontSize:'0.9375rem', height:42, fontFamily:'inherit' }}
                    />
                  </div>
                  <button type="submit" style={{
                    padding:'0 24px', height:44, borderRadius:12, border:'none',
                    background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color:'white', fontWeight:700, fontSize:'0.9375rem',
                    cursor:'pointer', fontFamily:'inherit',
                    boxShadow:'0 4px 14px rgba(99,102,241,0.35)',
                    transition:'opacity 0.2s, transform 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.opacity='0.88'; e.currentTarget.style.transform='translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='none'; }}
                  >Search</button>
                </div>
              </form>

              {/* Stats */}
              <div style={{ display:'flex', gap:36, flexWrap:'wrap' }}>
                {STATS.map(({ value, label, Icon }) => (
                  <div key={label}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <Icon size={14} style={{ color:'#6366f1' }} />
                      <span style={{ fontSize:'1.75rem', fontWeight:900, color:'#0f172a', letterSpacing:'-0.02em' }}>{value}</span>
                    </div>
                    <p style={{ fontSize:'0.75rem', color:'#94a3b8', marginTop:2, fontWeight:500 }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — floating white cards */}
            <div className="hero-cards" style={{ position:'relative', height:540 }}>

              {/* Card 1 */}
              <div style={{
                position:'absolute', top:0, right:16, width:228,
                background:'white', border:'1px solid #e2e8f0', borderRadius:24, padding:20,
                boxShadow:'0 20px 60px rgba(0,0,0,0.09), 0 4px 12px rgba(0,0,0,0.04)',
                animation:'floatY 5s ease-in-out infinite',
              }}>
                <div style={{ width:'100%', height:136, borderRadius:16, marginBottom:14, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <BookOpen size={52} style={{ color:'rgba(255,255,255,0.70)' }} />
                </div>
                <p style={{ fontWeight:700, color:'#0f172a', fontSize:'0.875rem', marginBottom:3 }}>The Alchemist</p>
                <p style={{ color:'#94a3b8', fontSize:'0.75rem', marginBottom:12 }}>Paulo Coelho</p>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  <span style={{ fontSize:'0.6875rem', fontWeight:700, color:'#0f766e', padding:'4px 10px', borderRadius:20, background:'#f0fdf4', border:'1px solid #bbf7d0' }}>🎁 Donation</span>
                  <span style={{ fontSize:'0.6875rem', color:'#64748b', padding:'4px 10px', borderRadius:20, background:'#f8fafc', border:'1px solid #e2e8f0' }}>Hyderabad</span>
                </div>
              </div>

              {/* Card 2 */}
              <div style={{
                position:'absolute', top:210, left:0, width:205,
                background:'white', border:'1px solid #e2e8f0', borderRadius:22, padding:18,
                boxShadow:'0 14px 44px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.03)',
                animation:'floatY 5s 1.8s ease-in-out infinite',
              }}>
                <div style={{ width:'100%', height:112, borderRadius:14, marginBottom:12, background:'linear-gradient(135deg,#8b5cf6,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <BookMarked size={42} style={{ color:'rgba(255,255,255,0.70)' }} />
                </div>
                <p style={{ fontWeight:700, color:'#0f172a', fontSize:'0.8125rem', marginBottom:3 }}>Wings of Fire</p>
                <p style={{ color:'#94a3b8', fontSize:'0.75rem', marginBottom:10 }}>APJ Abdul Kalam</p>
                <span style={{ fontSize:'0.6875rem', fontWeight:700, color:'#6d28d9', padding:'4px 10px', borderRadius:20, background:'#f5f3ff', border:'1px solid #ddd6fe', display:'inline-block' }}>📖 Lending</span>
              </div>

              {/* Notification chip */}
              <div style={{
                position:'absolute', bottom:100, right:20,
                background:'white', border:'1px solid #e2e8f0', borderRadius:16, padding:'12px 16px',
                display:'flex', alignItems:'center', gap:12,
                boxShadow:'0 8px 28px rgba(0,0,0,0.08)',
                animation:'floatY 5s 3.2s ease-in-out infinite',
              }}>
                <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:'linear-gradient(135deg,#14b8a6,#0ea5e9)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <CheckCircle size={18} style={{ color:'white' }} />
                </div>
                <div>
                  <p style={{ color:'#0f172a', fontSize:'0.75rem', fontWeight:700 }}>Request Approved!</p>
                  <p style={{ color:'#94a3b8', fontSize:'0.6875rem' }}>2.3 km away · Hyderabad</p>
                </div>
              </div>

              {/* Rating chip */}
              <div style={{
                position:'absolute', top:202, right:0,
                background:'white', border:'1px solid #fef3c7', borderRadius:12, padding:'8px 14px',
                display:'flex', alignItems:'center', gap:6,
                boxShadow:'0 4px 14px rgba(0,0,0,0.06)',
                animation:'floatY 5s 0.9s ease-in-out infinite',
              }}>
                <Star size={14} style={{ color:'#f59e0b', fill:'#f59e0b' }} />
                <span style={{ color:'#78350f', fontSize:'0.75rem', fontWeight:700 }}>4.9 / 5 rating</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          TRUST PILLS
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background:'#f1f5f9', borderBottom:'1px solid #e2e8f0', padding:'22px clamp(20px,5vw,80px)' }}>
        <div style={{ ...maxW, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12 }}>
          {TRUST_PILLS.map(({ emoji, title, sub }) => (
            <div key={title} style={{ display:'flex', alignItems:'center', gap:12, background:'white', border:'1px solid #e2e8f0', borderRadius:14, padding:'14px 18px' }}>
              <span style={{ fontSize:'1.375rem', flexShrink:0 }}>{emoji}</span>
              <div>
                <p style={{ color:'#0f172a', fontWeight:600, fontSize:'0.875rem' }}>{title}</p>
                <p style={{ color:'#94a3b8', fontSize:'0.75rem', marginTop:1 }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background:'white', ...sectionPad, borderBottom:'1px solid #e2e8f0' }}>
        <div style={{ ...maxW }}>
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <p style={{ color:'#6366f1', fontWeight:600, fontSize:'0.8125rem', letterSpacing:'0.10em', textTransform:'uppercase', marginBottom:12 }}>Simple Process</p>
            <h2 style={{ fontSize:'clamp(1.875rem,3.8vw,2.75rem)', fontWeight:900, color:'#0f172a', marginBottom:14, letterSpacing:'-0.02em' }}>
              How It{' '}
              <span style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Works</span>
            </h2>
            <p style={{ color:'#64748b', maxWidth:400, margin:'0 auto', lineHeight:1.65 }}>
              Three steps to start sharing and discovering books in your city
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:22 }}>
            {HOW_IT_WORKS.map(({ n, Icon, title, desc, grad, glow }) => (
              <div key={n} style={{
                borderRadius:24, padding:'32px 28px', position:'relative', overflow:'hidden',
                background:'white', border:'1.5px solid #e2e8f0',
                boxShadow:`0 4px 24px ${glow}`,
                transition:'transform 0.3s ease, box-shadow 0.3s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-5px)'; e.currentTarget.style.boxShadow=`0 18px 44px ${glow}`; }}
                onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow=`0 4px 24px ${glow}`; }}
              >
                <span style={{ position:'absolute', top:16, right:20, fontSize:'5rem', fontWeight:900, color:'#f1f5f9', lineHeight:1, userSelect:'none' }}>{n}</span>
                <div style={{ width:54, height:54, borderRadius:16, background:grad, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24, boxShadow:`0 6px 18px ${glow}` }}>
                  <Icon size={25} color="white" />
                </div>
                <h3 style={{ fontSize:'1.125rem', fontWeight:700, color:'#0f172a', marginBottom:10 }}>{title}</h3>
                <p style={{ color:'#64748b', lineHeight:1.68, fontSize:'0.9375rem' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CATEGORIES
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background:'#f8fafc', ...sectionPad, borderBottom:'1px solid #e2e8f0' }}>
        <div style={{ ...maxW }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <h2 style={{ fontSize:'clamp(1.875rem,3.8vw,2.75rem)', fontWeight:900, color:'#0f172a', marginBottom:12, letterSpacing:'-0.02em' }}>
              Browse by{' '}
              <span style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Category</span>
            </h2>
            <p style={{ color:'#64748b' }}>10 categories across all genres and subjects</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(152px,1fr))', gap:12 }}>
            {CATEGORIES.map(({ key, label, Icon, grad }) => (
              <button key={key} onClick={() => navigate(`/books?category=${key}`)} style={{
                display:'flex', flexDirection:'column', alignItems:'center', gap:12,
                padding:'22px 12px', background:'white', border:'1px solid #e2e8f0',
                borderRadius:18, cursor:'pointer', fontFamily:'inherit',
                transition:'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 12px 28px rgba(0,0,0,0.09)'; e.currentTarget.style.borderColor='#c7d2fe'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor='#e2e8f0'; }}
              >
                <div style={{ width:48, height:48, borderRadius:14, background:grad, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(0,0,0,0.12)' }}>
                  <Icon size={22} color="white" />
                </div>
                <span style={{ fontSize:'0.8125rem', fontWeight:600, color:'#374151', textAlign:'center', lineHeight:1.25 }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          POPULAR BOOKS
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background:'white', ...sectionPad, borderBottom:'1px solid #e2e8f0' }}>
        <div style={{ ...maxW }}>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:36, flexWrap:'wrap', gap:12 }}>
            <div>
              <h2 style={{ fontSize:'clamp(1.75rem,3.5vw,2.5rem)', fontWeight:900, color:'#0f172a', marginBottom:8, letterSpacing:'-0.02em' }}>
                Popular{' '}
                <span style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Right Now</span>
              </h2>
              <p style={{ color:'#64748b', fontSize:'0.9375rem' }}>Most requested books this week</p>
            </div>
            <Link to="/books" style={{
              display:'inline-flex', alignItems:'center', gap:8,
              padding:'10px 20px', borderRadius:12,
              background:'#f8fafc', border:'1.5px solid #e2e8f0',
              color:'#374151', fontWeight:600, fontSize:'0.875rem',
              textDecoration:'none', fontFamily:'inherit',
              transition:'border-color 0.2s, background 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='#c7d2fe'; e.currentTarget.style.background='#f0f4ff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.background='#f8fafc'; }}
            >View All <ArrowRight size={15} /></Link>
          </div>

          {popularLoading ? (
            <div style={{ display:'flex', gap:20, overflowX:'auto', paddingBottom:12 }}>
              {Array.from({ length: 7 }).map((_,i) => (
                <div key={i} style={{ flexShrink:0, width:148 }}>
                  <div className="skel" style={{ width:148, height:204 }} />
                  <div className="skel" style={{ height:12, width:'78%', marginTop:10 }} />
                  <div className="skel" style={{ height:10, width:'52%', marginTop:6 }} />
                </div>
              ))}
            </div>
          ) : popularBooks.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0' }}>
              <BookOpen size={52} style={{ color:'#e2e8f0', margin:'0 auto 16px' }} />
              <p style={{ color:'#94a3b8', fontSize:'0.9375rem' }}>No popular books yet — be the first to list one!</p>
            </div>
          ) : (
            <div style={{ display:'flex', gap:20, overflowX:'auto', paddingBottom:12, scrollbarWidth:'thin' }}>
              {popularBooks.map(book => <PopularBookCard key={book.id} book={book} />)}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CTA BANNER — deep indigo gradient for visual punch
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background:'#f8fafc', padding:'88px clamp(20px,5vw,80px) 108px' }}>
        <div style={{
          ...maxW,
          background:'linear-gradient(135deg,#4f46e5 0%,#7c3aed 55%,#6d28d9 100%)',
          borderRadius:32, padding:'72px clamp(28px,6vw,80px)',
          textAlign:'center', position:'relative', overflow:'hidden',
          boxShadow:'0 24px 64px rgba(99,102,241,0.30)',
        }}>
          <div style={{ position:'absolute', width:360, height:360, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,255,255,0.09) 0%,transparent 65%)', top:-100, right:-60, pointerEvents:'none' }} />
          <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,255,255,0.07) 0%,transparent 65%)', bottom:-60, left:-40, pointerEvents:'none' }} />

          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{
              width:80, height:80, borderRadius:24,
              background:'rgba(255,255,255,0.18)', border:'1.5px solid rgba(255,255,255,0.28)',
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 28px', animation:'floatY 4s ease-in-out infinite',
            }}>
              <BookHeart size={38} color="white" />
            </div>
            <h2 style={{ fontSize:'clamp(1.875rem,4vw,3rem)', fontWeight:900, color:'white', marginBottom:16, letterSpacing:'-0.02em', lineHeight:1.15 }}>
              Have Books to Share?
            </h2>
            <p style={{ color:'rgba(255,255,255,0.72)', fontSize:'1.0625rem', maxWidth:500, margin:'0 auto 40px', lineHeight:1.68 }}>
              Join thousands of readers in Hyderabad who donate, lend, and discover books — completely free, always.
            </p>
            <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
              <button onClick={() => navigate('/register')} style={{
                padding:'14px 36px', borderRadius:16, border:'none',
                background:'white', color:'#4f46e5',
                fontWeight:700, fontSize:'1rem', cursor:'pointer', fontFamily:'inherit',
                display:'inline-flex', alignItems:'center', gap:8,
                boxShadow:'0 4px 20px rgba(0,0,0,0.18)',
                transition:'transform 0.15s, box-shadow 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.22)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.18)'; }}
              ><BookHeart size={18} /> Join Free Today</button>
              <button onClick={() => navigate('/books')} style={{
                padding:'14px 36px', borderRadius:16, cursor:'pointer', fontFamily:'inherit',
                background:'rgba(255,255,255,0.13)', border:'1.5px solid rgba(255,255,255,0.32)',
                color:'white', fontWeight:700, fontSize:'1rem',
                display:'inline-flex', alignItems:'center', gap:8,
                transition:'background 0.2s, transform 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.22)'; e.currentTarget.style.transform='translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.13)'; e.currentTarget.style.transform='none'; }}
              ><ArrowUpRight size={18} /> Browse Books</button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}