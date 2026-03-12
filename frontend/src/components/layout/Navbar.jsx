import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Menu as HeadlessMenu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import {
  Search,
  Bell,
  ChevronDown,
  Menu,
  X,
  Plus,
  User,
  BookOpen,
  Send,
  Inbox,
  Shield,
  LogOut,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';
import { getUnreadCount } from '../../api/notificationApi';

export default function Navbar() {
  const { user, logout, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const searchRef = useRef(null);

  // ── Active-link helper ──────────────────────────────────────────────────────
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const activeLinkStyle = (path) => ({
    color: isActive(path) ? 'var(--primary)' : undefined,
    fontWeight: isActive(path) ? 600 : undefined,
  });

  // ── Poll unread notification count every 30s (only when logged in) ─────────
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: getUnreadCount,
    enabled: !!user,
    refetchInterval: 30_000,
    select: (data) => data?.unreadCount ?? 0,
  });
  const unreadCount = unreadData ?? 0;

  // ── Scroll shadow effect ────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── ⌘K / Ctrl+K shortcut focuses search ────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const getInitials = (name = '') =>
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/books?keyword=${encodeURIComponent(searchValue.trim())}`);
      setMobileOpen(false);
    }
  };

  const handleLogout = () => {
    setMobileOpen(false);
    queryClient.clear();
    logout();
  };

  const MENU_ITEMS = [
    { icon: User, label: 'Profile', to: '/profile' },
    { icon: BookOpen, label: 'My Books', to: '/my-books' },
    { icon: Send, label: 'Sent Requests', to: '/requests/sent' },
    { icon: Inbox, label: 'Received Requests', to: '/requests/received' },
    ...(isAdmin ? [{ icon: Shield, label: 'Admin Panel', to: '/admin' }] : []),
  ];

  return (
    <header
      className="sticky top-0 z-[1000] bg-white border-b border-[#E8EAED] transition-shadow duration-200"
      style={{
        boxShadow: scrolled
          ? '0 2px 20px rgba(0,0,0,0.12)'
          : '0 1px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div className="h-16 flex items-center gap-4 px-6 max-w-[1400px] mx-auto">

        {/* ── LEFT: Logo ───────────────────────────────────────────────────── */}
        <Link to="/" className="flex items-center gap-0.5 flex-shrink-0 select-none">
          <span
            className="font-['Sora'] font-bold text-2xl leading-none"
            style={{ color: 'var(--primary)' }}
          >
            Re
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full mx-0.5 mb-1 flex-shrink-0"
            style={{ background: 'var(--primary)' }}
          />
          <span
            className="font-['Sora'] font-bold text-2xl leading-none"
            style={{ color: 'var(--text-primary)' }}
          >
            Book
          </span>
        </Link>

        {/* ── CENTER: Search ── hidden on mobile ───────────────────────────── */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex flex-1 max-w-[520px] mx-auto items-center h-11 rounded-[22px] border-[1.5px] border-[#E8EAED] bg-[#F7F8FC] px-4 gap-2 transition-all duration-200 focus-within:border-[#00C9A7]"
          style={{ '--tw-ring-shadow': 'none' }}
        >
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={searchRef}
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search books, authors, or ISBN..."
            className="flex-1 bg-transparent text-sm font-['DM_Sans'] text-[#1A1D23] placeholder:text-[#9CA3AF] border-none outline-none"
          />
          <span className="hidden lg:flex items-center gap-0.5 bg-white border border-[#E8EAED] rounded-md px-1.5 py-0.5 text-[11px] font-['DM_Sans'] text-[#9CA3AF] flex-shrink-0">
            ⌘K
          </span>
        </form>

        {/* ── RIGHT: Actions ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 ml-auto">

          {/* "List a Book" button — always visible on desktop */}
          <Link
            to="/books/add"
            className="hidden md:flex items-center gap-1.5 h-9 px-4 rounded-[10px] text-sm font-semibold font-['DM_Sans'] text-white transition-all duration-200 hover:opacity-90 active:scale-[0.97]"
            style={{ background: 'var(--primary)' }}
          >
            <Plus size={15} strokeWidth={2.5} />
            List a Book
          </Link>

          {!user ? (
            /* Not logged in */
            <>
              <Link
                to="/login"
                className="hidden md:inline-flex h-9 px-4 items-center rounded-[10px] text-sm font-semibold font-['DM_Sans'] border border-[#E8EAED] text-[#1A1D23] hover:border-[#00C9A7] hover:text-[#00C9A7] transition-all duration-200"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="hidden md:inline-flex h-9 px-4 items-center rounded-[10px] text-sm font-semibold font-['DM_Sans'] text-white transition-all duration-200 hover:opacity-90 active:scale-[0.97]"
                style={{ background: 'var(--secondary)' }}
              >
                Register
              </Link>
            </>
          ) : (
            /* Logged in */
            <>
              {/* Notifications bell */}
              <Link
                to="/notifications"
                className="relative w-9 h-9 flex items-center justify-center rounded-[10px] border border-[#E8EAED] hover:border-[#00C9A7] hover:text-[#00C9A7] transition-all duration-200"
                style={{ color: isActive('/notifications') ? 'var(--primary)' : '#5C6370' }}
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Avatar dropdown via headlessui Menu */}
              <HeadlessMenu as="div" className="relative">
                <MenuButton className="flex items-center gap-1.5 h-9 px-2 rounded-[10px] border border-[#E8EAED] hover:border-[#00C9A7] transition-all duration-200 bg-white cursor-pointer">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold font-['DM_Sans'] flex-shrink-0"
                    style={{ background: 'var(--primary)' }}
                  >
                    {getInitials(user.name)}
                  </div>
                  <ChevronDown size={14} className="text-[#9CA3AF]" />
                </MenuButton>

                <MenuItems className="absolute right-0 top-[calc(100%+8px)] w-52 bg-white border border-[#E8EAED] rounded-[14px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] py-1.5 z-50 focus:outline-none">
                  <div className="px-4 py-2.5 border-b border-[#E8EAED]">
                    <p className="text-sm font-semibold font-['DM_Sans'] text-[#1A1D23] truncate">
                      {user.name}
                    </p>
                    <p className="text-xs font-['DM_Sans'] text-[#9CA3AF] truncate mt-0.5">
                      {user.email}
                    </p>
                  </div>

                  {MENU_ITEMS.map(({ icon: Icon, label, to }) => (
                    <MenuItem key={to}>
                      {({ active }) => (
                        <Link
                          to={to}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-['DM_Sans'] transition-colors duration-150"
                          style={{
                            background: active ? '#F7F8FC' : 'transparent',
                            color: isActive(to) ? 'var(--primary)' : active ? 'var(--primary)' : '#5C6370',
                            fontWeight: isActive(to) ? 600 : 400,
                          }}
                        >
                          <Icon size={15} />
                          {label}
                        </Link>
                      )}
                    </MenuItem>
                  ))}

                  <div className="border-t border-[#E8EAED] mt-1 pt-1">
                    <MenuItem>
                      {({ active }) => (
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-['DM_Sans'] text-[#FF4D4F] transition-colors duration-150 border-none cursor-pointer"
                          style={{ background: active ? 'rgba(255,77,79,0.06)' : 'transparent' }}
                          onClick={handleLogout}
                        >
                          <LogOut size={15} />
                          Logout
                        </button>
                      )}
                    </MenuItem>
                  </div>
                </MenuItems>
              </HeadlessMenu>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-[10px] border border-[#E8EAED] text-[#5C6370] hover:border-[#00C9A7] hover:text-[#00C9A7] transition-all duration-200"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu drawer ───────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#E8EAED] bg-white px-6 py-4 flex flex-col gap-3 fade-in-up">
          {/* Mobile search */}
          <form onSubmit={handleSearch} className="flex items-center h-11 rounded-[22px] border-[1.5px] border-[#E8EAED] bg-[#F7F8FC] px-4 gap-2">
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search books..."
              className="flex-1 bg-transparent text-sm font-['DM_Sans'] placeholder:text-[#9CA3AF] border-none outline-none"
            />
          </form>

          <Link
            to="/books/add"
            className="flex items-center justify-center gap-1.5 h-11 rounded-[10px] text-sm font-semibold font-['DM_Sans'] text-white"
            style={{ background: 'var(--primary)' }}
            onClick={() => setMobileOpen(false)}
          >
            <Plus size={15} strokeWidth={2.5} />
            List a Book
          </Link>

          {!user ? (
            <div className="flex gap-3">
              <Link
                to="/login"
                className="flex-1 h-11 flex items-center justify-center rounded-[10px] text-sm font-semibold font-['DM_Sans'] border border-[#E8EAED]"
                onClick={() => setMobileOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="flex-1 h-11 flex items-center justify-center rounded-[10px] text-sm font-semibold font-['DM_Sans'] text-white"
                style={{ background: 'var(--secondary)' }}
                onClick={() => setMobileOpen(false)}
              >
                Register
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {[
                { label: 'My Books', to: '/my-books' },
                { label: 'Sent Requests', to: '/requests/sent' },
                { label: 'Received Requests', to: '/requests/received' },
                { label: 'Notifications', to: '/notifications' },
                { label: 'Profile', to: '/profile' },
                ...(isAdmin ? [{ label: 'Admin Panel', to: '/admin' }] : []),
              ].map(({ label, to }) => (
                <Link
                  key={to}
                  to={to}
                  className="h-11 flex items-center px-3 rounded-[10px] text-sm font-['DM_Sans'] hover:bg-[#F7F8FC] transition-colors duration-150"
                  style={activeLinkStyle(to)}
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <button
                className="h-11 flex items-center px-3 rounded-[10px] text-sm font-['DM_Sans'] text-[#FF4D4F] hover:bg-red-50 transition-colors duration-150 border-none cursor-pointer bg-transparent"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

