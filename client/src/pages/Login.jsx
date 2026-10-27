import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { Mail, Lock, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen bg-page flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-md bg-brand flex items-center justify-center text-white font-light text-2xl select-none leading-none">
            /
          </div>
          <div className="font-display text-left leading-tight">
            <span className="block text-lg font-semibold tracking-wide text-ink">
              BookLeaf
            </span>
            <span className="block text-xs font-light text-muted uppercase tracking-wider">
              Publishing
            </span>
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-ink">Author portal login</h1>
        <p className="mt-1 text-sm text-muted">
          Sign in to track your royalties, books, and support inquiries.
        </p>
      </div>

      {/* Login Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface border border-line rounded-xl p-6 sm:p-8">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="author@email.com"
                  required
                  className="block w-full pl-9 pr-3 py-2.5 text-sm text-ink border border-line rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="block w-full pl-9 pr-3 py-2.5 text-sm text-ink border border-line rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex justify-center items-center py-2.5 px-6 rounded-full text-sm font-medium text-white bg-brand hover:bg-brand-dark transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand disabled:opacity-50"
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
            <p className="text-xs text-muted mb-3 text-center">
              Quick test accounts
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials('priya.sharma@email.com', 'author123')}
                className="p-2.5 bg-surface hover:bg-blush/40 text-ink rounded-lg border border-line hover:border-brand transition-colors text-left"
              >
                <div className="font-semibold text-ink">Author</div>
                <div className="text-muted truncate">Priya Sharma</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('admin@bookleaf.com', 'admin123')}
                className="p-2.5 bg-surface hover:bg-blush/40 text-ink rounded-lg border border-line hover:border-brand transition-colors text-left"
              >
                <div className="font-semibold text-ink">Admin</div>
                <div className="text-muted truncate">admin@bookleaf.com</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
