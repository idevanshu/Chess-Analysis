import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Mail, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

export default function AuthPage({ mode = 'login', onSuccess }) {
  console.log('AuthPage rendering...');
  const [isSignup, setIsSignup] = useState(mode === 'signup');
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let result;
    if (isSignup) {
      if (formData.name.trim() === '') {
        setError('Name is required');
        setLoading(false);
        return;
      }
      result = await signup(formData.email, formData.password, formData.name);
    } else {
      result = await login(formData.email, formData.password);
    }

    setLoading(false);
    if (result.success) {
      onSuccess?.();
      // Refresh page to load user data
      setTimeout(() => window.location.reload(), 500);
    } else {
      setError(result.error || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Form Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center font-bold text-lg">
              ♞
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Chess Legends
            </h1>
          </div>
          <p className="text-white/40 text-sm">Master chess with AI coaches</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">
            {isSignup ? 'Create Account' : 'Welcome Back'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-white/30" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:border-cyan-400 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-white/30" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:border-cyan-400 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-white/30" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:border-cyan-400 focus:outline-none transition-colors"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
            >
              {loading ? 'Loading...' : isSignup ? 'Create Account' : 'Sign In'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Toggle Auth Mode */}
          <div className="mt-6 text-center text-sm text-white/60">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
            >
              {isSignup ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/30 mt-6">
          Play chess with world champions, get AI analysis, improve your game
        </p>
      </div>
    </div>
  );
}
