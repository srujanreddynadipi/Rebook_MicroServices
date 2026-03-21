# Frontend Documentation

## Tech Stack

- React (Vite-based SPA)
- React Router v6
- TanStack Query
- Axios
- Tailwind CSS + custom CSS variables
- Headless UI (modal/dialog patterns)
- Lucide React icons

## Routing

Routes are defined in `frontend/src/App.jsx` and loaded with lazy imports.

| Route | Component | Auth Required | Description |
|---|---|---|---|
| `/` | `HomePage` | No | Landing page with featured/popular discovery paths |
| `/login` | `LoginPage` | No | Sign-in form |
| `/register` | `RegisterPage` | No | New account creation |
| `/books` | `BookListPage` | No | Search/filter/paginated catalog listing |
| `/books/add` | `AddBookPage` | No (route-level) | Add/list book form (typically used by logged in users) |
| `/books/:id` | `BookDetailPage` | No | Book details, owner info, request CTA, optional AI widgets |
| `/books/audiobook` | `AudiobookPage` | Yes | Upload study material and generate audiobook |
| `/books/edit/:id` | `EditBookPage` | Yes | Update existing book metadata/images |
| `/my-books` | `MyBooksPage` | Yes | Manage user-listed books |
| `/requests/sent` | `MyRequestsPage` | Yes | Sent requests and statuses |
| `/requests/received` | `IncomingRequestsPage` | Yes | Owner-side request inbox (approve/reject/return update) |
| `/profile` | `ProfilePage` | Yes | Own profile editing and geo location |
| `/users/:userId` | `ProfilePage` | Yes | Public/user profile view |
| `/notifications` | `NotificationsPage` | Yes | Notification feed + unread state actions |
| `/chat` | `ChatPage` | Yes | Inbox shell and nested outlet |
| `/chat/:requestId` | `ChatWindowPage` | Yes | Request-scoped messaging UI |
| `/rag` | `RagPage` | Yes | RAG document management + contextual chat |
| `/admin` | `AdminDashboardPage` | Admin | Admin overview |
| `/admin/users` | `AdminUsersPage` | Admin | User moderation panel |
| `*` | `NotFoundPage` | No | Fallback 404 route |

## State Management

### AuthContext

`frontend/src/context/AuthContext.jsx` exposes:

- `user`
- `isLoading`
- `isAdmin`
- `login(data)`
- `register(data)`
- `logout()`
- `refreshUser(userId)`

Behavior:

1. On app boot, context restores token+user from localStorage.
2. `login` delegates to auth API and persists tokens.
3. `register` supports auto-login when token pair is returned.
4. `logout` clears local storage and redirects to `/login`.
5. `refreshUser` fetches profile and updates local cache.

### TanStack Query patterns

Observed query keys include:

- `['unreadCount']`
- `['notifications', page]`
- `['myBooks', page]`
- `['book', bookId]`
- `['messages', requestId]`
- `['inbox']`
- `['sentRequests', ...]`
- `['receivedRequests', ...]`
- `['profile', viewedUserId]`
- `['rag-documents']`

Mutation success paths typically invalidate affected queries (`invalidateQueries`) to keep UI synchronized.

## API Layer

### axios instance

`frontend/src/api/axiosInstance.js`:

- Resolves `baseURL` from `VITE_API_BASE_URL` with deployed-host safety fallback.
- Request interceptor adds:
  - `Authorization: Bearer <accessToken>`
  - `X-User-Id` from stored user object.
- Response interceptor handles `401` with queued refresh flow:
  1. calls `/api/auth/refresh-token`
  2. updates tokens in localStorage
  3. replays queued failed requests
  4. redirects to `/login` when refresh fails.

### API modules

| File | Scope | Methods |
|---|---|---|
| `authApi.js` | auth | `register`, `login`, `refreshToken`, `logout` |
| `userApi.js` | user/admin users | `getProfile`, `getMyProfile`, `getUserById`, `updateProfile`, `getAllUsers`, `banUser`, `unbanUser`, `deleteUser` |
| `bookApi.js` | books | `getBooks`, `getBookById`, `getMyBooks`, `createBook`, `updateBook`, `deleteBook`, `getPopularBooks`, `getRecommendations`, `convertDocumentToAudiobook` |
| `requestApi.js` | requests/reviews | `createRequest`, `getSentRequests`, `getReceivedRequests`, `approveRequest`, `rejectRequest`, `cancelRequest`, `updateReturnStatus`, `createReview` |
| `chatApi.js` | chat | `sendMessage`, `getMessages`, `getInbox`, `markAsRead` |
| `notificationApi.js` | notifications | `getNotifications`, `getUnreadCount`, `markAsRead`, `markAllAsRead` |
| `ragApi.js` | rag | `uploadRagDocument`, `listRagDocuments`, `deleteRagDocument`, `sendRagMessage` |
| `aiApi.js` | optional AI Q&A | `askAboutBook`, `getBookAiStatus` |
| `adminApi.js` | admin extensions | `getAllUsers`, `updateUserRole`, `deleteUser`, `getAdminStats` |

### axios client variants

- `axiosInstance.js` is the primary authenticated client with token interceptors and refresh queue handling.
- `axiosClient.js` is used by `adminApi.js`; behavior should be kept aligned with `axiosInstance` to avoid auth drift between modules.

## Environment Variables (Frontend)

