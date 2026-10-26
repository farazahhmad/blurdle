import { useState } from 'react';
import { registerUser, loginUser, googleLogin } from '../../api/client';
import type { UserProfile } from '../../types';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [googleToken, setGoogleToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'register') {
        const res = await registerUser(email, password, displayName);
        onSuccess(res.user);
        onClose();
      } else {
        const res = await loginUser(email, password);
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleToken.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const res = await googleLogin(googleToken.trim());
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Account Authentication"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative z-10 w-full max-w-sm bg-cinema-darker border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header with close button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-bold uppercase tracking-wider text-cinema-light">
            {tab === 'login' ? 'Sign In to Blurdle' : 'Create an Account'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-cinema-light/40 hover:text-cinema-light hover:bg-cinema-gray/60 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 bg-cinema-dark/50">
          <button
            onClick={() => { setTab('login'); setError(null); }}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              tab === 'login'
                ? 'border-b-2 border-cinema-accent text-cinema-accent'
                : 'text-cinema-light/40 hover:text-cinema-light'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('register'); setError(null); }}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              tab === 'register'
                ? 'border-b-2 border-cinema-accent text-cinema-accent'
                : 'text-cinema-light/40 hover:text-cinema-light'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-cinema-red/20 border border-cinema-red/30 text-cinema-light text-xs rounded-lg p-3">
              {error}
            </div>
          )}

          {tab === 'register' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-cinema-light/70 uppercase tracking-wide">
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="CinemaLover"
                className="w-full bg-cinema-gray/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-cinema-light focus:outline-none focus:border-cinema-accent/70 transition-colors"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-cinema-light/70 uppercase tracking-wide">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-cinema-gray/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-cinema-light focus:outline-none focus:border-cinema-accent/70 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-cinema-light/70 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-cinema-gray/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-cinema-light focus:outline-none focus:border-cinema-accent/70 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 bg-cinema-accent hover:bg-cinema-accent-dark text-cinema-darker font-bold rounded-xl text-sm transition-all shadow-lg shadow-cinema-accent/20 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Optional Google ID token section */}
        <div className="px-6 pb-6 pt-2 border-t border-white/5 flex flex-col gap-2">
          <p className="text-[11px] text-cinema-light/40 text-center uppercase tracking-wider">
            Optional: Google Sign-In
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Google ID token"
              value={googleToken}
              onChange={(e) => setGoogleToken(e.target.value)}
              className="flex-1 bg-cinema-gray/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-cinema-light placeholder:text-cinema-light/30 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleGoogleSubmit}
              disabled={loading || !googleToken.trim()}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-cinema-light text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
            >
              Verify
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
