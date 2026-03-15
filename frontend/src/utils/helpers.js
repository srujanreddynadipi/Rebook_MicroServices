import { TOKEN_KEY } from "./constants";

/**
 * Decode a JWT payload without verification.
 */
export function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

/**
 * Returns true if the stored JWT token is still valid.
 */
export function isTokenValid() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;
  const payload = decodeToken(token);
  if (!payload) return false;
  return payload.exp * 1000 > Date.now();
}

/**
 * Format a date string like "11 Mar 2026".
 */
export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

/**
 * Capitalise the first letter of a string.
 */
export function capitalise(str = "") {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Build a query-string from a plain object, omitting null/undefined values.
 */
export function buildQueryString(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      qs.append(key, value);
    }
  });
  const str = qs.toString();
  return str ? `?${str}` : "";
}

export function formatTimeAgo(dateString) {
  const date = parseApiDate(dateString)
  if (!date) return ''
  const diff = Date.now() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  return formatDate(dateString)
}

export function parseApiDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  if (typeof value !== 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const trimmed = value.trim()
  if (!trimmed) return null

  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(trimmed)
  if (hasTimezone) {
    const zoned = new Date(trimmed)
    return Number.isNaN(zoned.getTime()) ? null : zoned
  }

  // Some services send timezone-less timestamps in UTC, others in local server time.
  // Try both interpretations and pick the one closest to current time to avoid fixed 5h offsets.
  const asLocal = new Date(trimmed)
  const asUtc = new Date(`${trimmed}Z`)
  const localOk = !Number.isNaN(asLocal.getTime())
  const utcOk = !Number.isNaN(asUtc.getTime())

  if (localOk && utcOk) {
    const now = Date.now()
    const localDiff = Math.abs(now - asLocal.getTime())
    const utcDiff = Math.abs(now - asUtc.getTime())
    return localDiff <= utcDiff ? asLocal : asUtc
  }

  if (localOk) return asLocal
  if (utcOk) return asUtc

  const fallback = new Date(trimmed)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

export function formatChatTime(value, locale = 'en-IN') {
  const date = parseApiDate(value)
  if (!date) return ''
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function getInitials(name) {
  if (!name) return '??'
  return name.trim().split(' ')
    .map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export function getStatusColor(status) {
  const map = {
    AVAILABLE: 'green',   APPROVED: 'green',   RETURNED: 'green',
    PENDING: 'yellow',    REQUESTED: 'yellow',
    BORROWED: 'blue',
    REJECTED: 'red',      CANCELLED: 'red',    NOT_RETURNED: 'red',
    COMPLETED: 'gray',
  }
  return map[status] ?? 'gray'
}

export function getRequestTypeBadgeColor(type) {
  return type === 'DONATION' ? 'teal' : 'purple'
}

export function truncateText(text, maxLength = 80) {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN').format(amount)
}
