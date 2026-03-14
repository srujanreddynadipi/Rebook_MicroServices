import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, ImagePlus, ChevronRight, ChevronLeft, Check, Crosshair } from 'lucide-react';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as bookApi from '../../api/bookApi';
import useAuth from '../../hooks/useAuth';
import useGeolocation from '../../hooks/useGeolocation';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CATEGORIES = [
  { key: 'ENGINEERING', emoji: '🔧', label: 'Engineering' },
  { key: 'MEDICAL', emoji: '💊', label: 'Medical' },
  { key: 'NOVELS', emoji: '📖', label: 'Novels' },
  { key: 'SCHOOL', emoji: '🏫', label: 'School' },
  { key: 'COMPETITIVE_EXAMS', emoji: '🏆', label: 'Competitive' },
  { key: 'SELF_HELP', emoji: '🌟', label: 'Self Help' },
  { key: 'STORY_BOOKS', emoji: '👶', label: 'Story Books' },
  { key: 'HISTORY', emoji: '🕌', label: 'History' },
  { key: 'LANGUAGE', emoji: '🌍', label: 'Language' },
  { key: 'OTHER', emoji: '📚', label: 'Other' },
];

const CONDITIONS = [
  { key: 'NEW', label: 'New' },
  { key: 'USED_GOOD', label: 'Good' },
  { key: 'USED_OLD', label: 'Old' },
];

const STEPS = ['Details', 'Category & Type', 'Images'];
const DEFAULT_MAP_CENTER = [17.385, 78.4867];

const hasUsableCoords = (lat, lng) => (
  Number.isFinite(lat)
  && Number.isFinite(lng)
  && Math.abs(lat) <= 90
  && Math.abs(lng) <= 180
  && !(lat === 0 && lng === 0)
);

function DraggableMarker({ position, onMove }) {
  const markerRef = useRef(null);
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (!marker) return;
        const { lat, lng } = marker.getLatLng();
        onMove(lat, lng);
      },
    }),
    [onMove]
  );

  return <Marker draggable position={position} eventHandlers={eventHandlers} ref={markerRef} />;
}

function RecenterMap({ center }) {
  const map = useMapEvents({});

  useEffect(() => {
    if (!center || center.length !== 2) return;
    map.setView(center, center[0] === DEFAULT_MAP_CENTER[0] && center[1] === DEFAULT_MAP_CENTER[1] ? 5 : 13);
  }, [center, map]);

  return null;
}

