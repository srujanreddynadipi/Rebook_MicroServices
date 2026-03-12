import { Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

// Inline spinner — no external dependency needed here
function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
      <div
        className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: '#E8EAED', borderTopColor: 'var(--primary)' }}
      />
    </div>
  );
}

/**
 * Guards a route behind authentication (and optionally admin role).
 *
 * Usage in App.jsx:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/my-books" element={<MyBooksPage />} />
 *   </Route>
 *
 *   <Route element={<ProtectedRoute requireAdmin />}>
 *     <Route path="/admin/*" element={<AdminDashboard />} />
 *   </Route>
 */
export default function ProtectedRoute({ requireAdmin = false }) {
  const { user, isLoading, isAdmin } = useContext(AuthContext);

  if (isLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
}
