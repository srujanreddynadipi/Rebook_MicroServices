import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import useGeolocation from '../../hooks/useGeolocation';

const CATEGORIES = [
  { value: 'ENGINEERING', emoji: '🔧', label: 'Engineering' },
  { value: 'MEDICAL', emoji: '💊', label: 'Medical' },
  { value: 'NOVELS', emoji: '📖', label: 'Novels' },
  { value: 'SCHOOL', emoji: '🏫', label: 'School' },
  { value: 'COMPETITIVE_EXAMS', emoji: '🏆', label: 'Competitive' },
  { value: 'SELF_HELP', emoji: '🌟', label: 'Self Help' },
  { value: 'STORY_BOOKS', emoji: '👶', label: 'Story Books' },
  { value: 'HISTORY', emoji: '🕌', label: 'History' },
  { value: 'LANGUAGE', emoji: '🌍', label: 'Language' },
  { value: 'OTHER', emoji: '📚', label: 'Other' },
];

const CONDITIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'USED_GOOD', label: 'Good' },
  { value: 'USED_OLD', label: 'Old' },
];

const RADIUS_OPTIONS = [5, 10, 25, 50];

const inputBaseStyle = {
  height: 44,
  borderRadius: 'var(--radius-input)',
  border: '1.5px solid var(--border)',
  padding: '0 14px',
  fontSize: '0.9375rem',
  background: 'var(--bg-page)',
  color: 'var(--text-primary)',
  outline: 'none',
  width: '100%',
  fontFamily: "'DM Sans', sans-serif",
};

function SectionLabel({ children }) {
  return (
    <p
      className="mb-3 font-['DM_Sans'] font-semibold uppercase"
      style={{ color: 'var(--text-primary)', fontSize: '0.8125rem', letterSpacing: '0.06em' }}
    >
      {children}
    </p>
  );
}

