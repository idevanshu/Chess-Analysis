import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Mail, Lock, User, ArrowRight, AlertCircle, Crown, Sparkles } from 'lucide-react';

export default function AuthPage({ mode = 'login', onSuccess }) {
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
      setTimeout(() => window.location.reload(), 500);
    } else {
      setError(result.error || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(212, 168, 67, 0.06) 0%, transparent 50%)',
        }} />

        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div className="relative z-10 text-center">
          <div className="relative inline-block">
            <div className="text-[180px] leading-none opacity-10 select-none" style={{ color: 'var(--accent)' }}>♞</div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-28 h-28 rounded-3xl flex items-center justify-center animate-float"
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(212, 168, 67, 0.1))',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 0 60px rgba(16, 185, 129, 0.15)',
                }}
              >
                <Crown className="w-14 h-14" style={{ color: 'var(--gold)' }} />
              </div>
            </div>
          </div>

          <h2 className="text-4xl font-black mt-8 tracking-tight" style={{
            fontFamily: "'Playfair Display', serif",
            background: 'linear-gradient(135deg, var(--text-primary), var(--text-secondary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Master Your Game
          </h2>
          <p className="text-sm mt-3 max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Play against legendary AI opponents, challenge friends online, and track your improvement with advanced analytics.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {['Stockfish 18', 'Real-time Multiplayer', 'Game Analysis', 'AI Commentary'].map((f, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'var(--text-muted)',
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="absolute top-[15%] right-[15%] w-80 h-80 rounded-full pointer-events-none" style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'orbFloat 15s ease-in-out infinite',
        }} />
        <div className="absolute bottom-[10%] left-[10%] w-60 h-60 rounded-full pointer-events-none" style={{
          background: 'radial-gradient(circle, rgba(212, 168, 67, 0.05) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'orbFloat 12s ease-in-out infinite reverse',
        }} />
      </div>

      <div className="flex-1 lg:max-w-[520px] flex items-center justify-center px-6 relative">
        <div className="absolute inset-0 lg:hidden" style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(16, 185, 129, 0.05) 0%, transparent 60%)',
        }} />

        <div className="w-full max-w-sm relative z-10 animate-slideUp">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl animate-glow"
                style={{
                  background: 'linear-gradient(135deg, var(--accent), #059669)',
                  boxShadow: '0 0 30px rgba(16, 185, 129, 0.25)',
                }}
              >
                ♞
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Chess<span style={{ color: 'var(--accent)' }}>Legends</span>
                </h1>
              </div>
            </div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--text-dim)' }}>
              Train. Compete. Dominate.
            </p>
          </div>

          <div
            className="p-8 rounded-2xl"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(16, 185, 129, 0.03)',
            }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--gold)' }} />
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {isSignup ? 'Create Account' : 'Welcome Back'}
              </h2>
            </div>

            {error && (
              <div
                className="mb-5 p-3.5 rounded-xl flex items-start gap-2.5"
                style={{
                  background: 'rgba(244, 63, 94, 0.06)',
                  border: '1px solid rgba(244, 63, 94, 0.15)',
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--danger)' }} />
                <p className="text-xs" style={{ color: '#fb7185' }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <div>
                  <label className="block text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Display Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-dim)' }} />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Your name"
                      className="input pl-11"
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-dim)' }} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@email.com"
                    className="input pl-11"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-dim)' }} />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 characters"
                    className="input pl-11"
                    required
                    minLength={6}
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg w-full mt-2 group"
                style={{ height: '48px' }}
              >
                {loading ? (
                  <div
                    className="w-5 h-5 border-2 rounded-full animate-spin"
                    style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}
                  />
                ) : (
                  <>
                    {isSignup ? 'Create Account' : 'Sign In'}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 text-center text-sm" style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => setIsSignup(!isSignup)}
                className="font-bold hover:underline transition-colors"
                style={{ color: 'var(--accent)' }}
              >
                {isSignup ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          </div>

          <p className="text-center mt-8 text-[11px] tracking-wide" style={{ color: 'var(--text-dim)' }}>
            Powered by Stockfish 18 & AI Commentary
          </p>
        </div>
      </div>
    </div>
  );
}
