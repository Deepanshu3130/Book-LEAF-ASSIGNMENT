import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { Mail, Lock, ArrowRight, Sparkles, BookOpen } from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      toast.success(`Welcome back, ${user.name}!`);

      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/books');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-blush flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Accessible Skip Link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-coral focus:text-white focus:rounded-full focus:shadow-md focus:text-xs focus:font-semibold focus:outline-hidden"
      >
        Skip to main content
      </a>

      {/* 1. Decorative blob — Top-Right */}
      <svg
        viewBox="-100 -100 200 200"
        aria-hidden="true"
        className="absolute -right-20 -top-24 w-72 sm:w-96 opacity-90 pointer-events-none"
      >
        <path
          fill="var(--color-blush-deep)"
          d="M44.7,-58.3C57.6,-49.4,67.4,-35.1,71.6,-19.3C75.8,-3.5,74.4,13.8,67.1,27.7C59.8,41.6,46.6,52,32.2,59.5C17.8,67,2.2,71.6,-14.4,70.2C-31,68.8,-48.6,61.4,-58.9,48.3C-69.2,35.2,-72.2,16.4,-70.4,-1C-68.6,-18.4,-62,-34.4,-50.8,-43.7C-39.6,-52.9,-23.8,-55.4,-8.7,-57.3C-6.4,-59.2,31.8,-67.2,44.7,-58.3Z"
        />
        <path fill="none" stroke="#fff" strokeWidth="1.2" d="M-85 30 C-40 -70, 30 70, 85 -25" />
        <path fill="none" stroke="#fff" strokeWidth="1.2" d="M-80 50 C-30 -50, 40 80, 90 -5" />
      </svg>

      {/* 2. Decorative blob — Bottom-Left (Diagonal balance in soft coral & blush) */}
      <svg
        viewBox="-100 -100 200 200"
        aria-hidden="true"
        className="absolute -left-20 -bottom-24 w-72 sm:w-96 opacity-75 pointer-events-none rotate-180"
      >
        <path
          fill="var(--color-blush-deep)"
          d="M44.7,-58.3C57.6,-49.4,67.4,-35.1,71.6,-19.3C75.8,-3.5,74.4,13.8,67.1,27.7C59.8,41.6,46.6,52,32.2,59.5C17.8,67,2.2,71.6,-14.4,70.2C-31,68.8,-48.6,61.4,-58.9,48.3C-69.2,35.2,-72.2,16.4,-70.4,-1C-68.6,-18.4,-62,-34.4,-50.8,-43.7C-39.6,-52.9,-23.8,-55.4,-8.7,-57.3C-6.4,-59.2,31.8,-67.2,44.7,-58.3Z"
        />
        <path fill="none" stroke="#fff" strokeWidth="1.2" d="M-85 30 C-40 -70, 30 70, 85 -25" />
        <path fill="none" stroke="#fff" strokeWidth="1.2" d="M-80 50 C-30 -50, 40 80, 90 -5" />
      </svg>

      {/* Login Card Container */}
      <main id="main" className="relative z-10 w-full max-w-md animate-fade-in-up flex flex-col items-center">
        {/* BookLeaf Logo - positioned cleanly above the card */}
        <div className="flex items-center justify-center space-x-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-coral flex items-center justify-center text-white font-light text-2xl select-none shadow-md shadow-coral/25">
            <span className="inline-block transform -translate-y-0.5">/</span>
          </div>
          <div className="font-display text-left leading-tight">
            <span className="block text-xl font-bold text-ink tracking-tight">
              BookLeaf
            </span>
            <span className="block text-xs font-medium text-muted tracking-wide">
              Publishing
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-line shadow-lg shadow-coral/5 w-full">
          <h1 className="text-xl font-bold text-ink text-center mb-1">Sign in</h1>
          <p className="text-sm text-muted text-center mb-6">
            Track your royalties, books, and support inquiries.
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-ink mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="author@email.com"
                  required
                  className="input pl-9"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-ink mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input pl-9"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick test credentials */}
          <div className="mt-6 pt-6 border-t border-line">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted font-medium">Quick test accounts</span>
              <span className="text-[10px] text-coral-deep bg-blush px-2 py-0.5 rounded-full font-semibold">
                Click to fill
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials('priya.sharma@email.com', 'author123')}
                className="p-2.5 bg-white hover:bg-blush-soft text-ink rounded-xl border border-line hover:border-coral/40 transition-colors text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-coral cursor-pointer group"
              >
                <div className="font-semibold text-ink group-hover:text-coral-deep transition-colors">Author</div>
                <div className="text-muted truncate">Priya Sharma</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('admin@bookleaf.com', 'admin123')}
                className="p-2.5 bg-white hover:bg-blush-soft text-ink rounded-xl border border-line hover:border-coral/40 transition-colors text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-coral cursor-pointer group"
              >
                <div className="font-semibold text-ink group-hover:text-coral-deep transition-colors">Admin</div>
                <div className="text-muted truncate">admin@bookleaf.com</div>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Creative Footer Credit Tagline */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-xs text-muted font-medium flex items-center justify-center gap-1.5">
            <span>Made for BookLeaf team by</span>
            <span className="font-semibold text-coral-deep">Deepanshu</span>
            <Sparkles className="w-3.5 h-3.5 text-coral inline-block" />
          </p>
          <p className="text-[11px] text-muted/70">
            Publishing Portal · Author &amp; Editorial Workspace
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
