export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
export const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:8084/ws";

export const TOKEN_KEY = "rebook_token";
export const USER_KEY = "rebook_user";

export const BOOK_CONDITIONS = ['NEW', 'USED_GOOD', 'USED_OLD']

export const BOOK_GENRES = [
  "FICTION",
  "NON_FICTION",
  "SCIENCE",
  "HISTORY",
  "BIOGRAPHY",
  "TECHNOLOGY",
  "ROMANCE",
  "MYSTERY",
  "FANTASY",
  "CHILDREN",
  "OTHER",
];

export const REQUEST_STATUS = [
  'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'RETURNED', 'NOT_RETURNED'
]

export const ROLES = {
  USER: "ROLE_USER",
  ADMIN: "ROLE_ADMIN",
};

export const BOOK_CATEGORIES = [
  'ENGINEERING', 'MEDICAL', 'NOVELS', 'SCHOOL',
  'COMPETITIVE_EXAMS', 'SELF_HELP', 'STORY_BOOKS',
  'HISTORY', 'LANGUAGE', 'OTHER'
]

export const REQUEST_TYPES = ['DONATION', 'LENDING']

export const CATEGORY_LABELS = {
  ENGINEERING: 'Engineering',       MEDICAL: 'Medical',
  NOVELS: 'Novels',                 SCHOOL: 'School',
  COMPETITIVE_EXAMS: 'Competitive', SELF_HELP: 'Self Help',
  STORY_BOOKS: 'Story Books',       HISTORY: 'History',
  LANGUAGE: 'Language',             OTHER: 'Other',
}

export const CONDITION_LABELS = {
  NEW: 'New', USED_GOOD: 'Used — Good', USED_OLD: 'Used — Old'
}

export const CATEGORY_ICONS = {
  ENGINEERING: '⚙️', MEDICAL: '🏥', NOVELS: '📖',
  SCHOOL: '🏫', COMPETITIVE_EXAMS: '🎯', SELF_HELP: '💡',
  STORY_BOOKS: '📚', HISTORY: '🏛️', LANGUAGE: '🌐', OTHER: '📦',
}

export const RADIUS_OPTIONS = [
  { label: '5 km',  value: 5  },
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
  { label: '50 km', value: 50 },
]

export const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }
