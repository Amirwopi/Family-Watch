import React, { useState } from 'react';
import { Film, Users, Shield, Crown, Wifi, WifiOff, KeyRound } from 'lucide-react';
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
    <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 flex items-center justify-between select-none z-20">
      {/* Left: Brand & Meeting Room status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-wide text-white">Family Watch Together</span>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                STAGE LIVE
              </span>
              <span>•</span>
              <button
                onClick={onToggleParticipants}
                className={`hover:text-white transition-colors flex items-center gap-1 ${
                  activeSidebar === 'participants' ? 'text-indigo-400' : ''
                }`}
              >
                <Users className="w-3 h-3" />
                {participantCount} {participantCount === 1 ? 'viewer' : 'viewers'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right: User Status & Controls */}
      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div
          title={connected ? 'Connected to live stream server' : 'Reconnecting...'}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300"
        >
          {connected ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] text-slate-400 hidden sm:inline">Synced</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span className="text-[11px] text-amber-400 hidden sm:inline">Connecting...</span>
            </>
          )}
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm">
            {username ? username[0] : 'U'}
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-200 leading-tight">{username}</span>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-semibold tracking-wide">
                <Crown className="w-2.5 h-2.5" />
                ADMIN
              </span>
            ) : (
              <button
                onClick={() => setShowKeyModal(true)}
                className="text-[10px] text-slate-400 hover:text-indigo-300 flex items-center gap-0.5"
                title="Click to elevate to Admin with secret key"
              >
                <Shield className="w-2.5 h-2.5 text-slate-500" />
                Member (Enter Key)
              </button>
            )}
          </div>

          <button
            onClick={logout}
            className="ml-2 text-xs text-slate-400 hover:text-red-400 transition-colors p-1"
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

