import React, { useState } from 'react';
import { Film, Shield, User as UserIcon, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const LoginModal: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setIsLoading(true);
    setError(null);

    const success = await login(username.trim(), showAdminKey ? secretKey.trim() : undefined);
    setIsLoading(false);

    if (!success) {
      setError('Unable to join. Please check your credentials or server status.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md p-8 overflow-hidden rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl shadow-indigo-950/40">
        {/* Glow decoration */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-8 relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-4 shadow-inner">
            <Film className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            Family Watch Together
            <Sparkles className="w-4 h-4 text-amber-400 inline" />
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Synchronized watch room for family & friends
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Choose your display name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                dir="auto"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثلاً علی، سارا، Alex..."
                maxLength={25}
                required
                autoFocus
                className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              No password needed for family members. Just enter your name.
            </p>
          </div>

          {/* Admin Secret Key Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdminKey(!showAdminKey)}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              {showAdminKey ? 'Hide Admin Secret Key' : 'Are you the Admin? Enter secret key'}
            </button>

            {showAdminKey && (
              <div className="mt-3 p-3.5 rounded-xl bg-slate-800/60 border border-indigo-500/20 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-1.5">
                  Admin Secret Key
                </label>
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Enter secret key (default: admin123)"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Admins can add video links, re-encode FPS/size, and manage playback.
                </span>
              </div>
            )}
          </div>

          {/* Join Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Join Watch Room
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

