import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, ShieldBan, ShieldCheck, Trash2, Search,
  ChevronLeft, ChevronRight, Shield, UserCheck,
  UserX, TrendingUp, MoreVertical,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as userApi from '../../api/userApi';

/* ─── tiny helpers ──────────────────────────────────────────────────────── */
const getInitials = (name) =>
  (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const AVATAR_COLORS = [
  ['#ede9fe','#6d28d9'], ['#dbeafe','#1d4ed8'], ['#dcfce7','#15803d'],
  ['#fef3c7','#b45309'], ['#fce7f3','#be185d'], ['#e0f2fe','#0369a1'],
];
const avatarColor = (id) => AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length];

/* ─── StatCard ──────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, accent, sub }) {
  return (
    <div style={{
      background: 'white', border: '1px solid #e2e8f0', borderRadius: 20,
      padding: '22px 24px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 88, height: 88,
        borderRadius: '50%', background: accent, opacity: 0.08,
      }} />
      <div style={{
        width: 42, height: 42, borderRadius: 13, background: accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14, boxShadow: `0 4px 12px ${accent}55`,
      }}>
        <Icon size={20} color="white" />
      </div>
      <p style={{ fontSize: '1.875rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', margin: 0 }}>
        {value}
      </p>
      <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', marginTop: 2 }}>{label}</p>
      {sub && <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

/* ─── RoleBadge ─────────────────────────────────────────────────────────── */
function StatusBadge({ banned }) {
  return banned ? (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: '#fef2f2', border: '1px solid #fecaca',
      color: '#dc2626', fontWeight: 600, fontSize: '0.6875rem',
      letterSpacing: '0.03em', textTransform: 'uppercase',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
      Banned
    </span>
  ) : (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: '#f0fdf4', border: '1px solid #bbf7d0',
      color: '#16a34a', fontWeight: 600, fontSize: '0.6875rem',
      letterSpacing: '0.03em', textTransform: 'uppercase',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
      Active
    </span>
  );
}

/* ─── ActionButton ──────────────────────────────────────────────────────── */
function ActionBtn({ onClick, title, bgColor, hoverBg, textColor, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hov ? hoverBg : bgColor, color: textColor,
        transition: 'background 0.15s, transform 0.12s',
        transform: hov ? 'scale(1.08)' : 'scale(1)',
      }}
    >{children}</button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AdminDashboardPage