export default function BookFilter({ filters, onFilterChange }) {
  const [local, setLocal] = useState({ ...filters });
  const { coords, loading: geoLoading, error: geoError, getLocation } = useGeolocation();

  // Keep local editor state in sync with URL-backed filter state.
  useEffect(() => {
    setLocal({ ...filters });
  }, [filters]);

  // Sync geolocation coords into local state when they arrive
  useEffect(() => {
    if (coords) {
      setLocal((prev) => ({
        ...prev,
        userLatitude: coords.lat,
        userLongitude: coords.lng,
      }));
    }
  }, [coords]);

  const update = (key, value) =>
    setLocal((prev) => ({ ...prev, [key]: value }));

  const toggle = (key) =>
    setLocal((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleApply = () => onFilterChange(local);

  const handleReset = () => {
    const reset = {
      keyword: '',
      category: '',
      condition: '',
      isDonation: false,
      isLending: false,
      city: '',
      userLatitude: null,
      userLongitude: null,
      radiusKm: 50,
    };
    setLocal(reset);
    onFilterChange(reset);
  };

  const hasLocation = !!(coords || local.userLatitude);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="font-['Sora'] font-semibold"
          style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}
        >
          Filters
        </h3>
        <button
          className="font-['DM_Sans'] font-medium transition-colors hover:opacity-70"
          style={{ color: 'var(--primary)', fontSize: '0.8125rem', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={handleReset}
        >
          Clear all
        </button>
      </div>

      <hr style={{ borderColor: 'var(--border)', margin: 0 }} />

      {/* Keyword search */}
      <div>
        <SectionLabel>Keyword</SectionLabel>
        <input
          type="text"
          value={local.keyword}
          onChange={(e) => update('keyword', e.target.value)}
          placeholder="Title, author, ISBN..."
          style={inputBaseStyle}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--primary)';
            e.target.style.boxShadow = '0 0 0 3px rgba(0,201,167,0.12)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border)';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Category grid */}
      <div>
        <SectionLabel>Category</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => {
            const active = local.category === cat.value;
            return (
              <button
                key={cat.value}
                className="flex flex-col items-center gap-1 py-2 px-1 transition-all duration-200 font-['DM_Sans']"
                style={{
                  borderRadius: 8,
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  background: active ? 'var(--primary)' : 'var(--bg-page)',
                  color: active ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}
                onClick={() => update('category', active ? '' : cat.value)}
              >
                <span style={{ fontSize: '1.125rem', lineHeight: 1 }}>{cat.emoji}</span>
                <span style={{ lineHeight: 1.2, textAlign: 'center' }}>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Condition pills */}
      <div>
        <SectionLabel>Condition</SectionLabel>
        <div className="flex gap-2">
          {CONDITIONS.map((cond) => {
            const active = local.condition === cond.value;
            return (
              <button
                key={cond.value}
                className="flex-1 font-['DM_Sans'] font-medium transition-all duration-200"
                style={{
                  height: 36,
                  borderRadius: 8,
                  fontSize: '0.875rem',
                  background: active ? 'var(--primary)' : 'white',
                  color: active ? 'white' : 'var(--text-secondary)',
                  border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}
                onClick={() => update('condition', active ? '' : cond.value)}
              >
                {cond.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Type toggles */}
      <div>
        <SectionLabel>Type</SectionLabel>
        <div className="flex gap-2">
          {[
            { key: 'isDonation', label: '🎁 Donation' },
            { key: 'isLending', label: '📖 Lending' },
          ].map(({ key, label }) => {
            const active = local[key];
            return (
              <button
                key={key}
                className="flex-1 font-['DM_Sans'] font-medium transition-all duration-200"
                style={{
                  height: 44,
                  borderRadius: 8,
                  fontSize: '0.875rem',
                  background: active ? 'var(--primary)' : 'white',
                  color: active ? 'white' : 'var(--text-secondary)',
                  border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}
                onClick={() => toggle(key)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* City input */}
      <div>
        <SectionLabel>City</SectionLabel>
        <input
          type="text"
          value={local.city}
          onChange={(e) => update('city', e.target.value)}
          placeholder="e.g. Hyderabad"
          style={inputBaseStyle}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--primary)';
            e.target.style.boxShadow = '0 0 0 3px rgba(0,201,167,0.12)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border)';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Distance */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>Distance</SectionLabel>
          {hasLocation && (
            <span
              className="font-['DM_Sans'] font-medium"
              style={{ color: 'var(--primary)', fontSize: '0.8125rem' }}
            >
              Within {local.radiusKm} km
            </span>
          )}
        </div>

        {hasLocation ? (
          <>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={local.radiusKm}
              onChange={(e) => update('radiusKm', Number(e.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            <div className="flex justify-between mt-1">
              {RADIUS_OPTIONS.map((r) => (
                <span
                  key={r}
                  className="font-['DM_Sans']"
                  style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}
                >
                  {r}km
                </span>
              ))}
            </div>
            <div className="mt-2">
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-['DM_Sans'] font-medium"
                style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.75rem' }}
              >
                <MapPin size={11} />
                Using your location
              </span>
            </div>
          </>
        ) : (
          <div>
            <button
              className="w-full flex items-center justify-center gap-2 font-['DM_Sans'] font-medium transition-all duration-200"
              style={{
                height: 44,
                borderRadius: 10,
                border: '1.5px solid var(--border)',
                background: 'var(--bg-page)',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                cursor: geoLoading ? 'wait' : 'pointer',
              }}
              onClick={getLocation}
              disabled={geoLoading}
            >
              <MapPin size={15} />
              {geoLoading ? 'Getting location…' : 'Use my location'}
            </button>
            {geoError && (
              <p
                className="mt-1.5 font-['DM_Sans']"
                style={{ color: 'var(--danger)', fontSize: '0.75rem' }}
              >
                {geoError}
              </p>
            )}
          </div>
        )}
      </div>

      <hr style={{ borderColor: 'var(--border)', margin: 0 }} />

      {/* Apply button */}
      <button
        className="w-full font-['DM_Sans'] font-semibold text-white transition-all duration-200 active:scale-[0.97]"
        style={{
          height: 44,
          borderRadius: 'var(--radius-btn)',
          background: 'var(--primary)',
          border: 'none',
          fontSize: '0.9375rem',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-dark)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--primary)')}
        onClick={handleApply}
      >
        Apply Filters
      </button>
    </div>
  );
}
