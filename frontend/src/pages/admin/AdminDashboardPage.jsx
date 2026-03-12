import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, ShieldBan, ShieldCheck, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import * as userApi from '../../api/userApi';

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

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
    if (window.confirm(`Delete user "${u.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(u.id);
    }
  };

  const users = data?.content || [];
  const totalPages = data?.totalPages || 0;
  const totalElements = data?.totalElements ?? '–';

  const filtered = search
    ? users.filter((u) => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
    : users;

  const getInitials = (name) => (name || '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: 'calc(100vh - 64px)', padding: '32px 24px' }}>
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '2rem', color: 'var(--text-primary)', margin: 0 }}>
              Admin Panel
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9375rem', color: 'var(--text-muted)', marginTop: 4 }}>
              <Users size={16} className="inline mr-1" style={{ verticalAlign: '-2px' }} />
              {totalElements} registered users
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="outline-none"
              style={{
                height: 40, width: 260, paddingLeft: 36, paddingRight: 14,
                border: '1.5px solid var(--border)', borderRadius: 20,
                fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem',
                background: '#fff', transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          {/* Table header */}
          <div className="hidden md:grid gap-4 px-5 py-3"
            style={{ gridTemplateColumns: '1fr 1.2fr 0.6fr 0.5fr 0.5fr 140px', borderBottom: '1px solid var(--border)', background: 'var(--bg-page)',
              fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <span>User</span><span>Email</span><span>City</span><span>Rating</span><span>Status</span><span>Actions</span>
          </div>

          {isLoading && (
            <div className="p-6 space-y-4">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />)}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="py-16 text-center">
              <Users size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <p style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--text-muted)' }}>No users found</p>
            </div>
          )}

          {!isLoading && filtered.map((u) => (
            <div key={u.id}
              className="grid items-center gap-4 px-5 py-3"
              style={{ gridTemplateColumns: '1fr 1.2fr 0.6fr 0.5fr 0.5fr 140px', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-page)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; }}
            >
              {/* Name + avatar */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 flex items-center justify-center rounded-full"
                  style={{ width: 36, height: 36, background: 'var(--primary)', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.75rem' }}>
                  {getInitials(u.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0 }}>{u.name}</p>
                  <p className="truncate md:hidden" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{u.email}</p>
                </div>
              </div>

              <span className="truncate hidden md:block" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{u.email}</span>
              <span className="hidden md:block" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{u.city || '–'}</span>
              <span className="hidden md:block" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {u.averageRating ? `⭐ ${u.averageRating.toFixed(1)}` : '–'}
              </span>

              {/* Status */}
              <span className="hidden md:block">
                {u.isBanned ? (
                  <span style={{ padding: '3px 10px', borderRadius: 12, background: 'rgba(255,77,79,0.12)', color: '#CF1322',
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.75rem' }}>Banned</span>
                ) : (
                  <span style={{ padding: '3px 10px', borderRadius: 12, background: 'rgba(82,196,26,0.12)', color: '#389E0D',
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.75rem' }}>Active</span>
                )}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                {u.isBanned ? (
                  <button onClick={() => unbanMutation.mutate(u.id)} title="Unban"
                    className="flex items-center justify-center border-none cursor-pointer"
                    style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(82,196,26,0.1)', color: '#389E0D', transition: 'background 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(82,196,26,0.2)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(82,196,26,0.1)'; }}
                  ><ShieldCheck size={16} /></button>
                ) : (
                  <button onClick={() => banMutation.mutate(u.id)} title="Ban"
                    className="flex items-center justify-center border-none cursor-pointer"
                    style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(250,173,20,0.1)', color: '#D48806', transition: 'background 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(250,173,20,0.2)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(250,173,20,0.1)'; }}
                  ><ShieldBan size={16} /></button>
                )}
                <button onClick={() => handleDelete(u)} title="Delete"
                  className="flex items-center justify-center border-none cursor-pointer"
                  style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,77,79,0.1)', color: 'var(--danger)', transition: 'background 0.2s' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,77,79,0.2)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,77,79,0.1)'; }}
                ><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="flex items-center justify-center border-none cursor-pointer"
              style={{ width: 36, height: 36, borderRadius: 8, background: '#fff', border: '1px solid var(--border)', color: page === 0 ? 'var(--text-muted)' : 'var(--text-primary)' }}>
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 8px' }}>
              Page {page + 1} of {totalPages}
            </span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="flex items-center justify-center border-none cursor-pointer"
              style={{ width: 36, height: 36, borderRadius: 8, background: '#fff', border: '1px solid var(--border)', color: page >= totalPages - 1 ? 'var(--text-muted)' : 'var(--text-primary)' }}>
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