═══════════════════════════════════════════════════════════════════════════ */
export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['adminUsers', page],
    queryFn: () => userApi.getAllUsers({ page, size: 20 }),
  });

  const banMutation = useMutation({
    mutationFn: (id) => userApi.banUser(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); toast.success('User banned'); },
    onError: () => toast.error('Failed to ban user'),
  });

  const unbanMutation = useMutation({
    mutationFn: (id) => userApi.unbanUser(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); toast.success('User unbanned'); },
    onError: () => toast.error('Failed to unban user'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => userApi.deleteUser(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); toast.success('User deleted'); },
    onError: () => toast.error('Failed to delete user'),
  });

  const handleDelete = (u) => {
    if (window.confirm(`Delete "${u.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(u.id);
    }
  };

  const pageData = data?.content ? data : (data?.data ?? null);
  const users        = pageData?.content       || [];
  const totalPages   = pageData?.totalPages    || 0;
  const totalElements = pageData?.totalElements ?? 0;
  const bannedCount  = users.filter(u => u.isBanned).length;
  const activeCount  = users.filter(u => !u.isBanned).length;

  const filtered = search
    ? users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  /* grid columns */
  const COL = '44px 1fr 1.3fr 0.55fr 0.45fr 0.6fr 120px';

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", background: '#f8fafc', minHeight: 'calc(100vh - 64px)', padding: '36px clamp(16px,3vw,40px) 60px' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .au-row { transition: background 0.12s; }
        .au-row:hover { background: #f8fafc !important; }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .skel { background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:8px; }
        @media(max-width:900px){
          .au-col-hide{display:none!important;}
          .au-col-grid{grid-template-columns:44px 1fr 100px!important;}
        }
      `}</style>

      <div style={{ maxWidth: 1120, margin: '0 auto' }}>

        {/* ── Page header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 32, animation: 'fadeUp 0.5s ease both' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 99, padding: '5px 14px', marginBottom: 12 }}>
              <Shield size={13} style={{ color: '#6366f1' }} />
              <span style={{ color: '#4338ca', fontSize: '0.8125rem', fontWeight: 600 }}>Admin Panel</span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.625rem,3vw,2.25rem)', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>
              User Management
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9375rem', marginTop: 6 }}>
              Monitor, ban, and manage all registered users
            </p>
          </div>

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'white', border: `1.5px solid ${searchFocus ? '#6366f1' : '#e2e8f0'}`,
            borderRadius: 14, padding: '0 16px', height: 46, width: 280,
            boxShadow: searchFocus ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}>
            <Search size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <input
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                color: '#0f172a', fontSize: '0.875rem', fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 16, marginBottom: 28, animation: 'fadeUp 0.5s 0.05s ease both' }}>
          <StatCard icon={Users}     label="Total Users"    value={totalElements} accent="#6366f1" sub={`Page ${page+1} of ${totalPages||1}`} />
          <StatCard icon={UserCheck} label="Active Users"   value={isLoading ? '–' : activeCount}  accent="#16a34a" />
          <StatCard icon={UserX}     label="Banned Users"   value={isLoading ? '–' : bannedCount}  accent="#dc2626" />
          <StatCard icon={TrendingUp} label="This Page"     value={isLoading ? '–' : users.length} accent="#0ea5e9" sub="users loaded" />
        </div>

        {/* ── Table card ── */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 22, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.05)', animation: 'fadeUp 0.5s 0.10s ease both' }}>

          {/* Table head */}
          <div
            className="au-col-grid"
            style={{
              display: 'grid', gridTemplateColumns: COL,
              alignItems: 'center', gap: 12,
              padding: '12px 20px',
              background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
              fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}
          >
            <span />
            <span>Name</span>
            <span className="au-col-hide">Email</span>
            <span className="au-col-hide">City</span>
            <span className="au-col-hide">Rating</span>
            <span>Status</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {/* Skeleton */}
          {isLoading && (
            <div style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skel" style={{ height: 48 }} />
              ))}
            </div>
          )}

          {/* Empty */}
          {!isLoading && filtered.length === 0 && (
            <div style={{ padding: '64px 0', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Users size={26} style={{ color: '#94a3b8' }} />
              </div>
              <p style={{ color: '#64748b', fontWeight: 600, fontSize: '0.9375rem' }}>No users found</p>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: 4 }}>
                {search ? 'Try a different search term' : 'No users have registered yet'}
              </p>
            </div>
          )}

          {/* Rows */}
          {!isLoading && filtered.map((u, idx) => {
            const [bg, fg] = avatarColor(u.id || idx);
            return (
              <div
                key={u.id}
                className="au-row au-col-grid"
                style={{
                  display: 'grid', gridTemplateColumns: COL,
                  alignItems: 'center', gap: 12,
                  padding: '13px 20px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                  background: 'white',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: bg, color: fg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.75rem', flexShrink: 0,
                  border: `1px solid ${fg}25`,
                }}>
                  {getInitials(u.name)}
                </div>

                {/* Name */}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.name}
                  </p>
                  <p className="au-col-hide" style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                    ID #{u.id}
                  </p>
                </div>

                {/* Email */}
                <p className="au-col-hide" style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {u.email}
                </p>

                {/* City */}
                <p className="au-col-hide" style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                  {u.city || <span style={{ color: '#cbd5e1' }}>—</span>}
                </p>

                {/* Rating */}
                <p className="au-col-hide" style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                  {u.averageRating
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>★</span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{u.averageRating.toFixed(1)}</span>
                      </span>
                    : <span style={{ color: '#cbd5e1' }}>—</span>
                  }
                </p>

                {/* Status */}
                <div><StatusBadge banned={u.isBanned} /></div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                  {u.isBanned ? (
                    <ActionBtn
                      onClick={() => unbanMutation.mutate(u.id)}
                      title="Unban user"
                      bgColor="#f0fdf4" hoverBg="#dcfce7" textColor="#16a34a"
                    >
                      <ShieldCheck size={15} />
                    </ActionBtn>
                  ) : (
                    <ActionBtn
                      onClick={() => banMutation.mutate(u.id)}
                      title="Ban user"
                      bgColor="#fefce8" hoverBg="#fef9c3" textColor="#ca8a04"
                    >
                      <ShieldBan size={15} />
                    </ActionBtn>
                  )}
                  <ActionBtn
                    onClick={() => handleDelete(u)}
                    title="Delete user"
                    bgColor="#fef2f2" hoverBg="#fee2e2" textColor="#dc2626"
                  >
                    <Trash2 size={15} />
                  </ActionBtn>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                width: 38, height: 38, borderRadius: 11, border: '1px solid #e2e8f0',
                background: 'white', cursor: page === 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: page === 0 ? '#cbd5e1' : '#374151',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { if (page > 0) { e.currentTarget.style.background='#f8fafc'; e.currentTarget.style.borderColor='#c7d2fe'; }}}
              onMouseLeave={e => { e.currentTarget.style.background='white'; e.currentTarget.style.borderColor='#e2e8f0'; }}
            >
              <ChevronLeft size={17} />
            </button>

            {/* Page pills */}
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              const p = i;
              const active = p === page;
              return (
                <button key={p} onClick={() => setPage(p)} style={{
                  width: 38, height: 38, borderRadius: 11, border: active ? 'none' : '1px solid #e2e8f0',
                  background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'white',
                  color: active ? 'white' : '#374151',
                  fontWeight: active ? 700 : 500, fontSize: '0.875rem',
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: active ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
                  transition: 'all 0.15s',
                }}>
                  {p + 1}
                </button>
              );
            })}

            {totalPages > 7 && (
              <span style={{ color: '#94a3b8', fontSize: '0.875rem', padding: '0 4px' }}>
                … {totalPages}
              </span>
            )}

            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{
                width: 38, height: 38, borderRadius: 11, border: '1px solid #e2e8f0',
                background: 'white', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: page >= totalPages - 1 ? '#cbd5e1' : '#374151',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { if (page < totalPages-1) { e.currentTarget.style.background='#f8fafc'; e.currentTarget.style.borderColor='#c7d2fe'; }}}
              onMouseLeave={e => { e.currentTarget.style.background='white'; e.currentTarget.style.borderColor='#e2e8f0'; }}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        )}

        {/* Footer note */}
        <p style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '0.75rem', marginTop: 20 }}>
          Showing {filtered.length} of {totalElements} users · Page {page + 1}
        </p>
      </div>
    </div>
  );
}