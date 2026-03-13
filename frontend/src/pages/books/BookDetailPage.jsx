import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  MapPin, Send, Star, Loader2, BookOpen, ChevronLeft,
  Share2, Heart, Package, Calendar, Tag, User,
  Cpu, Stethoscope, GraduationCap, Trophy, Lightbulb,
  BookMarked, Landmark, Globe, Sparkles, ArrowRight,
  CheckCircle, Clock, AlertCircle, ZoomIn,
} from 'lucide-react';

import { getBookById, getRecommendations } from '../../api/bookApi';
import { askAboutBook, getBookAiStatus } from '../../api/aiApi';
import useAuth from '../../hooks/useAuth';
import CreateRequestModal from '../../components/request/CreateRequestModal';

/* ─── helpers ───────────────────────────────────────────────────────────── */
const CATEGORY_META = {
  ENGINEERING:       { label: 'Engineering',   Icon: Cpu,           color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  MEDICAL:           { label: 'Medical',        Icon: Stethoscope,   color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  NOVELS:            { label: 'Novels',         Icon: BookOpen,      color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  SCHOOL:            { label: 'School',         Icon: GraduationCap, color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
  COMPETITIVE_EXAMS: { label: 'Competitive',    Icon: Trophy,        color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  SELF_HELP:         { label: 'Self Help',      Icon: Lightbulb,     color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
  STORY_BOOKS:       { label: 'Story Books',    Icon: BookMarked,    color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' },
  HISTORY:           { label: 'History',        Icon: Landmark,      color: '#78716c', bg: '#fafaf9', border: '#e7e5e4' },
  LANGUAGE:          { label: 'Language',       Icon: Globe,         color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd' },
  OTHER:             { label: 'Other',          Icon: Package,       color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
};

const CONDITION_META = {
  NEW:      { label: 'New',       color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  USED_GOOD:{ label: 'Good',      color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
  USED_OLD: { label: 'Well Read', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
};

const STATUS_META = {
  AVAILABLE: { label: 'Available',         color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', Icon: CheckCircle },
  REQUESTED: { label: 'Request Pending',   color: '#d97706', bg: '#fffbeb', border: '#fde68a', Icon: Clock },
  BORROWED:  { label: 'Currently Borrowed',color: '#dc2626', bg: '#fef2f2', border: '#fecaca', Icon: AlertCircle },
};

const AVATAR_COLORS = [
  ['#ede9fe','#6d28d9'],['#dbeafe','#1d4ed8'],['#dcfce7','#15803d'],
  ['#fef3c7','#b45309'],['#fce7f3','#be185d'],['#e0f2fe','#0369a1'],
];

function getInitials(name) {
  return (name||'?').split(' ').filter(Boolean).map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?';
}
function avatarColor(id) { return AVATAR_COLORS[(id||0)%AVATAR_COLORS.length]; }

/* ─── Skeleton ──────────────────────────────────────────────────────────── */
function DetailSkeleton() {
  return (
    <div style={{ fontFamily:"'Outfit','DM Sans',sans-serif", background:'#f8fafc', minHeight:'100vh', padding:'28px clamp(16px,4vw,60px)' }}>
      <style>{`@keyframes sk{0%{background-position:-200% center}100%{background-position:200% center}}.sk{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:sk 1.5s infinite;border-radius:10px}`}</style>
      <div className="sk" style={{height:20,width:200,marginBottom:28}}/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:28}}>
        <div>
          <div className="sk" style={{height:460,borderRadius:20,marginBottom:16}}/>
          <div style={{display:'flex',gap:10,marginBottom:28}}>
            {[0,1,2].map(i=><div key={i} className="sk" style={{width:76,height:76,borderRadius:12}}/>)}
          </div>
          <div className="sk" style={{height:280,borderRadius:20}}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="sk" style={{height:360,borderRadius:20}}/>
          <div className="sk" style={{height:220,borderRadius:20}}/>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   BookDetailPage
══════════════════════════════════════════════════════════════════════════ */
export default function BookDetailPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const [selectedImage, setSelectedImage]     = useState(0);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [zoomed, setZoomed]                   = useState(false);
  const [liked, setLiked]                     = useState(false);

  const { data: book, isLoading, isError } = useQuery({
    queryKey: ['book', id],
    queryFn:  () => getBookById(id),
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ['recommendations', id],
    queryFn:  () => getRecommendations(id),
    enabled:  !!book,
  });

  useEffect(() => { setSelectedImage(0); }, [id]);

  if (isLoading) return <DetailSkeleton />;

  if (isError || !book) {
    return (
      <div style={{ fontFamily:"'Outfit','DM Sans',sans-serif", minHeight:'80vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, background:'#f8fafc' }}>
        <div style={{ width:80, height:80, borderRadius:24, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <BookOpen size={36} style={{ color:'#94a3b8' }}/>
        </div>
        <p style={{ fontSize:'1.25rem', fontWeight:700, color:'#0f172a' }}>Book not found</p>
        <p style={{ color:'#94a3b8' }}>This book may have been removed.</p>
        <button onClick={() => navigate('/books')} style={{
          padding:'10px 24px', borderRadius:12, border:'1.5px solid #e2e8f0',
          background:'white', cursor:'pointer', fontFamily:'inherit', fontWeight:600, color:'#374151', fontSize:'0.9375rem',
        }}>Browse Books</button>
      </div>
    );
  }

  const isOwn      = user && String(book.ownerId) === String(user.id);
  const canRequest = book.status === 'AVAILABLE' && !!user && !isOwn;
  const images     = book.imageUrls?.length ? book.imageUrls : book.coverImageUrl ? [book.coverImageUrl] : [];
  const catMeta    = CATEGORY_META[book.category] ?? CATEGORY_META.OTHER;
  const condMeta   = CONDITION_META[book.condition] ?? CONDITION_META.USED_GOOD;
  const statMeta   = STATUS_META[book.status]      ?? STATUS_META.AVAILABLE;
  const keywords   = book.keywords ? book.keywords.split(',').map(k=>k.trim()).filter(Boolean) : [];
  const [avBg, avFg] = avatarColor(book.ownerId);

  const CategoryIcon = catMeta.Icon;
  const StatusIcon   = statMeta.Icon;

  return (
    <div style={{ fontFamily:"'Outfit','DM Sans',sans-serif", background:'#f8fafc', minHeight:'100vh' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sk{0%{background-position:-200% center}100%{background-position:200% center}}
        .sk{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:sk 1.5s infinite;border-radius:10px}
        .thumb-btn:hover{opacity:0.85;transform:scale(1.04)}
        .rec-card:hover{box-shadow:0 8px 24px rgba(0,0,0,0.10);transform:translateY(-3px)}
        @media(max-width:1023px){
          .detail-grid{grid-template-columns:1fr!important}
          .sticky-col{position:static!important}
        }
        @media(max-width:700px){.breadcrumb-hide{display:none}}
      `}</style>

      <div style={{ maxWidth:1320, margin:'0 auto', padding:'24px clamp(16px,4vw,56px) 80px' }}>

        {/* ── Breadcrumb ── */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:24, fontSize:'0.8125rem', color:'#94a3b8' }}>
          <button onClick={()=>navigate(-1)} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', color:'#6366f1', fontFamily:'inherit', fontWeight:600, fontSize:'0.8125rem', padding:0 }}>
            <ChevronLeft size={15}/> Back
          </button>
          <span className="breadcrumb-hide">/</span>
          <Link to="/books" className="breadcrumb-hide" style={{ color:'#94a3b8', textDecoration:'none' }}>Books</Link>
          <span className="breadcrumb-hide">/</span>
          <span className="breadcrumb-hide" style={{ color:'#0f172a', fontWeight:500, maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{book.title}</span>
        </div>

        {/* ── Main grid ── */}
        <div className="detail-grid" style={{ display:'grid', gridTemplateColumns:'1fr 390px', gap:28, alignItems:'start' }}>

          {/* ════ LEFT COLUMN ════ */}
          <div style={{ animation:'fadeUp 0.5s ease both' }}>

            {/* Image gallery */}
            <div style={{ background:'white', borderRadius:24, border:'1px solid #e2e8f0', overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>

              {/* Main image */}
              <div
                style={{ position:'relative', height:460, background:'linear-gradient(135deg,#e0e7ff,#dbeafe)', cursor: images.length ? 'zoom-in' : 'default', overflow:'hidden' }}
                onClick={() => images.length && setZoomed(true)}
              >
                {images.length > 0
                  ? <img src={images[selectedImage]} alt={book.title} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s ease' }}
                         onError={e=>{e.currentTarget.style.display='none'}}
                         onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.03)'}}
                         onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)'}}
                    />
                  : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
                      <BookOpen size={64} style={{ color:'#c7d2fe' }}/>
                      <p style={{ color:'#94a3b8', fontSize:'0.875rem' }}>No cover image</p>
                    </div>
                }

                {/* Status pill overlay */}
                <div style={{
                  position:'absolute', top:16, left:16,
                  display:'flex', alignItems:'center', gap:6,
                  background:statMeta.bg, border:`1px solid ${statMeta.border}`,
                  borderRadius:20, padding:'6px 14px',
                }}>
                  <StatusIcon size={13} style={{ color:statMeta.color }}/>
                  <span style={{ fontSize:'0.75rem', fontWeight:700, color:statMeta.color, letterSpacing:'0.03em' }}>
                    {statMeta.label}
                  </span>
                </div>

                {/* Zoom hint */}
                {images.length > 0 && (
                  <div style={{ position:'absolute', bottom:14, right:14, background:'rgba(0,0,0,0.40)', borderRadius:8, padding:'5px 8px', display:'flex', alignItems:'center', gap:4 }}>
                    <ZoomIn size={13} style={{ color:'white' }}/>
                    <span style={{ color:'white', fontSize:'0.6875rem', fontWeight:600 }}>Zoom</span>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div style={{ display:'flex', gap:10, padding:'12px 16px', borderTop:'1px solid #f1f5f9' }}>
                  {images.map((url, idx) => (
                    <button key={idx} className="thumb-btn" onClick={()=>setSelectedImage(idx)} style={{
                      width:76, height:76, borderRadius:12, border:`2px solid ${idx===selectedImage ? '#6366f1' : '#e2e8f0'}`,
                      overflow:'hidden', padding:0, cursor:'pointer', background:'transparent',
                      transition:'all 0.2s ease', flexShrink:0,
                      boxShadow: idx===selectedImage ? '0 0 0 3px rgba(99,102,241,0.20)' : 'none',
                    }}>
                      <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{e.currentTarget.style.display='none'}}/>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Book info card */}
            <div style={{ background:'white', borderRadius:24, border:'1px solid #e2e8f0', padding:32, marginTop:20, boxShadow:'0 4px 24px rgba(0,0,0,0.05)' }}>

              {/* Title + actions */}
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, marginBottom:16 }}>
                <h1 style={{ fontSize:'clamp(1.5rem,3vw,2rem)', fontWeight:900, color:'#0f172a', lineHeight:1.2, letterSpacing:'-0.02em', margin:0, flex:1 }}>
                  {book.title}
                </h1>
                <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                  <button onClick={()=>setLiked(l=>!l)} style={{
                    width:40, height:40, borderRadius:12, border:'1px solid #e2e8f0', background:'white', cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s',
                    color: liked ? '#ef4444' : '#94a3b8',
                  }}>
                    <Heart size={18} fill={liked ? '#ef4444' : 'none'}/>
                  </button>
                  <button onClick={()=>{navigator.share?.({title:book.title,url:window.location.href}).catch(()=>{})||navigator.clipboard?.writeText(window.location.href);toast.success('Link copied!');}} style={{
                    width:40, height:40, borderRadius:12, border:'1px solid #e2e8f0', background:'white', cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', transition:'all 0.2s',
                  }}>
                    <Share2 size={17}/>
                  </button>
                </div>
              </div>

              {/* Author */}
              <p style={{ fontSize:'1rem', color:'#64748b', marginBottom:18 }}>
                by <span style={{ fontWeight:700, color:'#0f172a' }}>{book.author}</span>
              </p>

              {/* Badges row */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
                {/* Category */}
                <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:20, background:catMeta.bg, border:`1px solid ${catMeta.border}`, fontSize:'0.8125rem', fontWeight:600, color:catMeta.color }}>
                  <CategoryIcon size={13}/>{catMeta.label}
                </span>

                {/* Condition */}
                <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 14px', borderRadius:20, background:condMeta.bg, border:`1px solid ${condMeta.border}`, fontSize:'0.8125rem', fontWeight:600, color:condMeta.color }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:condMeta.dot, display:'inline-block' }}/>
                  {condMeta.label}
                </span>

                {/* Donation */}
                {book.isDonation && (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 14px', borderRadius:20, background:'#fffbeb', border:'1px solid #fde68a', fontSize:'0.8125rem', fontWeight:700, color:'#b45309' }}>
                    🎁 Free Donation
                  </span>
                )}
                {/* Lending */}
                {book.isLending && (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 14px', borderRadius:20, background:'#f0f9ff', border:'1px solid #bae6fd', fontSize:'0.8125rem', fontWeight:700, color:'#0369a1' }}>
                    📖 Available to Borrow
                  </span>
                )}
              </div>

              {/* Metadata grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:24, padding:20, background:'#f8fafc', borderRadius:16, border:'1px solid #f1f5f9' }}>
                {book.publisher && (
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:32, height:32, borderRadius:10, background:'#e0e7ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Package size={14} style={{ color:'#6366f1' }}/>
                    </div>
                    <div>
                      <p style={{ fontSize:'0.6875rem', color:'#94a3b8', fontWeight:500, margin:0, textTransform:'uppercase', letterSpacing:'0.06em' }}>Publisher</p>
                      <p style={{ fontSize:'0.8125rem', color:'#0f172a', fontWeight:600, margin:0 }}>{book.publisher}</p>
                    </div>
                  </div>
                )}
                {book.isbn && (
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:32, height:32, borderRadius:10, background:'#dcfce7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Tag size={14} style={{ color:'#16a34a' }}/>
                    </div>
                    <div>
                      <p style={{ fontSize:'0.6875rem', color:'#94a3b8', fontWeight:500, margin:0, textTransform:'uppercase', letterSpacing:'0.06em' }}>ISBN</p>
                      <p style={{ fontSize:'0.8125rem', color:'#0f172a', fontWeight:600, margin:0, fontFamily:'monospace' }}>{book.isbn}</p>
                    </div>
                  </div>
                )}
                {book.city && (
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:32, height:32, borderRadius:10, background:'#fce7f3', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <MapPin size={14} style={{ color:'#be185d' }}/>
                    </div>
                    <div>
                      <p style={{ fontSize:'0.6875rem', color:'#94a3b8', fontWeight:500, margin:0, textTransform:'uppercase', letterSpacing:'0.06em' }}>Location</p>
                      <p style={{ fontSize:'0.8125rem', color:'#0f172a', fontWeight:600, margin:0 }}>
                        {book.city}{book.distanceKm!=null && <span style={{ color:'#94a3b8', fontWeight:400 }}> · {book.distanceKm.toFixed(1)} km</span>}
                      </p>
                    </div>
                  </div>
                )}
                {book.ownerAverageRating && (
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:32, height:32, borderRadius:10, background:'#fef3c7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Star size={14} style={{ color:'#d97706', fill:'#d97706' }}/>
                    </div>
                    <div>
                      <p style={{ fontSize:'0.6875rem', color:'#94a3b8', fontWeight:500, margin:0, textTransform:'uppercase', letterSpacing:'0.06em' }}>Owner Rating</p>
                      <p style={{ fontSize:'0.8125rem', color:'#0f172a', fontWeight:600, margin:0 }}>{book.ownerAverageRating.toFixed(1)} / 5.0</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Keywords */}
              {keywords.length > 0 && (
                <div style={{ marginBottom:24 }}>
                  <p style={{ fontSize:'0.8125rem', fontWeight:700, color:'#374151', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>About this book</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {keywords.map(kw => (
                      <span key={kw} style={{ padding:'5px 14px', borderRadius:20, background:'#f8fafc', border:'1px solid #e2e8f0', fontSize:'0.8125rem', color:'#64748b', fontWeight:500 }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Owner card */}
              <div style={{ display:'flex', alignItems:'center', gap:14, padding:16, background:'#f8fafc', borderRadius:16, border:'1px solid #e2e8f0' }}>
                <div style={{ width:46, height:46, borderRadius:14, background:avBg, color:avFg, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.875rem', flexShrink:0, border:`1px solid ${avFg}25` }}>
                  {getInitials(book.ownerName)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:700, color:'#0f172a', fontSize:'0.9375rem', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {book.ownerName ?? 'Unknown User'}
                  </p>
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                    <MapPin size={11} style={{ color:'#94a3b8' }}/>
                    <p style={{ fontSize:'0.75rem', color:'#94a3b8', margin:0 }}>{book.city || 'Location unknown'}</p>
                  </div>
                </div>
                <Link to={`/profile/${book.ownerId}`} style={{
                  display:'inline-flex', alignItems:'center', gap:5, padding:'8px 16px', borderRadius:10,
                  background:'#eff6ff', border:'1px solid #bfdbfe', color:'#4338ca',
                  fontWeight:600, fontSize:'0.8125rem', textDecoration:'none', flexShrink:0,
                  transition:'background 0.15s',
                }}>
                  View Profile <ArrowRight size={13}/>
                </Link>
              </div>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div style={{ background:'white', borderRadius:24, border:'1px solid #e2e8f0', padding:28, marginTop:20, boxShadow:'0 4px 24px rgba(0,0,0,0.05)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
                  <h3 style={{ fontSize:'1.0625rem', fontWeight:800, color:'#0f172a', margin:0, letterSpacing:'-0.01em' }}>Similar Books</h3>
                  <Link to="/books" style={{ fontSize:'0.8125rem', fontWeight:600, color:'#6366f1', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                    Browse all <ArrowRight size={13}/>
                  </Link>
                </div>
                <div style={{ display:'flex', gap:14, overflowX:'auto', paddingBottom:4, scrollbarWidth:'thin' }}>
                  {recommendations.slice(0,5).map(rec => (
                    <MiniBookCard key={rec.id} book={rec}/>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ════ RIGHT COLUMN ════ */}
          <div className="sticky-col" style={{ position:'sticky', top:88, display:'flex', flexDirection:'column', gap:16, alignSelf:'start', animation:'fadeUp 0.5s 0.08s ease both' }}>
            <AvailabilityCard book={book} canRequest={canRequest} isOwn={isOwn} user={user} onRequestClick={()=>setShowRequestModal(true)}/>
            <AiQaPanel bookId={id}/>
          </div>
        </div>
      </div>

      {/* Zoom lightbox */}
      {zoomed && images.length > 0 && (
        <div
          onClick={()=>setZoomed(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', cursor:'zoom-out' }}
        >
          <img src={images[selectedImage]} alt={book.title} style={{ maxWidth:'90vw', maxHeight:'90vh', objectFit:'contain', borderRadius:16 }}/>
        </div>
      )}

      {showRequestModal && (
        <CreateRequestModal
          bookId={book.id}
          isDonation={book.isDonation}
          isLending={book.isLending}
          onClose={()=>setShowRequestModal(false)}
          onSuccess={()=>setShowRequestModal(false)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   AvailabilityCard
══════════════════════════════════════════════════════════════════════════ */
function AvailabilityCard({ book, canRequest, isOwn, user, onRequestClick }) {
  const navigate   = useNavigate();
  const statMeta   = STATUS_META[book.status] ?? STATUS_META.AVAILABLE;
  const StatusIcon = statMeta.Icon;

  return (
    <div style={{ background:'white', borderRadius:24, border:'1px solid #e2e8f0', overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>

      {/* Status banner */}
      <div style={{
        display:'flex', alignItems:'center', gap:8,
        padding:'12px 20px',
        background:statMeta.bg, borderBottom:`1px solid ${statMeta.border}`,
      }}>
        <StatusIcon size={15} style={{ color:statMeta.color, flexShrink:0 }}/>
        <span style={{ fontSize:'0.8125rem', fontWeight:700, color:statMeta.color }}>
          {statMeta.label}
        </span>
      </div>

      <div style={{ padding:22 }}>

        {/* Title */}
        <h2 style={{ fontSize:'1.125rem', fontWeight:800, color:'#0f172a', margin:'0 0 6px', lineHeight:1.3, letterSpacing:'-0.015em' }}>
          {book.title}
        </h2>
        <p style={{ fontSize:'0.875rem', color:'#64748b', margin:'0 0 18px' }}>
          by {book.author}
        </p>

        {/* Type cards */}
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
          {book.isDonation && (
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:14 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#f59e0b,#f97316)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px rgba(245,158,11,0.35)' }}>
                <span style={{ fontSize:'1.125rem' }}>🎁</span>
              </div>
              <div>
                <p style={{ fontWeight:700, color:'#92400e', fontSize:'0.875rem', margin:0 }}>Free Donation</p>
                <p style={{ color:'#b45309', fontSize:'0.75rem', margin:'2px 0 0' }}>No cost — just come pick it up</p>
              </div>
            </div>
          )}
          {book.isLending && (
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:14 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#0ea5e9,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px rgba(14,165,233,0.35)' }}>
                <span style={{ fontSize:'1.125rem' }}>📖</span>
              </div>
              <div>
                <p style={{ fontWeight:700, color:'#075985', fontSize:'0.875rem', margin:0 }}>Borrow for a While</p>
                <p style={{ color:'#0369a1', fontSize:'0.75rem', margin:'2px 0 0' }}>Return when you're done reading</p>
              </div>
            </div>
          )}
        </div>

        {/* CTA buttons */}
        {canRequest && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {book.isDonation && (
              <button onClick={onRequestClick} style={{
                width:'100%', height:52, borderRadius:14, border:'none',
                background:'linear-gradient(135deg,#f59e0b,#f97316)',
                color:'white', fontWeight:700, fontSize:'0.9375rem',
                cursor:'pointer', fontFamily:'inherit',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                boxShadow:'0 4px 16px rgba(245,158,11,0.40)',
                transition:'opacity 0.2s, transform 0.15s',
              }}
                onMouseEnter={e=>{e.currentTarget.style.opacity='0.90';e.currentTarget.style.transform='translateY(-1px)'}}
                onMouseLeave={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='none'}}
              >
                🎁 Request for Donation
              </button>
            )}
            {book.isLending && (
              <button onClick={onRequestClick} style={{
                width:'100%', height:52, borderRadius:14, border:'none',
                background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color:'white', fontWeight:700, fontSize:'0.9375rem',
                cursor:'pointer', fontFamily:'inherit',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                boxShadow:'0 4px 16px rgba(99,102,241,0.40)',
                transition:'opacity 0.2s, transform 0.15s',
              }}
                onMouseEnter={e=>{e.currentTarget.style.opacity='0.90';e.currentTarget.style.transform='translateY(-1px)'}}
                onMouseLeave={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='none'}}
              >
                📖 Request to Borrow
              </button>
            )}
          </div>
        )}

        {/* Own book */}
        {isOwn && (
          <div style={{ padding:'12px 16px', background:'#f8fafc', borderRadius:12, border:'1px solid #e2e8f0', textAlign:'center' }}>
            <p style={{ fontSize:'0.875rem', color:'#64748b', fontWeight:600, margin:0 }}>This is your book</p>
            <button onClick={()=>navigate(`/books/edit/${book.id}`)} style={{
              marginTop:10, padding:'8px 20px', borderRadius:10, border:'1.5px solid #c7d2fe',
              background:'#eff6ff', color:'#4338ca', fontWeight:600, fontSize:'0.875rem',
              cursor:'pointer', fontFamily:'inherit',
            }}>
              Edit Listing
            </button>
          </div>
        )}

        {/* Not logged in */}
        {!user && book.status === 'AVAILABLE' && (
          <button onClick={()=>navigate('/login')} style={{
            width:'100%', height:52, borderRadius:14,
            border:'2px dashed #c7d2fe', background:'#f8fafc',
            color:'#6366f1', fontWeight:700, fontSize:'0.9375rem',
            cursor:'pointer', fontFamily:'inherit',
            transition:'background 0.2s',
          }}
            onMouseEnter={e=>e.currentTarget.style.background='#eff6ff'}
            onMouseLeave={e=>e.currentTarget.style.background='#f8fafc'}
          >
            Log in to Request →
          </button>
        )}

        {/* Safety note */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginTop:16, padding:'10px 12px', background:'#f8fafc', borderRadius:10 }}>
          <CheckCircle size={13} style={{ color:'#16a34a', flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:'0.75rem', color:'#64748b', margin:0, lineHeight:1.5 }}>
            Meet in a public place · Inspect before accepting · Report issues to support
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   AI Q&A Panel
══════════════════════════════════════════════════════════════════════════ */
function AiQaPanel({ bookId }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [inputFocus, setInputFocus] = useState(false);
  const chatEndRef = useRef(null);

  const { data: aiStatus } = useQuery({
    queryKey: ['aiStatus', bookId],
    queryFn:  () => getBookAiStatus(bookId),
    retry: false, refetchOnWindowFocus: false,
  });

  const indexed = aiStatus?.indexed ?? false;

  const askMutation = useMutation({
    mutationFn: (q) => askAboutBook(bookId, q),
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role:'ai', text: data.answer ?? 'No answer available.' }]);
    },
    onError: () => {
      setMessages(prev => [...prev, { role:'ai', text:'Sorry, something went wrong.' }]);
      toast.error('AI query failed');
    },
  });

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || askMutation.isPending) return;
    setMessages(prev => [...prev, { role:'user', text:q }]);
    setQuestion('');
    askMutation.mutate(q);
  };

  const SUGGESTED = ['What is this book about?','Is it good for beginners?','Key topics covered?'];

  return (
    <div style={{
      background:'linear-gradient(145deg,#1e1b4b,#312e81)',
      borderRadius:24, overflow:'hidden',
      boxShadow:'0 8px 32px rgba(99,102,241,0.30)',
      border:'1px solid rgba(255,255,255,0.10)',
    }}>
      {/* Header */}
      <div style={{ padding:'18px 22px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Sparkles size={16} color="white"/>
          </div>
          <div>
            <p style={{ color:'white', fontWeight:700, fontSize:'0.9375rem', margin:0 }}>Ask AI About This Book</p>
            <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.6875rem', margin:0 }}>Powered by OpenAI</p>
          </div>
        </div>
        <span style={{ background:'rgba(99,102,241,0.30)', border:'1px solid rgba(99,102,241,0.50)', borderRadius:8, padding:'3px 10px', fontSize:'0.6875rem', fontWeight:600, color:'#a5b4fc' }}>
          AI
        </span>
      </div>

      <div style={{ padding:'18px 22px' }}>
        {indexed ? (
          <>
            {/* Suggested questions — shown when no messages */}
            {messages.length === 0 && (
              <div style={{ marginBottom:14 }}>
                <p style={{ color:'rgba(255,255,255,0.40)', fontSize:'0.6875rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Suggested</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {SUGGESTED.map(q => (
                    <button key={q} onClick={()=>{ setMessages(prev=>[...prev,{role:'user',text:q}]); askMutation.mutate(q); }} style={{
                      textAlign:'left', padding:'8px 12px', borderRadius:10,
                      background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)',
                      color:'rgba(255,255,255,0.70)', fontSize:'0.8125rem', cursor:'pointer', fontFamily:'inherit',
                      transition:'background 0.15s',
                    }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.12)'}
                      onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                    >{q}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat messages */}
            {messages.length > 0 && (
              <div style={{ maxHeight:220, overflowY:'auto', marginBottom:14, display:'flex', flexDirection:'column', gap:10, scrollbarWidth:'thin' }}>
                {messages.map((msg, idx) => (
                  <div key={idx} style={{ display:'flex', justifyContent: msg.role==='user'?'flex-end':'flex-start' }}>
                    <div style={{
                      maxWidth:'88%', padding:'10px 14px',
                      borderRadius: msg.role==='user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: msg.role==='user' ? 'rgba(99,102,241,0.40)' : 'rgba(255,255,255,0.09)',
                      border: `1px solid ${msg.role==='user'?'rgba(99,102,241,0.50)':'rgba(255,255,255,0.10)'}`,
                      color:'white', fontSize:'0.8125rem', lineHeight:1.6, fontFamily:"'Outfit',sans-serif",
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {askMutation.isPending && (
                  <div style={{ display:'flex', justifyContent:'flex-start' }}>
                    <div style={{ padding:'10px 14px', borderRadius:'14px 14px 14px 4px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.10)', display:'flex', alignItems:'center', gap:8 }}>
                      <Loader2 size={13} style={{ color:'#a5b4fc', animation:'spin 1s linear infinite' }}/>
                      <span style={{ color:'rgba(255,255,255,0.55)', fontSize:'0.8125rem' }}>Thinking…</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef}/>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSend} style={{ display:'flex', gap:8 }}>
              <input
                type="text" value={question}
                onChange={e=>setQuestion(e.target.value)}
                onFocus={()=>setInputFocus(true)}
                onBlur={()=>setInputFocus(false)}
                placeholder="Ask anything about this book…"
                style={{
                  flex:1, padding:'10px 14px', borderRadius:12,
                  background:'rgba(255,255,255,0.08)',
                  border:`1px solid ${inputFocus?'rgba(99,102,241,0.60)':'rgba(255,255,255,0.15)'}`,
                  color:'white', fontSize:'0.875rem', outline:'none',
                  fontFamily:'inherit', transition:'border-color 0.2s',
                }}
              />
              <button type="submit" disabled={askMutation.isPending||!question.trim()} style={{
                width:42, height:42, borderRadius:11, border:'none',
                background: question.trim() ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.10)',
                color:'white', cursor: question.trim()?'pointer':'not-allowed',
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'background 0.2s', flexShrink:0,
              }}>
                <Send size={16}/>
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ width:52, height:52, borderRadius:16, background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
              <BookOpen size={24} style={{ color:'rgba(255,255,255,0.35)' }}/>
            </div>
            <p style={{ color:'rgba(255,255,255,0.60)', fontWeight:600, fontSize:'0.9375rem', margin:'0 0 6px' }}>AI analysis not yet available</p>
            <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.8125rem', margin:0 }}>This book hasn't been indexed yet.</p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MiniBookCard
══════════════════════════════════════════════════════════════════════════ */
function MiniBookCard({ book }) {
  const navigate = useNavigate();
  return (
    <button className="rec-card" onClick={()=>navigate(`/books/${book.id}`)} style={{
      flexShrink:0, width:140, textAlign:'left', background:'white',
      border:'1px solid #e2e8f0', borderRadius:14, padding:0, cursor:'pointer',
      overflow:'hidden', transition:'all 0.25s ease',
    }}>
      <div style={{ height:96, background:'linear-gradient(135deg,#e0e7ff,#dbeafe)', overflow:'hidden' }}>
        {book.coverImageUrl && (
          <img src={book.coverImageUrl} alt={book.title} style={{ width:'100%', height:'100%', objectFit:'cover' }}
               onError={e=>{e.currentTarget.style.display='none'}}/>
        )}
      </div>
      <div style={{ padding:'10px 11px' }}>
        <p style={{ fontSize:'0.75rem', fontWeight:700, color:'#0f172a', margin:0, lineHeight:1.35,
                    display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {book.title}
        </p>
        <p style={{ fontSize:'0.6875rem', color:'#94a3b8', margin:'4px 0 0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {book.author}
        </p>
      </div>
    </button>
  );
}