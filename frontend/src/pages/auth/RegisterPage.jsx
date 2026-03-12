import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, User, MapPin, Phone, BookOpen, Crosshair } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import useGeolocation from '../../hooks/useGeolocation';

function getPasswordStrength(pw) {
  if (!pw) return { level: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Weak', color: '#FF4D4F' };
  if (score <= 3) return { level: 2, label: 'Medium', color: '#FFB830' };
  return { level: 3, label: 'Strong', color: '#52C41A' };
}

export default function RegisterPage() {
  const { register: authRegister, user } = useAuth();
  const navigate = useNavigate();
  const { coords, loading: geoLoading, getLocation } = useGeolocation();

  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ mode: 'onBlur' });

  const passwordValue = watch('password', '');
  const strength = getPasswordStrength(passwordValue);

  // If already logged in, redirect
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  // When geolocation resolves, store lat/lng in form
  useEffect(() => {
    if (coords) {
      setValue('latitude', coords.lat);
      setValue('longitude', coords.lng);
      toast.success('Location captured!');
    }
  }, [coords, setValue]);

  const onSubmit = async (data) => {
    const { confirmPassword, ...payload } = data;
    setLoading(true);
    try {
      await authRegister(payload);
      toast.success('Welcome to ReBook!');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = {
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    fontSize: '0.8125rem',
    color: 'var(--text-primary)',
    marginBottom: 6,
    display: 'block',
  };

  const inputStyle = (hasError) => ({
    height: 48,
    width: '100%',
    paddingLeft: 42,
    paddingRight: 14,
    border: `1.5px solid ${hasError ? 'var(--danger)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-input)',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.9375rem',
    background: 'var(--bg-page)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  });

  const focusH = (hasError) => (e) => {
    if (!hasError) {
      e.target.style.borderColor = 'var(--primary)';
      e.target.style.boxShadow = '0 0 0 3px rgba(0,201,167,0.12)';
    }
  };
  const blurH = (e) => {
    e.target.style.boxShadow = 'none';
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
        <div className="flex flex-col items-center pt-10 pb-4 px-8">
          <Link to="/" className="flex items-center gap-1 no-underline mb-6">
            <BookOpen size={28} style={{ color: 'var(--primary)' }} />
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
            Create your account
          </h1>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.9375rem',
              color: 'var(--text-muted)',
              marginTop: 4,
            }}
          >
            Start exchanging books in your city
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-8 pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            {/* Name */}
            <div className="sm:col-span-2" style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Name *</label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="text"
                  placeholder="Your full name"
                  style={inputStyle(errors.name)}
                  onFocus={focusH(errors.name)}
                  onBlur={blurH}
                  {...register('name', { required: 'Name is required' })}
                />
              </div>
              {errors.name && (
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: 'var(--danger)', marginTop: 4 }}>
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="sm:col-span-2" style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Email *</label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="email"
                  placeholder="you@example.com"
                  style={inputStyle(errors.email)}
                  onFocus={focusH(errors.email)}
                  onBlur={blurH}
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
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: 'var(--danger)', marginTop: 4 }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Password *</label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  style={{ ...inputStyle(errors.password), paddingRight: 48 }}
                  onFocus={focusH(errors.password)}
                  onBlur={blurH}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Must be at least 8 characters' },
                  })}
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
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: 'var(--danger)', marginTop: 4 }}>
                  {errors.password.message}
                </p>
              )}
              {/* Strength bar */}
              {passwordValue && (
                <div className="mt-2">
                  <div
                    style={{
                      height: 4,
                      borderRadius: 2,
                      background: 'var(--border)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(strength.level / 3) * 100}%`,
                        height: '100%',
                        background: strength.color,
                        transition: 'width 0.3s, background 0.3s',
                        borderRadius: 2,
                      }}
                    />
                  </div>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.6875rem',
                      color: strength.color,
                      marginTop: 2,
                      fontWeight: 600,
                    }}
                  >
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Confirm Password *</label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  style={inputStyle(errors.confirmPassword)}
                  onFocus={focusH(errors.confirmPassword)}
                  onBlur={blurH}
                  {...register('confirmPassword', {
                    required: 'Confirm your password',
                    validate: (val) => val === passwordValue || 'Passwords do not match',
                  })}
                />
              </div>
              {errors.confirmPassword && (
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: 'var(--danger)', marginTop: 4 }}>
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Mobile */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>
                Mobile{' '}
                <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
              </label>
              <div className="relative">
                <Phone
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  style={inputStyle(false)}
                  onFocus={focusH(false)}
                  onBlur={blurH}
                  {...register('mobileNumber')}
                />
              </div>
            </div>

            {/* City */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>
                City{' '}
                <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
              </label>
              <div className="relative">
                <MapPin
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="text"
                  placeholder="Hyderabad"
                  style={inputStyle(false)}
                  onFocus={focusH(false)}
                  onBlur={blurH}
                  {...register('city')}
                />
              </div>
            </div>
          </div>

          {/* Use My Location */}
          <button
            type="button"
            onClick={getLocation}
            disabled={geoLoading}
            className="flex items-center gap-2 mb-6 border-none cursor-pointer"
            style={{
              height: 38,
              paddingLeft: 14,
              paddingRight: 14,
              borderRadius: 8,
              background: coords ? 'rgba(82,196,26,0.1)' : 'var(--bg-page)',
              border: '1px solid var(--border)',
              color: coords ? '#389E0D' : 'var(--text-secondary)',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: '0.8125rem',
              transition: 'all 0.2s',
            }}
          >
            <Crosshair size={15} />
            {geoLoading ? 'Detecting…' : coords ? 'Location captured ✓' : 'Use My Location'}
          </button>

          {/* Hidden lat/lng fields */}
          <input type="hidden" {...register('latitude')} />
          <input type="hidden" {...register('longitude')} />

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
            {loading ? 'Creating account…' : 'Create Account'}
          </button>

          <p
            className="text-center mt-6"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.9375rem',
              color: 'var(--text-muted)',
            }}
          >
            Already have an account?{' '}
            <Link
              to="/login"
              style={{
                color: 'var(--primary)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
