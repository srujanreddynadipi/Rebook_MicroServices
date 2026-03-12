import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/';

  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ mode: 'onBlur' });

  // If already logged in, redirect to home
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-page)' }}
    >
      <div
        className="w-full shadow-lg rounded-2xl overflow-hidden"
        style={{ maxWidth: '28rem', background: '#fff' }}
      >
        {/* Header */}
        <div className="flex flex-col items-center pt-10 pb-6 px-8">
          <Link to="/" className="flex items-center gap-1 no-underline mb-6">
            <BookOpen size={28} className="text-primary-600" style={{ color: 'var(--primary)' }} />
            <span
              style={{
                fontFamily: "'Sora', sans-serif",
                fontWeight: 700,
                fontSize: '1.5rem',
                color: 'var(--primary)',
              }}
            >
              ReBook
            </span>
          </Link>
          <h1
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 700,
              fontSize: '1.5rem',
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Welcome back
          </h1>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.9375rem',
              color: 'var(--text-muted)',
              marginTop: 4,
            }}
          >
            Sign in to continue to ReBook
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-8 pb-10">
          {/* Email */}
          <div style={{ marginBottom: 20 }}>
            <label
              className="block"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: '0.8125rem',
                color: 'var(--text-primary)',
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full outline-none"
                style={{
                  height: 48,
                  paddingLeft: 42,
                  paddingRight: 14,
                  border: `1.5px solid ${errors.email ? 'var(--danger)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-input)',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.9375rem',
                  background: 'var(--bg-page)',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  if (!errors.email) {
                    e.target.style.borderColor = 'var(--primary)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(0,201,167,0.12)';
                  }
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none';
                }}
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email address',
                  },
                })}
              />
            </div>
            {errors.email && (
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.75rem',
                  color: 'var(--danger)',
                  marginTop: 4,
                }}
              >
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: 12 }}>
            <label
              className="block"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: '0.8125rem',
                color: 'var(--text-primary)',
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full outline-none"
                style={{
                  height: 48,
                  paddingLeft: 42,
                  paddingRight: 48,
                  border: `1.5px solid ${errors.password ? 'var(--danger)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-input)',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.9375rem',
                  background: 'var(--bg-page)',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  if (!errors.password) {
                    e.target.style.borderColor = 'var(--primary)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(0,201,167,0.12)';
                  }
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none';
                }}
                {...register('password', { required: 'Password is required' })}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-1"
                style={{ color: 'var(--text-muted)' }}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.75rem',
                  color: 'var(--danger)',
                  marginTop: 4,
                }}
              >
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Forgot password placeholder */}
          <div className="flex justify-end mb-6">
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                cursor: 'not-allowed',
                opacity: 0.6,
              }}
            >
              Forgot Password?
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 border-none cursor-pointer"
            style={{
              height: 52,
              borderRadius: 'var(--radius-btn)',
              background: loading ? 'var(--primary-dark)' : 'var(--primary)',
              color: '#fff',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: '1rem',
              transition: 'background 0.2s, transform 0.1s, box-shadow 0.2s',
              opacity: loading ? 0.85 : 1,
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'var(--primary-dark)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,201,167,0.4)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'var(--primary)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {loading && (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <p
            className="text-center mt-6"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.9375rem',
              color: 'var(--text-muted)',
            }}
          >
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              style={{
                color: 'var(--primary)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Register here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
