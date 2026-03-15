import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/layout/ProtectedRoute';

// ── Spinner fallback ─────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <span className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }} />
    </div>
  );
}

// ── Lazy pages ───────────────────────────────────────────────────────────────
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const BookListPage = lazy(() => import('./pages/books/BookListPage'));
const BookDetailPage = lazy(() => import('./pages/books/BookDetailPage'));
const AddBookPage = lazy(() => import('./pages/books/AddBookPage'));
const EditBookPage = lazy(() => import('./pages/books/EditBookPage'));
const MyBooksPage = lazy(() => import('./pages/books/MyBooksPage'));
const MyRequestsPage = lazy(() => import('./pages/requests/MyRequestsPage'));
const IncomingRequestsPage = lazy(() => import('./pages/requests/IncomingRequestsPage'));
const ChatPage = lazy(() => import('./pages/chat/ChatPage'));
const ChatWindowPage = lazy(() => import('./pages/chat/ChatWindowPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Auth pages render without Navbar/Footer
const AUTH_PATHS = ['/login', '/register'];

function App() {
  const { pathname } = useLocation();
  const isAuthPage = AUTH_PATHS.includes(pathname);

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-page)' }}>
      {!isAuthPage && <Navbar />}

      <main className="flex-1">
        <Suspense fallback={<Spinner />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/books" element={<BookListPage />} />
            <Route path="/books/add" element={<AddBookPage />} />
            <Route path="/books/:id" element={<BookDetailPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/books/edit/:id" element={<EditBookPage />} />
              <Route path="/my-books" element={<MyBooksPage />} />
              <Route path="/requests/sent" element={<MyRequestsPage />} />
              <Route path="/requests/received" element={<IncomingRequestsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/users/:userId" element={<ProfilePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />

              {/* Chat: nested route so ChatPage can use <Outlet /> */}
              <Route path="/chat" element={<ChatPage />}>
                <Route path=":requestId" element={<ChatWindowPage />} />
              </Route>
            </Route>

            {/* Admin routes */}
            <Route element={<ProtectedRoute requireAdmin />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      {!isAuthPage && <Footer />}
    </div>
  );
}

export default App;

