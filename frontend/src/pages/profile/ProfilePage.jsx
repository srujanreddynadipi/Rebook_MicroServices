import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, MapPin, Phone, Mail, Star, Save, BookOpen, Crosshair } from 'lucide-react';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useAuth from '../../hooks/useAuth';
import useGeolocation from '../../hooks/useGeolocation';
import * as userApi from '../../api/userApi';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function DraggableMarker({ position, onMove }) {
  const markerRef = useRef(null);
  const handlers = useMemo(
    () => ({
      dragend() {
        const m = markerRef.current;
        if (m) {
          const { lat, lng } = m.getLatLng();
          onMove(lat, lng);
        }
      },
    }),
    [onMove]
  );
  return <Marker draggable position={position} eventHandlers={handlers} ref={markerRef} />;
}

function RecenterMap({ center }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (center[0] !== 0 || center[1] !== 0) map.setView(center, 13);
  }, [center, map]);
  return null;
}

function Stars({ rating = 0 }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={16}
          fill={i < full ? '#FFB830' : i === full && half ? 'url(#half)' : 'none'}
          stroke={i < full || (i === full && half) ? '#FFB830' : 'var(--border)'}
        />
      ))}
    </span>
  );
}

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const { coords, loading: geoLoading, getLocation } = useGeolocation();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: userApi.getMyProfile,
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [mapCenter, setMapCenter] = useState([0, 0]);

  useEffect(() => {
    if (profile && !form) {
      setForm({
        name: profile.name || '',
        mobile: profile.mobile || '',
        city: profile.city || '',
        pincode: profile.pincode || '',
        latitude: profile.latitude || 0,
        longitude: profile.longitude || 0,
      });
      if (profile.latitude && profile.longitude) {
        setMapCenter([profile.latitude, profile.longitude]);
      }
    }
  }, [profile, form]);

  useEffect(() => {
    if (coords && form) {
      setForm((p) => ({ ...p, latitude: coords.lat, longitude: coords.lng }));
      setMapCenter([coords.lat, coords.lng]);
      toast.success('Location updated!');
    }
  }, [coords]);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (data) => userApi.updateProfile(data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (refreshUser && user?.id) await refreshUser(user.id);
      toast.success('Profile updated');
      setEditing(false);
      setForm(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Update failed'),
  });

  const handleSave = () => mutation.mutate(form);
  const getInitials = (name) => (name || '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const inputStyle = {
    height: 48, width: '100%', paddingLeft: 14, paddingRight: 14,
    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-input)',
    fontFamily: "'DM Sans', sans-serif", fontSize: '0.9375rem',
    background: 'var(--bg-page)', outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };
  const focusH = (e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,201,167,0.12)'; };
  const blurH = (e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; };
  const labelStyle = { fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)', marginBottom: 6, display: 'block' };

  if (isLoading) {
    return (
      <div style={{ background: 'var(--bg-page)', minHeight: 'calc(100vh - 64px)', padding: '32px 24px' }}>
        <div className="mx-auto" style={{ maxWidth: 900 }}>
          <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-card)' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: 'calc(100vh - 64px)', padding: '32px 24px' }}>
      <div className="mx-auto" style={{ maxWidth: 900 }}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left Column — Profile Display */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {/* Avatar card */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0D1117 0%, #0D2A25 100%)',
                borderRadius: 'var(--radius-card)', padding: '40px 24px',
                textAlign: 'center',
              }}
            >
              <div className="mx-auto flex items-center justify-center rounded-full"
                style={{
                  width: 88, height: 88, background: 'var(--primary)', color: '#fff',
                  fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '1.75rem',
                  border: '4px solid rgba(255,255,255,0.2)', marginBottom: 16,
                }}>
                {getInitials(profile?.name)}
              </div>
              <h2 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#fff', margin: 0 }}>
                {profile?.name}
              </h2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                {profile?.email}
              </p>

              {/* Stars */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <Stars rating={profile?.averageRating || 0} />
                {profile?.averageRating > 0 && (
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>
                    {profile.averageRating.toFixed(1)} ({profile.totalRatings || 0})
                  </span>
                )}
              </div>

              {profile?.city && (
                <span className="inline-flex items-center gap-1 mt-3" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>
                  <MapPin size={14} /> {profile.city}
                </span>
              )}
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: 12 }}>
                Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '–'}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', padding: '20px 16px', textAlign: 'center' }}>
                <p style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)', margin: 0 }}>
                  {profile?.totalBooksDonated ?? 0}
                </p>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: 'var(--text-muted)' }}>Donated</span>
              </div>
              <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', padding: '20px 16px', textAlign: 'center' }}>
                <p style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: 'var(--secondary)', margin: 0 }}>
                  {profile?.totalBooksLent ?? 0}
                </p>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lent</span>
              </div>
            </div>

            {/* Logout */}
            <button onClick={logout}
              className="w-full flex items-center justify-center gap-2 border-none cursor-pointer"
              style={{
                height: 48, borderRadius: 'var(--radius-btn)',
                background: '#fff', border: '1.5px solid var(--danger)', color: 'var(--danger)',
                fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.9375rem',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,77,79,0.06)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; }}
            >
              Logout
            </button>
          </div>

          {/* Right Column — Details / Edit Form */}
          <div className="md:col-span-3">
            <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', padding: 32, boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center justify-between mb-6">
                <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: '1.125rem', color: 'var(--text-primary)', margin: 0 }}>
                  Profile Details
                </h3>
                {!editing && (
                  <button onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 border-none cursor-pointer"
                    style={{
                      height: 36, paddingLeft: 16, paddingRight: 16, borderRadius: 8,
                      background: 'var(--primary-light)', color: 'var(--primary)',
                      fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.8125rem',
                    }}>
                    Edit
                  </button>
                )}
              </div>

              {!editing ? (
                <div className="flex flex-col gap-4">
                  <InfoRow icon={<User size={18} />} label="Name" value={profile?.name} />
                  <InfoRow icon={<Mail size={18} />} label="Email" value={profile?.email} />
                  <InfoRow icon={<Phone size={18} />} label="Mobile" value={profile?.mobile || 'Not set'} />
                  <InfoRow icon={<MapPin size={18} />} label="City" value={profile?.city || 'Not set'} />
                  <InfoRow icon={<BookOpen size={18} />} label="Pincode" value={profile?.pincode || 'Not set'} />

                  {/* Map (read-only view) */}
                  {profile?.latitude && profile?.longitude && (
                    <div style={{ height: 180, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', marginTop: 8 }}>
                      <MapContainer center={[profile.latitude, profile.longitude]} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false} dragging={false} zoomControl={false}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[profile.latitude, profile.longitude]} />
                      </MapContainer>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div><label style={labelStyle}>Name</label>
                    <input value={form?.name || ''} onChange={set('name')} style={inputStyle} onFocus={focusH} onBlur={blurH} /></div>
                  <div><label style={labelStyle}>Mobile</label>
                    <input value={form?.mobile || ''} onChange={set('mobile')} placeholder="+91 98765 43210" style={inputStyle} onFocus={focusH} onBlur={blurH} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label style={labelStyle}>City</label>
                      <input value={form?.city || ''} onChange={set('city')} style={inputStyle} onFocus={focusH} onBlur={blurH} /></div>
                    <div><label style={labelStyle}>Pincode</label>
                      <input value={form?.pincode || ''} onChange={set('pincode')} style={inputStyle} onFocus={focusH} onBlur={blurH} /></div>
                  </div>

                  {/* Location + Map */}
                  <div>
                    <button type="button" onClick={getLocation} disabled={geoLoading}
                      className="flex items-center gap-2 mb-3 border-none cursor-pointer"
                      style={{
                        height: 38, paddingLeft: 14, paddingRight: 14, borderRadius: 8,
                        background: 'var(--bg-page)', border: '1px solid var(--border)',
                        color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.8125rem',
                      }}>
                      <Crosshair size={15} />
                      {geoLoading ? 'Detecting…' : 'Use My Location'}
                    </button>
                    <div style={{ height: 200, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <MapContainer
                        center={mapCenter}
                        zoom={mapCenter[0] === 0 && mapCenter[1] === 0 ? 2 : 13}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={false}
                      >
                        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <RecenterMap center={mapCenter} />
                        <DraggableMarker
                          position={[form?.latitude || 0, form?.longitude || 0]}
                          onMove={(lat, lng) => setForm((p) => ({ ...p, latitude: lat, longitude: lng }))}
                        />
                      </MapContainer>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={handleSave} disabled={mutation.isPending}
                      className="flex items-center gap-2 border-none cursor-pointer"
                      style={{
                        height: 44, paddingLeft: 24, paddingRight: 24, borderRadius: 'var(--radius-btn)',
                        background: 'var(--primary)', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                        fontSize: '0.9375rem', transition: 'background 0.2s',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary-dark)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'var(--primary)'; }}
                    >
                      {mutation.isPending ? (
                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                      ) : (
                        <><Save size={16} /> Save</>
                      )}
                    </button>
                    <button onClick={() => { setEditing(false); setForm(null); }}
                      className="border-none cursor-pointer"
                      style={{ height: 44, paddingLeft: 18, paddingRight: 18, borderRadius: 'var(--radius-btn)',
                        background: 'transparent', color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.9375rem' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
        <p className="truncate" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9375rem', color: 'var(--text-primary)', margin: 0, marginTop: 2 }}>
          {value}
        </p>
      </div>
    </div>
  );
}