| Variable | Purpose | Default Behavior |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL for API calls | Falls back to `/` and same-origin proxy behavior |
| `VITE_ENABLE_AI` | Enables `aiApi.js` endpoints | When `false`, AI calls return graceful placeholder responses |

Resolution behavior:

1. If `VITE_API_BASE_URL` is empty, frontend uses relative `/`.
2. If deployed host is non-local but env URL points to localhost, client falls back to `/` to avoid invalid remote-localhost calls.

## WebSocket Model

Real-time chat is implemented with a REST + WebSocket hybrid:

1. `ChatPage` renders inbox and route shell.
2. `ChatWindowPage` subscribes to request-scoped topic when connected.
3. Outbound messages are sent through REST and/or WebSocket context send function.
4. Incoming messages update query cache (`['messages', requestId]`) and invalidate inbox/unread counters.
5. Notification count updates are coordinated with query invalidation and browser events.

## Query and Mutation Strategy

Common strategy used across pages:

1. Query lists with paged keys (`['notifications', page]`, `['myBooks', page]`).
2. Run mutation for create/update/delete action.
3. Invalidate affected keys (`invalidateQueries`) on success.
4. Show optimistic UX feedback via toast notifications.

Examples:

- Creating a request invalidates request lists and related book detail cache.
- Sending chat marks unread state and refreshes inbox summary.
- Marking notifications read invalidates both notification page and unread count query.

## Route Protection and Backend Enforcement

Route-level access and backend authorization are both relevant:

- Frontend uses `ProtectedRoute` for UI-level route guard.
- Backend still enforces authorization from JWT and ownership checks.
- Some routes marked public in frontend (for example `/books/add`) can still fail server-side without valid token, which is expected defense-in-depth behavior.

## UI/UX Behavior Notes

- Auth pages intentionally hide navbar/footer.
- Chat and notifications paths suppress footer to prioritize content height.
- Global lazy loading fallback uses spinner while route chunks load.
- Search in navbar navigates to `/books` with encoded `keyword` query string.

## Integration Caveats

1. `adminApi.js` contains endpoints that are not currently implemented server-side and should be treated as extension placeholders.
2. Notification controller accepts both `X-User-Id` and legacy `userId`; frontend standardizes on `X-User-Id` through interceptor.
3. AI endpoints in `aiApi.js` are optional and controlled by feature flag.

## Protected Routes

`frontend/src/components/layout/ProtectedRoute.jsx` logic:

1. If auth loading is active, render spinner.
2. If no `user`, redirect to `/login`.
3. If `requireAdmin=true` and not admin, redirect to `/`.
4. Otherwise render nested route via `<Outlet/>`.

Admin route wrappers in `App.jsx` enforce `requireAdmin` for `/admin` and `/admin/users`.

## Key Components

| Component | Location | Props | Purpose |
|---|---|---|---|
| `ProtectedRoute` | `components/layout/ProtectedRoute.jsx` | `requireAdmin` | Gate route access by auth/role |
| `Navbar` | `components/layout/Navbar.jsx` | none | Primary nav, search, unread badge, profile controls |
| `CreateRequestModal` | `components/request/CreateRequestModal.jsx` | `bookId`, `isDonation`, `isLending`, `onClose`, `onSuccess` | Request creation UX for donation/lending |
| `RequestCard` | `components/request/RequestCard.jsx` | request data props | Request display card |
| `BookGrid` | `components/book/BookGrid.jsx` | list + handlers | Reusable book listing layout |
| `BookFilter` | `components/book/BookFilter.jsx` | filter state/handlers | Search and filter controls |
| `BookCard` | `components/book/BookCard.jsx` | book item data | Single book preview card |
| `InboxList` | `components/chat/InboxList.jsx` | conversation props | Chat inbox list UI |
| `MessageBubble` | `components/chat/MessageBubble.jsx` | message object | Chat message rendering |
| `Modal` | `components/common/Modal.jsx` | modal control props | Generic modal shell |
| `Pagination` | `components/common/Pagination.jsx` | page state props | Page navigation control |
| `Spinner` | `components/common/Spinner.jsx` | optional text | Loading indicator |

## Page Responsibilities

- `HomePage`: discovery and navigation entry.
- `BookListPage`: central browse/search with query param-driven filters.
- `BookDetailPage`: detailed book view and request initiation path.
- `AddBookPage` / `EditBookPage`: multipart form workflows for books.
- `MyBooksPage`: owner inventory management with delete actions.
- `MyRequestsPage`: sender-side status tracking and cancellation.
- `IncomingRequestsPage`: owner-side approval/rejection and return updates.
- `ChatPage` + `ChatWindowPage`: conversation selection, message stream, read receipts.
- `NotificationsPage`: per-user notification feed and read-state handling.
- `ProfilePage`: user profile details, edits, map/geolocation interaction.
- `RagPage`: document ingest/index/delete and contextual AI chat loop.
- `AdminDashboardPage`, `AdminUsersPage`: admin controls and user moderation.

## Frontend Auth + Header Propagation

1. User logs in and token is stored.
2. Axios attaches bearer token + `X-User-Id`.
3. Gateway validates token and sets trusted identity headers.
4. Backend services use `X-User-Id` for ownership logic and data scoping.

## Notes

- `adminApi.js` contains endpoints (`/api/admin/users/{id}/role`, `/api/admin/stats`) that are not present in the current auth-service controllers and should be treated as planned/optional extensions.
- `aiApi.js` is feature-flagged by `VITE_ENABLE_AI` and gracefully returns fallback responses when disabled.
