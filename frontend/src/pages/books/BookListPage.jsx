import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  LayoutGrid,
  Map as MapIcon,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { getBooks } from '../../api/bookApi';
import BookCard from '../../components/book/BookCard';
import BookFilter from '../../components/book/BookFilter';

// ── Fix Leaflet's broken marker icons in Vite ──────────────────────────────
// eslint-disable-next-line no-underscore-dangle
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Newest First' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'requestCount', label: 'Most Requested' },
];

// ── Build clean API params (strip empty / false / null) ───────────────────
function buildApiParams(filters) {
  const params = {
    page: filters.page ?? 0,
    size: PAGE_SIZE,
    sortBy: filters.sortBy || 'createdAt',
  };
  if (filters.keyword) params.keyword = filters.keyword;
  if (filters.category) params.category = filters.category;
  if (filters.condition) params.condition = filters.condition;
  if (filters.isDonation) params.isDonation = true;
  if (filters.isLending) params.isLending = true;
  if (filters.city) params.city = filters.city;
  if (filters.userLatitude != null) params.userLatitude = filters.userLatitude;
  if (filters.userLongitude != null) params.userLongitude = filters.userLongitude;
  if (filters.userLatitude != null && filters.userLongitude != null && filters.radiusKm) params.radiusKm = filters.radiusKm;
  return params;
}

// ── Read filter state from URL search params ───────────────────────────────
function readFiltersFromParams(searchParams) {
  return {
    keyword: searchParams.get('keyword') || '',
    category: searchParams.get('category') || '',
    condition: searchParams.get('condition') || '',
    isDonation: searchParams.get('isDonation') === 'true',
    isLending: searchParams.get('isLending') === 'true',
    city: searchParams.get('city') || '',
    userLatitude: searchParams.get('lat') ? Number(searchParams.get('lat')) : null,
    userLongitude: searchParams.get('lng') ? Number(searchParams.get('lng')) : null,
    radiusKm: searchParams.get('radius') ? Number(searchParams.get('radius')) : 50,
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 0,
    sortBy: searchParams.get('sortBy') || 'createdAt',
  };
}

// ── Write filter state to URL search params ────────────────────────────────
function writeFiltersToParams(filters, keepPage = false) {
  const p = new URLSearchParams();
  if (filters.keyword) p.set('keyword', filters.keyword);
  if (filters.category) p.set('category', filters.category);
  if (filters.condition) p.set('condition', filters.condition);
  if (filters.isDonation) p.set('isDonation', 'true');
  if (filters.isLending) p.set('isLending', 'true');
  if (filters.city) p.set('city', filters.city);
  if (filters.userLatitude != null) p.set('lat', String(filters.userLatitude));
  if (filters.userLongitude != null) p.set('lng', String(filters.userLongitude));
  if (filters.radiusKm !== 50) p.set('radius', String(filters.radiusKm));
  if (filters.sortBy && filters.sortBy !== 'createdAt') p.set('sortBy', filters.sortBy);
  if (keepPage && filters.page > 0) p.set('page', String(filters.page));
  return p;
}

// ── Skeleton card placeholder ──────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <div className="skeleton" style={{ height: 200 }} />
      <div className="p-4 flex flex-col gap-2">
        <div className="skeleton" style={{ height: 16, width: '40%' }} />
        <div className="skeleton" style={{ height: 20, width: '80%' }} />
        <div className="skeleton" style={{ height: 16, width: '55%' }} />
        <div className="skeleton mt-2" style={{ height: 38 }} />
      </div>
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  // Show at most 5 page buttons centred around current page
  const start = Math.max(0, Math.min(currentPage - 2, totalPages - 5));
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, i) => start + i
  );

  const btnBase = {
    minWidth: 36,
    height: 36,
    borderRadius: 8,
    fontSize: '0.875rem',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    border: '1px solid var(--border)',
  };

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <button
        disabled={currentPage === 0}
        onClick={() => onPageChange(currentPage - 1)}
        style={{
          ...btnBase,
          background: 'white',
          color: currentPage === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
          cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
        }}
      >
        <ChevronLeft size={16} style={{ margin: '0 auto' }} />
      </button>

      {start > 0 && (
        <>
          <button
            onClick={() => onPageChange(0)}
            style={{ ...btnBase, background: 'white', color: 'var(--text-primary)', padding: '0 10px' }}
          >
            1
          </button>
          {start > 1 && (
            <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>
          )}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          style={{
            ...btnBase,
            padding: '0 10px',
            background: p === currentPage ? 'var(--primary)' : 'white',
            color: p === currentPage ? 'white' : 'var(--text-primary)',
            borderColor: p === currentPage ? 'var(--primary)' : 'var(--border)',
          }}
        >
          {p + 1}
        </button>
      ))}

      {start + 5 < totalPages && (
        <>
          {start + 5 < totalPages - 1 && (
            <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>
          )}
          <button
            onClick={() => onPageChange(totalPages - 1)}
            style={{ ...btnBase, background: 'white', color: 'var(--text-primary)', padding: '0 10px' }}
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        disabled={currentPage >= totalPages - 1}
        onClick={() => onPageChange(currentPage + 1)}
        style={{
          ...btnBase,
          background: 'white',
          color: currentPage >= totalPages - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
          cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
        }}
      >
        <ChevronRight size={16} style={{ margin: '0 auto' }} />
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BookListPage
// ══════════════════════════════════════════════════════════════════════════════
export default function BookListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Derive filter state from URL params (single source of truth)
  const filters = useMemo(() => readFiltersFromParams(searchParams), [searchParams]);

  // ── Apply new filters (reset to page 0) ────────────────────────────────
  const handleFilterChange = (newFilters) => {
    setSearchParams(writeFiltersToParams({ ...newFilters, sortBy: filters.sortBy }));
    setSidebarOpen(false);
  };

  // ── Change page ────────────────────────────────────────────────────────
  const handlePageChange = (newPage) => {
    const p = writeFiltersToParams({ ...filters, page: newPage }, true);
    setSearchParams(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Change sort ────────────────────────────────────────────────────────
  const handleSortChange = (sortBy) => {
    const p = writeFiltersToParams({ ...filters, sortBy });
    setSearchParams(p);
  };

  // ── Fetch books ────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ['books', filters],
    queryFn: () => getBooks(buildApiParams(filters)),
    keepPreviousData: true,
    staleTime: 30_000,
  });

  const books = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  // Books with coords for map view
  const booksWithCoords = useMemo(
    () => books.filter((b) => Number.isFinite(b.latitude) && Number.isFinite(b.longitude)),
    [books]
  );
  const mapCenter = booksWithCoords.length > 0
    ? [booksWithCoords[0].latitude, booksWithCoords[0].longitude]
    : filters.userLatitude != null && filters.userLongitude != null
      ? [filters.userLatitude, filters.userLongitude]
    : [17.385, 78.4867]; // Default: Hyderabad

  // Filter fields only (not page/sort) for BookFilter prop
  const filterFields = {
    keyword: filters.keyword,
    category: filters.category,
    condition: filters.condition,
    isDonation: filters.isDonation,
    isLending: filters.isLending,
    city: filters.city,
    userLatitude: filters.userLatitude,
    userLongitude: filters.userLongitude,
    radiusKm: filters.radiusKm,
  };

  const activeFilterCount = [
    filters.keyword,
    filters.category,
    filters.condition,
    filters.isDonation,
    filters.isLending,
    filters.city,
    filters.userLatitude,
  ].filter(Boolean).length;

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>

      {/* ── Sticky search header bar ──────────────────────────────────────── */}
      <div
        className="sticky z-40 bg-white border-b"
        style={{
          top: 64, // below Navbar (64px)
          borderColor: 'var(--border)',
          padding: '14px max(24px, calc(50% - 680px))',
        }}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <h1
              className="font-['Sora'] font-bold flex-shrink-0"
              style={{ color: 'var(--text-primary)', fontSize: '1.375rem' }}
            >
              Books
            </h1>
            {!isLoading && (
              <span
                className="font-['DM_Sans'] font-medium px-2.5 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  fontSize: '0.8125rem',
                }}
              >
                {totalElements.toLocaleString()}
              </span>
            )}
            {filters.city && (
              <span
                className="hidden sm:block font-['DM_Sans'] truncate"
                style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}
              >
                near {filters.city}
              </span>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Sort dropdown */}
            <select
              value={filters.sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="font-['DM_Sans']"
              style={{
                height: 38,
                borderRadius: 8,
                border: '1px solid var(--border)',
                padding: '0 10px',
                fontSize: '0.875rem',
                background: 'white',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* View toggle: Grid / Map */}
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--border)' }}
            >
              {[
                { mode: 'grid', Icon: LayoutGrid, title: 'Grid view' },
                { mode: 'map', Icon: MapIcon, title: 'Map view' },
              ].map(({ mode, Icon, title }) => (
                <button
                  key={mode}
                  title={title}
                  onClick={() => setViewMode(mode)}
                  style={{
                    width: 38,
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: viewMode === mode ? 'var(--primary)' : 'white',
                    color: viewMode === mode ? 'white' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '28px max(24px, calc(50% - 680px))',
        }}
      >
        {/* Mobile filter toggle button */}
        <button
          className="lg:hidden flex items-center gap-2 mb-5 font-['DM_Sans'] font-semibold transition-all duration-200"
          style={{
            height: 42,
            padding: '0 16px',
            borderRadius: 10,
            border: '1.5px solid var(--border)',
            background: 'white',
            color: 'var(--text-primary)',
            fontSize: '0.9375rem',
            cursor: 'pointer',
          }}
          onClick={() => setSidebarOpen(true)}
        >
          <SlidersHorizontal size={16} />
          Filters
          {activeFilterCount > 0 && (
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white font-bold"
              style={{ background: 'var(--primary)', fontSize: '0.7rem' }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>

        <div className="flex gap-7 items-start">

          {/* ── Sidebar (desktop) ───────────────────────────────────────── */}
          <aside
            className="hidden lg:block flex-shrink-0"
            style={{ width: 280 }}
          >
            <div
              className="sticky"
              style={{
                top: 128, // navbar (64px) + header bar (~64px)
                background: 'white',
                borderRadius: 'var(--radius-card)',
                border: '1px solid var(--border)',
                padding: 20,
                maxHeight: 'calc(100vh - 160px)',
                overflowY: 'auto',
              }}
            >
              <BookFilter filters={filterFields} onFilterChange={handleFilterChange} />
            </div>
          </aside>

          {/* ── Content area ────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {isError ? (
              /* Error state */
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <span style={{ fontSize: '3rem' }}>⚠️</span>
                <p
                  className="font-['Sora'] font-semibold"
                  style={{ color: 'var(--text-primary)', fontSize: '1.25rem' }}
                >
                  Failed to load books
                </p>
                <p
                  className="font-['DM_Sans']"
                  style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}
                >
                  Check your connection and try again.
                </p>
              </div>
            ) : isLoading ? (
              /* Skeleton grid */
              <div
                className="grid gap-5"
                style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                }}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : viewMode === 'map' ? (
              /* ── Map view ─────────────────────────────────────────────── */
              <div
                style={{
                  height: 560,
                  borderRadius: 'var(--radius-card)',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  position: 'relative',
                }}
              >
                {booksWithCoords.length === 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 16,
                      left: 16,
                      zIndex: 500,
                      background: 'rgba(255,255,255,0.94)',
                      border: '1px solid var(--border)',
                      borderRadius: 14,
                      padding: '12px 14px',
                      boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
                      maxWidth: 320,
                    }}
                  >
                    <p style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', margin: '0 0 4px' }}>
                      No mapped books yet
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      These results do not have saved latitude and longitude yet. Update the book location when listing or editing a book to place it on the map.
                    </p>
                  </div>
                )}
                <MapContainer
                  center={mapCenter}
                  zoom={booksWithCoords.length > 0 ? 12 : 5}
                  style={{ width: '100%', height: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  {booksWithCoords.map((book) => (
                    <Marker key={book.id} position={[book.latitude, book.longitude]}>
                      <Popup>
                        <div style={{ width: 200 }}>
                          <p
                            style={{
                              fontFamily: "'Sora', sans-serif",
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              marginBottom: 4,
                              color: '#1A1D23',
                            }}
                          >
                            {book.title}
                          </p>
                          <p
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: '0.8125rem',
                              color: '#5C6370',
                              marginBottom: 8,
                            }}
                          >
                            by {book.author}
                          </p>
                          <button
                            onClick={() => navigate(`/books/${book.id}`)}
                            style={{
                              width: '100%',
                              height: 32,
                              borderRadius: 8,
                              background: '#00C9A7',
                              color: 'white',
                              border: 'none',
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            View Details
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            ) : books.length === 0 ? (
              /* ── Empty state ──────────────────────────────────────────── */
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <span style={{ fontSize: '4rem' }}>📭</span>
                <p
                  className="font-['Sora'] font-semibold"
                  style={{ color: 'var(--text-primary)', fontSize: '1.25rem' }}
                >
                  No books found
                </p>
                <p
                  className="font-['DM_Sans'] text-center max-w-sm"
                  style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: 1.6 }}
                >
                  Try changing your filters or search in a different city.
                </p>
                <button
                  className="font-['DM_Sans'] font-semibold transition-all duration-200"
                  style={{
                    height: 42,
                    padding: '0 24px',
                    borderRadius: 'var(--radius-btn)',
                    border: '1.5px solid var(--border)',
                    background: 'white',
                    color: 'var(--text-primary)',
                    fontSize: '0.9375rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleFilterChange({
                    keyword: '', category: '', condition: '',
                    isDonation: false, isLending: false, city: '',
                    userLatitude: null, userLongitude: null, radiusKm: 50,
                  })}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              /* ── Book grid ────────────────────────────────────────────── */
              <>
                <div
                  className="grid gap-5"
                  style={{
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  }}
                >
                  {books.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onRequestClick={() => navigate(`/books/${book.id}`)}
                    />
                  ))}
                </div>

                <Pagination
                  currentPage={filters.page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile sidebar overlay ─────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-[2000] flex flex-col bg-white">
          <div
            className="flex items-center justify-between px-5 border-b"
            style={{ height: 56, borderColor: 'var(--border)', flexShrink: 0 }}
          >
            <h2
              className="font-['Sora'] font-semibold"
              style={{ color: 'var(--text-primary)', fontSize: '1.125rem' }}
            >
              Filters
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
              }}
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <BookFilter filters={filterFields} onFilterChange={handleFilterChange} />
          </div>
        </div>
      )}
    </div>
  );
}
