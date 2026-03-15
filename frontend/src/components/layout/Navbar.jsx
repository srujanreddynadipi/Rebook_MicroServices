import { useState, useRef, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUnreadCount } from '../../api/notificationApi';
import {
  BookHeart, Search, Bell, Plus, LogOut, User,
  BookOpen, ChevronDown, Menu, X, Shield, BookMarked,
  MessageCircle, Inbox, LayoutDashboard,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */
function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
}

function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

/* ─────────────────────────────────────────────────────────────────────────────
   NavLink helper
───────────────────────────────────────────────────────────────────────────── */
function NavLink({ to, children }) {
  const { pathname } = useLocation();
  const active = pathname === to || pathname.startsWith(to + '/');
  return (
    <Link
      to={to}
      style={{
        fontSize: '0.9rem',
        fontWeight: active ? 700 : 600,
        color: active ? '#1e1b4b' : '#475569',
        textDecoration: 'none',
        padding: '10px 14px',
        borderRadius: 999,
        background: active ? 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(14,165,233,0.12))' : 'transparent',
        boxShadow: active ? 'inset 0 0 0 1px rgba(99,102,241,0.14)' : 'none',
        transition: 'color 0.2s, background 0.2s, box-shadow 0.2s',
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.color = '#0f172a';
          e.currentTarget.style.background = 'rgba(255,255,255,0.65)';
          e.currentTarget.style.boxShadow = 'inset 0 0 0 1px rgba(148,163,184,0.18)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.color = '#475569';
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {children}
    </Link>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   Navbar
═════════════════════════════════════════════════════════════════════════════ */
export default function Navbar() {
  const navigate     = useNavigate();
  const { pathname } = useLocation();
  const queryClient  = useQueryClient();
  const { user, logout } = useContext(AuthContext);

  const [searchQuery,   setSearchQuery]   = useState('');
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [mobileOpen,    setMobileOpen]    = useState(false);

  const dropdownRef = useRef(null);
  useClickOutside(dropdownRef, () => setDropdownOpen(false));

  /* Close mobile drawer on route change */
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) navigate(`/books?keyword=${encodeURIComponent(q)}`);
    else    navigate('/books');
  };

  /* ── Notification unread count ───────────────────────────────────────── */
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: getUnreadCount,
    enabled: !!user,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  // Bump count when a new message arrives via WebSocket
  useEffect(() => {
    const handler = () => queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    window.addEventListener('ws:message', handler);
    return () => window.removeEventListener('ws:message', handler);
  }, [queryClient]);

  const handleLogout = () => {
    logout();
    queryClient.clear();
    navigate('/');
    setDropdownOpen(false);
  };

  const navSurface = 'rgba(255,255,255,0.82)';
  const navBorder = 'rgba(148,163,184,0.20)';
  const navText = '#0f172a';
  const navSubtext = '#64748b';

  /* ── Inline style helpers ── */
  const iconBtn = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 40, height: 40, borderRadius: 14,
    background: 'rgba(255,255,255,0.72)',
    border: '1px solid rgba(148,163,184,0.22)',
    color: navSubtext,
    boxShadow: '0 8px 20px rgba(15,23,42,0.06)',
    cursor: 'pointer', transition: 'background 0.2s, color 0.2s, transform 0.15s, box-shadow 0.2s',
    flexShrink: 0,
  };

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════
          NAVBAR BAR
      ══════════════════════════════════════════════════════════════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: navSurface,
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        borderBottom: `1px solid ${navBorder}`,
        boxShadow: '0 10px 32px rgba(15,23,42,0.06)',
        height: 72,
        display: 'flex', alignItems: 'center',
        padding: '0 clamp(16px, 4vw, 48px)',
        gap: 18,
        fontFamily: "'Outfit', sans-serif",
      }}>

        {/* ── Logo ── */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(99,102,241,0.28)',
            flexShrink: 0,
          }}>
            <BookHeart size={16} color="white" />
          </div>
          <span
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '1.375rem',
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.02em',
            }}
          >
            Kitabi
          </span>
        </Link>

        {/* ── Search bar (desktop) ── */}
        <form
          onSubmit={handleSearch}
          style={{
            flex: 1, maxWidth: 480, display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(248,250,252,0.96)',
            border: '1px solid rgba(148,163,184,0.18)',
            borderRadius: 16, padding: '0 14px', height: 44,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          className="navbar-search"
          onFocus={e => {
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.55)';
            e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(99,102,241,0.14), 0 10px 22px rgba(99,102,241,0.08)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'rgba(148,163,184,0.18)';
            e.currentTarget.style.boxShadow   = 'none';
          }}
        >
          <Search size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search books, authors, or ISBN…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: navText, fontSize: '0.875rem', fontFamily: 'inherit',
            }}
          />
          {/* Ctrl+K hint */}
          <kbd style={{
            fontSize: '0.6875rem', color: '#94a3b8',
            background: 'white',
            border: '1px solid rgba(148,163,184,0.20)',
            borderRadius: 5, padding: '2px 5px', flexShrink: 0,
            fontFamily: 'inherit',
          }}>Ctrl K</kbd>
        </form>

        {/* ── Desktop nav links ── */}
        <div className="navbar-links" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 4, background: 'rgba(255,255,255,0.42)', border: `1px solid ${navBorder}`, borderRadius: 999 }}>
          <NavLink to="/books">Browse</NavLink>
          {user && <NavLink to="/my-books">My Books</NavLink>}
          {user && <NavLink to="/requests/received">Requests</NavLink>}
        </div>

        {/* ── Right actions ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>

          {user ? (
            <>
              {/* List a book */}
              <button
                onClick={() => navigate('/books/add')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0 18px', height: 40, borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg,#0ea5e9,#6366f1,#8b5cf6)',
                  color: 'white', fontWeight: 700, fontSize: '0.875rem',
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'opacity 0.2s, transform 0.15s, box-shadow 0.2s',
                  boxShadow: '0 12px 26px rgba(99,102,241,0.28)',
                  whiteSpace: 'nowrap',
                }}
                className="navbar-add-btn"
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.92'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 16px 32px rgba(99,102,241,0.36)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1';    e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 12px 26px rgba(99,102,241,0.28)'; }}
              >
                <Plus size={15} /> List a Book
              </button>

              {/* Notifications bell */}
              <button
                onClick={() => navigate('/notifications')}
                style={{ ...iconBtn, position: 'relative' }}
                title="Notifications"
                onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = navText; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(15,23,42,0.10)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.72)'; e.currentTarget.style.color = navSubtext; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(15,23,42,0.06)'; }}
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 5, right: 5,
                    minWidth: 16, height: 16, borderRadius: 8,
                    background: '#ef4444', color: 'white',
                    fontSize: '0.6rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1, padding: '0 3px',
                    pointerEvents: 'none',
                  }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Messages */}
              <button
                onClick={() => navigate('/chat')}
                style={{ ...iconBtn }}
                title="Messages"
                onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = navText; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(15,23,42,0.10)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.72)'; e.currentTarget.style.color = navSubtext; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(15,23,42,0.06)'; }}
              >
                <MessageCircle size={17} />
              </button>

              {/* Profile dropdown */}
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '0 12px 0 7px', height: 42, borderRadius: 14,
                    background: dropdownOpen ? 'white' : 'rgba(255,255,255,0.72)',
                    border: '1px solid rgba(148,163,184,0.22)',
                    boxShadow: dropdownOpen ? '0 12px 24px rgba(15,23,42,0.10)' : '0 8px 20px rgba(15,23,42,0.06)',
                    cursor: 'pointer', transition: 'background 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => { if (!dropdownOpen) e.currentTarget.style.background = 'white'; }}
                  onMouseLeave={e => { if (!dropdownOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.72)'; }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                    background: 'linear-gradient(135deg,#0ea5e9,#6366f1,#8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, color: 'white',
                    fontFamily: 'inherit',
                  }}>
                    {getInitials(user.name || user.email)}
                  </div>
                  <span style={{ color: navText, fontSize: '0.875rem', fontWeight: 600, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name?.split(' ')[0] || 'Profile'}
                  </span>
                  <ChevronDown size={13} style={{
                    color: '#94a3b8',
                    transform: dropdownOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                    flexShrink: 0,
                  }} />
                </button>

                {/* Dropdown panel */}
                {dropdownOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    width: 220,
                    background: 'rgba(255,255,255,0.96)',
                    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(148,163,184,0.20)',
                    borderRadius: 16, overflow: 'hidden',
                    boxShadow: '0 20px 60px rgba(15,23,42,0.16)',
                    zIndex: 200,
                  }}>
                    {/* User info header */}
                    <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(148,163,184,0.14)' }}>
                      <p style={{ color: navText, fontWeight: 700, fontSize: '0.875rem', marginBottom: 2 }}>
                        {user.name || 'Reader'}
                      </p>
                      <p style={{ color: '#64748b', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email}
                      </p>
                    </div>

                    {/* Menu items */}
                    {[
                      { icon: User,          label: 'My Profile',        to: '/profile' },
                      { icon: BookOpen,      label: 'My Books',          to: '/my-books' },
                      { icon: Inbox,         label: 'Incoming Requests', to: '/requests/received' },
                      { icon: BookMarked,    label: 'My Requests',       to: '/requests/sent' },
                      ...(user.role === 'ADMIN'
                        ? [{ icon: Shield, label: 'Admin Dashboard', to: '/admin' }]
                        : []),
                    ].map(({ icon: Icon, label, to }) => (
                      <button
                        key={to}
                        onClick={() => { navigate(to); setDropdownOpen(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          width: '100%', padding: '10px 16px', border: 'none',
                          background: 'none', color: '#475569',
                          fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
                          fontFamily: 'inherit', textAlign: 'left',
                          transition: 'background 0.15s, color 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.color = navText; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#475569'; }}
                      >
                        <Icon size={15} style={{ opacity: 0.65, flexShrink: 0 }} />
                        {label}
                      </button>
                    ))}

                    {/* Logout */}
                    <div style={{ borderTop: '1px solid rgba(148,163,184,0.14)', padding: '6px 0' }}>
                      <button
                        onClick={handleLogout}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          width: '100%', padding: '10px 16px', border: 'none',
                          background: 'none', color: 'rgba(248,113,113,0.85)',
                          fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'background 0.15s, color 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#fca5a5'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(248,113,113,0.85)'; }}
                      >
                        <LogOut size={15} style={{ flexShrink: 0 }} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ── Logged out ── */
            <>
              <Link
                to="/login"
                style={{
                  padding: '0 16px', height: 40, borderRadius: 14,
                  display: 'flex', alignItems: 'center',
                  background: 'rgba(255,255,255,0.72)',
                  border: '1px solid rgba(148,163,184,0.22)',
                  color: navText,
                  fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none',
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                  boxShadow: '0 8px 20px rgba(15,23,42,0.06)',
                  transition: 'background 0.2s, transform 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.72)'; e.currentTarget.style.transform = 'none'; }}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                style={{
                  padding: '0 18px', height: 40, borderRadius: 14,
                  display: 'flex', alignItems: 'center',
                  background: 'linear-gradient(135deg,#0ea5e9,#6366f1,#8b5cf6)',
                  color: 'white', fontWeight: 700, fontSize: '0.875rem',
                  textDecoration: 'none', fontFamily: 'inherit', whiteSpace: 'nowrap',
                  boxShadow: '0 12px 26px rgba(99,102,241,0.28)',
                  transition: 'opacity 0.2s, transform 0.15s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.92'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 16px 32px rgba(99,102,241,0.36)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1';    e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 12px 26px rgba(99,102,241,0.28)'; }}
              >
                Register Free
              </Link>
            </>
          )}

          {/* ── Mobile hamburger ── */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="navbar-hamburger"
            style={{ ...iconBtn }}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          MOBILE DRAWER
      ══════════════════════════════════════════════════════════════════ */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99,
          background: 'rgba(15,23,42,0.18)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            style={{
              position: 'absolute', top: 72, left: 12, right: 12,
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(148,163,184,0.20)',
              borderRadius: 22,
              boxShadow: '0 24px 60px rgba(15,23,42,0.18)',
              padding: '20px 20px',
              display: 'flex', flexDirection: 'column', gap: 4,
              fontFamily: "'Outfit', sans-serif",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile search */}
            <form onSubmit={e => { handleSearch(e); setMobileOpen(false); }}
                  style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                background: '#f8fafc',
                border: '1px solid rgba(148,163,184,0.20)',
                borderRadius: 14, padding: '0 12px', height: 44,
              }}>
                <Search size={15} style={{ color: '#94a3b8' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search books…"
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: navText, fontSize: '0.9rem', fontFamily: 'inherit' }}
                />
              </div>
              <button type="submit" style={{
                padding: '0 16px', height: 44, borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg,#0ea5e9,#6366f1)',
                color: 'white', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Go
              </button>
            </form>

            {/* Mobile nav links */}
            {[
              { to: '/books',              label: 'Browse Books',      icon: BookOpen },
              ...(user ? [
                { to: '/books/add',        label: 'List a Book',       icon: Plus },
                { to: '/my-books',         label: 'My Books',          icon: BookMarked },
                { to: '/requests/received',label: 'Incoming Requests', icon: Inbox },
                { to: '/requests/sent',    label: 'My Requests',       icon: BookOpen },
                { to: '/chat',             label: 'Messages',          icon: MessageCircle },
                { to: '/notifications',    label: 'Notifications',     icon: Bell },
                { to: '/profile',          label: 'My Profile',        icon: User },
                ...(user.role === 'ADMIN'
                  ? [{ to: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard }]
                  : []),
              ] : [
                { to: '/login',    label: 'Sign In',     icon: User },
                { to: '/register', label: 'Register Free', icon: BookHeart },
              ]),
            ].map(({ to, label, icon: Icon }) => (
              <button
                key={to}
                onClick={() => { navigate(to); setMobileOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '12px 14px', border: 'none',
                  background: pathname === to ? 'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(14,165,233,0.10))' : 'none',
                  borderRadius: 14,
                  color: pathname === to ? navText : '#475569',
                  fontSize: '0.9375rem', fontWeight: pathname === to ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.color = navText; }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = pathname === to ? 'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(14,165,233,0.10))' : 'none';
                  e.currentTarget.style.color = pathname === to ? navText : '#475569';
                }}
              >
                <Icon size={17} style={{ opacity: 0.70, flexShrink: 0 }} />
                {label}
              </button>
            ))}

            {/* Logout (mobile) */}
            {user && (
              <button
                onClick={() => { handleLogout(); setMobileOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '12px 14px', border: 'none',
                  background: 'none', borderRadius: 10,
                  color: 'rgba(248,113,113,0.80)',
                  fontSize: '0.9375rem', fontWeight: 400,
                  cursor: 'pointer', fontFamily: 'inherit',
                  marginTop: 4, borderTop: '1px solid rgba(148,163,184,0.14)',
                  paddingTop: 16,
                }}
              >
                <LogOut size={17} style={{ flexShrink: 0 }} />
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          RESPONSIVE RULES
      ══════════════════════════════════════════════════════════════════ */}
      <style>{`
        /* Hide search + nav links on mobile */
        @media (max-width: 767px) {
          .navbar-search   { display: none !important; }
          .navbar-links    { display: none !important; }
          .navbar-add-btn  { display: none !important; }
        }

        /* Hide hamburger on desktop */
        @media (min-width: 768px) {
          .navbar-hamburger { display: none !important; }
        }
      `}</style>
    </>
  );
}