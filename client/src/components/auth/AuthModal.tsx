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
      <div className="relative z-10 w-full max-w-sm card p-6 overflow-hidden animate-slide-up flex flex-col gap-5">
        {/* Header with close button */}
        <div className="flex items-center justify-between border-b border-border pb-3.5">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-mono-caps text-text-tertiary">
            <span className="w-1.5 h-1.5 rounded-full bg-status-green inline-block" />
            <span>{tab === 'login' ? 'Sign In' : 'Create Account'}</span>
          </div>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-white p-1 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Pill Tabs */}
        <div className="flex bg-surface-raised rounded-full p-0.5 border border-border text-xs font-mono">
          <button
            onClick={() => { setTab('login'); setError(null); }}
            className={`flex-1 py-1 rounded-full transition-colors ${
              tab === 'login'
                ? 'bg-white text-black font-medium'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('register'); setError(null); }}
            className={`flex-1 py-1 rounded-full transition-colors ${
              tab === 'register'
                ? 'bg-white text-black font-medium'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-status-red/10 border border-status-red/30 rounded-tile text-status-red text-xs font-mono">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-text-tertiary mb-1">
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="CinemaBuff"
                className="w-full bg-surface-raised border border-border focus:border-border-strong rounded-full px-4 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-text-tertiary mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-surface-raised border border-border focus:border-border-strong rounded-full px-4 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-text-tertiary mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-surface-raised border border-border focus:border-border-strong rounded-full px-4 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 mt-2"
          >
            {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Google OAuth (Optional fallback token paste) */}
        <div className="pt-3 border-t border-border flex flex-col gap-2">
          <form onSubmit={handleGoogleSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Google ID Token (Optional)"
              value={googleToken}
              onChange={(e) => setGoogleToken(e.target.value)}
              className="flex-1 bg-surface-raised border border-border rounded-full px-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !googleToken.trim()}
              className="btn-secondary text-xs px-3 py-1.5 shrink-0"
            >
              Google
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