function MapClickSetter({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

export default function AddBookPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const { coords, loading: geoLoading, error: geoError, getLocation } = useGeolocation();

  const parsedUserLatitude = Number(user?.latitude);
  const parsedUserLongitude = Number(user?.longitude);
  const hasInitialCoords = hasUsableCoords(parsedUserLatitude, parsedUserLongitude);
  const initialLatitude = hasInitialCoords ? parsedUserLatitude : null;
  const initialLongitude = hasInitialCoords ? parsedUserLongitude : null;
  const initialMapCenter = hasInitialCoords
    ? [initialLatitude, initialLongitude]
    : DEFAULT_MAP_CENTER;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: '', author: '', publisher: '', isbn: '', keywords: '',
    category: '', condition: 'USED_GOOD',
    city: user?.city || '', isDonation: true, isLending: false,
    latitude: initialLatitude,
    longitude: initialLongitude,
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [mapCenter, setMapCenter] = useState(initialMapCenter);

  useEffect(() => {
    if (!coords) return;
    setForm((prev) => ({ ...prev, latitude: coords.lat, longitude: coords.lng }));
    setMapCenter([coords.lat, coords.lng]);
    toast.success('Location captured');
  }, [coords]);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const toggle = (key) => () => setForm((p) => ({ ...p, [key]: !p[key] }));
  const handleMarkerMove = (latitude, longitude) => {
    setForm((prev) => ({ ...prev, latitude, longitude }));
    setMapCenter([latitude, longitude]);
  };

  const mutation = useMutation({
    mutationFn: (fd) => bookApi.createBook(fd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success('Book listed successfully!');
      navigate('/my-books');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to create book'),
  });

  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    setImages((prev) => [...prev, ...files]);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onloadend = () => setPreviews((prev) => [...prev, reader.result]);
      reader.readAsDataURL(f);
    });
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (!form.title || !form.author || !form.category || !form.city) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!form.isDonation && !form.isLending) {
      toast.error('Select at least one book type (Donation or Lending)');
      return;
    }

    const fd = new FormData();
    const bookRequest = {
      title: form.title, author: form.author, publisher: form.publisher,
      isbn: form.isbn, keywords: form.keywords, category: form.category,
      condition: form.condition, city: form.city,
      isDonation: form.isDonation, isLending: form.isLending,
      latitude: hasUsableCoords(form.latitude, form.longitude) ? form.latitude : null,
      longitude: hasUsableCoords(form.latitude, form.longitude) ? form.longitude : null,
    };
    fd.append('bookRequest', new Blob([JSON.stringify(bookRequest)], { type: 'application/json' }));
    images.forEach((img) => fd.append('images', img));
    mutation.mutate(fd);
  };

  const canNext = () => {
    if (step === 0) return form.title && form.author && form.city;
    if (step === 1) return form.category && (form.isDonation || form.isLending);
    return true;
  };

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

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: 'calc(100vh - 64px)', padding: '32px 24px' }}>
      <div className="mx-auto" style={{ maxWidth: 640 }}>
        {/* Header */}
        <h1 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '2rem', color: 'var(--text-primary)', marginBottom: 8 }}>
          List a Book
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9375rem', color: 'var(--text-muted)', marginBottom: 32 }}>
          Share your book with the community
        </p>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 32, height: 32, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.8125rem',
                  background: i <= step ? 'var(--primary)' : 'var(--border)', color: i <= step ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                }}
              >
                {i < step ? <Check size={16} /> : i + 1}
              </div>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', color: i <= step ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: i === step ? 600 : 400 }}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div style={{ width: 32, height: 2, background: i < step ? 'var(--primary)' : 'var(--border)', borderRadius: 1 }} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', padding: 32, boxShadow: 'var(--shadow-card)' }}>

          {/* Step 0: Details */}
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <div><label style={labelStyle}>Title *</label>
                <input value={form.title} onChange={set('title')} placeholder="e.g. Data Structures & Algorithms" style={inputStyle} onFocus={focusH} onBlur={blurH} /></div>
              <div><label style={labelStyle}>Author *</label>
                <input value={form.author} onChange={set('author')} placeholder="e.g. Thomas H. Cormen" style={inputStyle} onFocus={focusH} onBlur={blurH} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label style={labelStyle}>Publisher</label>
                  <input value={form.publisher} onChange={set('publisher')} placeholder="Publisher name" style={inputStyle} onFocus={focusH} onBlur={blurH} /></div>
                <div><label style={labelStyle}>ISBN</label>
                  <input value={form.isbn} onChange={set('isbn')} placeholder="978-0-XX-XXXXXX-X" style={inputStyle} onFocus={focusH} onBlur={blurH} /></div>
              </div>
              <div><label style={labelStyle}>City *</label>
                <input value={form.city} onChange={set('city')} placeholder="Hyderabad" style={inputStyle} onFocus={focusH} onBlur={blurH} /></div>
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 2 }}>Pickup location</label>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                      Use your current location or drag the pin to the exact spot.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={getLocation}
                    disabled={geoLoading}
                    className="flex items-center gap-2 border-none cursor-pointer"
                    style={{
                      height: 38,
                      padding: '0 14px',
                      borderRadius: 10,
                      background: geoLoading ? 'var(--border)' : 'rgba(0,201,167,0.12)',
                      color: geoLoading ? 'var(--text-muted)' : 'var(--primary)',
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: '0.875rem',
                    }}
                  >
                    <Crosshair size={15} />
                    {geoLoading ? 'Locating…' : 'Use My Location'}
                  </button>
                </div>

                <div
                  style={{
                    height: 260,
                    borderRadius: 16,
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-page)',
                  }}
                >
                  <MapContainer
                    center={mapCenter}
                    zoom={mapCenter[0] === DEFAULT_MAP_CENTER[0] && mapCenter[1] === DEFAULT_MAP_CENTER[1] ? 5 : 13}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <RecenterMap center={mapCenter} />
                    <MapClickSetter onPick={handleMarkerMove} />
                    <DraggableMarker
                      position={[
                        Number.isFinite(form.latitude) ? form.latitude : mapCenter[0],
                        Number.isFinite(form.longitude) ? form.longitude : mapCenter[1],
                      ]}
                      onMove={handleMarkerMove}
                    />
                  </MapContainer>
                </div>

                <div className="flex items-center justify-between gap-3 mt-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  <span>
                    Lat: {Number.isFinite(form.latitude) ? form.latitude.toFixed(5) : 'Not set'}
                  </span>
                  <span>
                    Lng: {Number.isFinite(form.longitude) ? form.longitude.toFixed(5) : 'Not set'}
                  </span>
                </div>

                {geoError && (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8125rem', color: 'var(--danger)', margin: '8px 0 0' }}>
                    {geoError}
                  </p>
                )}
              </div>
              <div><label style={labelStyle}>Keywords</label>
                <input value={form.keywords} onChange={set('keywords')} placeholder="algorithms, programming, CS" style={inputStyle} onFocus={focusH} onBlur={blurH} /></div>
            </div>
          )}

          {/* Step 1: Category + Condition + Type */}
          {step === 1 && (
            <div className="flex flex-col gap-6">
              {/* Category grid */}
              <div>
                <label style={labelStyle}>Category *</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {CATEGORIES.map((c) => (
                    <button key={c.key} type="button" onClick={() => setForm((p) => ({ ...p, category: c.key }))}
                      className="flex flex-col items-center gap-1 py-3 border-none cursor-pointer"
                      style={{
                        borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', fontWeight: 500,
                        background: form.category === c.key ? 'var(--primary)' : 'var(--bg-page)',
                        color: form.category === c.key ? '#fff' : 'var(--text-secondary)',
                        border: form.category === c.key ? '2px solid var(--primary)' : '1px solid var(--border)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span style={{ fontSize: '1.25rem' }}>{c.emoji}</span>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition pills */}
              <div>
                <label style={labelStyle}>Condition *</label>
                <div className="flex gap-2">
                  {CONDITIONS.map((c) => (
                    <button key={c.key} type="button" onClick={() => setForm((p) => ({ ...p, condition: c.key }))}
                      className="flex-1 border-none cursor-pointer"
                      style={{
                        height: 42, borderRadius: 21, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.875rem',
                        background: form.condition === c.key ? 'var(--primary)' : 'transparent',
                        color: form.condition === c.key ? '#fff' : 'var(--text-secondary)',
                        border: form.condition === c.key ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type toggles */}
              <div>
                <label style={labelStyle}>Type *</label>
                <div className="flex gap-3">
                  <button type="button" onClick={toggle('isDonation')}
                    className="flex-1 flex items-center justify-center gap-2 border-none cursor-pointer"
                    style={{
                      height: 56, borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.9375rem',
                      background: form.isDonation ? '#FFFBF0' : '#fff',
                      color: form.isDonation ? '#D48806' : 'var(--text-secondary)',
                      border: form.isDonation ? '2px solid #FFB830' : '1.5px solid var(--border)',
                      transition: 'all 0.2s',
                    }}
                  >
                    🎁 Donation
                  </button>
                  <button type="button" onClick={toggle('isLending')}
                    className="flex-1 flex items-center justify-center gap-2 border-none cursor-pointer"
                    style={{
                      height: 56, borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.9375rem',
                      background: form.isLending ? '#FFF3EC' : '#fff',
                      color: form.isLending ? '#D4380D' : 'var(--text-secondary)',
                      border: form.isLending ? '2px solid var(--accent-orange)' : '1.5px solid var(--border)',
                      transition: 'all 0.2s',
                    }}
                  >
                    📖 Lending
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Images */}
          {step === 2 && (
            <div>
              <label style={labelStyle}>Book Images (up to 5)</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-2">
                {previews.map((p, i) => (
                  <div key={i} className="relative" style={{ aspectRatio: '3/4', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img src={p} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 flex items-center justify-center border-none cursor-pointer"
                      style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 border-none cursor-pointer"
                    style={{
                      aspectRatio: '3/4', borderRadius: 10, background: 'var(--bg-page)',
                      border: '2px dashed var(--border)', color: 'var(--text-muted)',
                      fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    <ImagePlus size={24} />
                    Add
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            {step > 0 ? (
              <button type="button" onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 border-none cursor-pointer"
                style={{ background: 'transparent', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                <ChevronLeft size={18} /> Back
              </button>
            ) : <div />}

            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canNext()}
                className="flex items-center gap-1.5 border-none cursor-pointer"
                style={{
                  height: 44, paddingLeft: 24, paddingRight: 20, borderRadius: 'var(--radius-btn)',
                  background: canNext() ? 'var(--primary)' : 'var(--border)', color: '#fff',
                  fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.9375rem',
                  transition: 'background 0.2s', opacity: canNext() ? 1 : 0.6,
                }}>
                Next <ChevronRight size={18} />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={mutation.isPending}
                className="flex items-center justify-center gap-2 border-none cursor-pointer"
                style={{
                  height: 48, paddingLeft: 28, paddingRight: 28, borderRadius: 'var(--radius-btn)',
                  background: 'var(--primary)', color: '#fff',
                  fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '1rem',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary-dark)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'var(--primary)'; }}
              >
                {mutation.isPending && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {mutation.isPending ? 'Publishing…' : <><Upload size={18} /> Publish Book</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
