import React, { useState, useEffect } from 'react';
import { Film, Users, Shield, Crown, Wifi, WifiOff, KeyRound, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';

interface MeetingHeaderProps {
  onToggleParticipants: () => void;
  activeSidebar: string | null;
}

export const MeetingHeader: React.FC<MeetingHeaderProps> = ({ onToggleParticipants, activeSidebar }) => {
  const { username, isAdmin, logout } = useAuth();
  const { connected, roomState, elevateToAdmin } = useSocket();
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult && choiceResult.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const participantCount = roomState ? Object.keys(roomState.users).length : 1;

  const handleElevate = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError(null);
    const success = await elevateToAdmin(adminKeyInput.trim());
    if (success) {
      setShowKeyModal(false);
      setAdminKeyInput('');
    } else {
      setKeyError('Invalid Admin Secret Key');
    }
  };

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-2.5 sm:px-4 flex items-center justify-between select-none z-20">
      {/* Left: Brand & Meeting Room status */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Film className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-xs sm:text-sm tracking-wide text-white truncate block">
              Family Watch Together
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium shrink-0">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse" />
                STAGE LIVE
              </span>
              <span>•</span>
              <button
                onClick={onToggleParticipants}
                className={`hover:text-white transition-colors flex items-center gap-1 truncate ${
                  activeSidebar === 'participants' ? 'text-indigo-400' : ''
                }`}
              >
                <Users className="w-3 h-3 shrink-0" />
                <span>{participantCount} {participantCount === 1 ? 'viewer' : 'viewers'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right: User Status, PWA Install, & Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* PWA Install Button */}
        {deferredPrompt && (
          <button
            onClick={handleInstallPWA}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-medium bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-full shadow-md shadow-indigo-600/30 transition-all animate-pulse"
            title="نصب نسخه برنامه وب (PWA) روی گوشی یا کامپیوتر"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">نصب اپلیکیشن</span>
          </button>
        )}

        {/* Connection status */}
        <div
          title={connected ? 'Connected to live stream server' : 'Reconnecting...'}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300"
        >
          {connected ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] text-slate-400 hidden md:inline">Synced</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span className="text-[11px] text-amber-400 hidden md:inline">Connecting...</span>
            </>
          )}
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-slate-800">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm shrink-0">
            {username ? username[0] : 'U'}
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-200 leading-tight max-w-[70px] sm:max-w-[120px] truncate">
              {username}
            </span>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-semibold tracking-wide">
                <Crown className="w-2.5 h-2.5 shrink-0" />
                <span className="hidden xs:inline">ADMIN</span>
              </span>
            ) : (
              <button
                onClick={() => setShowKeyModal(true)}
                className="text-[10px] text-slate-400 hover:text-indigo-300 flex items-center gap-0.5"
                title="Click to elevate to Admin with secret key"
              >
                <Shield className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                <span className="hidden xs:inline">Member</span>
              </button>
            )}
          </div>

          <button
            onClick={logout}
            className="ml-1 sm:ml-2 text-xs text-slate-400 hover:text-red-400 transition-colors p-1"
            title="Leave watch party"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Secret Key Modal for Members who want to become Admin */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-sm shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-indigo-400 mb-3 font-semibold text-sm">
              <KeyRound className="w-4 h-4" />
              Elevate to Admin
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Enter the admin secret key to unlock video queue management and re-encoding options.
            </p>
            {keyError && <div className="text-xs text-red-400 mb-2">{keyError}</div>}
            <form onSubmit={handleElevate}>
              <input
                type="password"
                value={adminKeyInput}
                onChange={(e) => setAdminKeyInput(e.target.value)}
                placeholder="Admin Secret Key"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium"
                >
                  Confirm Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

