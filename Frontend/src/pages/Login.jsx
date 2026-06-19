import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_ROUTES } from '../context/AuthContext';

// ── Inline SVG Icons ──────────────────────────────────────────
const MailIcon = () => (
  <svg className="field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const LockIcon = () => (
  <svg className="field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const BookOpenIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

// ─── Login Page ───────────────────────────────────────────────
const Login = () => {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [formError,   setFormError]   = useState('');   // inline, field-agnostic
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const userData = await login(email, password);

      // Route the user to their role-specific dashboard.
      // The user object comes from the backend LoginResponse — no JWT decoding needed.
      const destination = ROLE_ROUTES[userData.role] ?? '/login';
      navigate(destination, { replace: true });
    } catch (err) {
      // Contract: 401 → "Invalid credentials" without revealing which field.
      // Any other error → generic fallback (never expose internal messages).
      const status = err.response?.status;

      if (status === 401) {
        setFormError('Invalid email or password. Please try again.');
      } else if (status === 422) {
        setFormError('Please check your input and try again.');
      } else {
        setFormError('Something went wrong. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="screen">
      {/* Ambient glow spheres */}
      <div className="glow glow--indigo-tl" />
      <div className="glow glow--violet-br" />

      {/* Glassmorphism login card */}
      <div className="card" role="main">

        {/* Brand header */}
        <div className="brand">
          <div className="brand__icon">
            <BookOpenIcon />
          </div>
          <h1 className="brand__title">Scheduler</h1>
          <p className="brand__subtitle">
            Sign in to manage your college lectures and timetable
          </p>
        </div>

        {/* Inline form error — field-agnostic per contract */}
        {formError && (
          <div className="alert--error" role="alert" aria-live="assertive">
            {formError}
          </div>
        )}

        {/* Login form */}
        <form
          className="form"
          onSubmit={handleSubmit}
          noValidate
          style={{ marginTop: formError ? '1.5rem' : '0' }}
        >
          {/* Email */}
          <div className="field">
            <label className="field__label" htmlFor="login-email">
              Email Address
            </label>
            <div className="field__wrapper">
              <MailIcon />
              <input
                id="login-email"
                className="field__input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Password */}
          <div className="field">
            <label className="field__label" htmlFor="login-password">
              Password
            </label>
            <div className="field__wrapper">
              <LockIcon />
              <input
                id="login-password"
                className="field__input"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            className="btn btn--primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? <span className="spinner" /> : null}
            {isSubmitting ? 'Signing In…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
