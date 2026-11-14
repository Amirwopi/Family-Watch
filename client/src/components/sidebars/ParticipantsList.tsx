import React from 'react';
import { X, Crown, Wifi, CheckCircle2, Clock, Mic, MicOff, Volume2 } from 'lucide-react';
import { useSocket } from '../../context/SocketContext.js';
import { useVoice } from '../../context/VoiceContext.js';

interface ParticipantsListProps {
  onClose: () => void;
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({ onClose }) => {
  const { roomState, currentUser } = useSocket();
  const { isMicMuted, isSpeaking, speakingUsers, mutedUsers } = useVoice();

  const users = roomState ? Object.values(roomState.users) : [];

  return (
    <div className="w-80 h-full bg-slate-900 border-l border-slate-800 flex flex-col select-none z-10 animate-in slide-in-from-right duration-200">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-white">Participants</h3>
          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300 font-medium">
            {users.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {users.map((user) => {
          const isSelf = currentUser?.id === user.id;
          const userIsSpeaking = isSelf ? isSpeaking : Boolean(speakingUsers[user.socketId]);
          const userIsMuted = isSelf ? isMicMuted : (mutedUsers[user.socketId] ?? user.isMuted ?? true);

          return (
            <div
              key={user.id}
              className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                isSelf
                  ? 'bg-indigo-950/30 border-indigo-500/30'
                  : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* User Avatar Circle with Live Speaking Ring */}
                <div className="relative">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm transition-all ${
                      userIsSpeaking ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 animate-pulse' : ''
                    }`}
                    style={{ backgroundColor: user.avatarColor || '#6366f1' }}
                  >
                    {user.username[0]}
                  </div>
                  {userIsSpeaking && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900" />
                  )}
                </div>

                {/* Name & Role */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-200">
                      {user.username} {isSelf && '(You)'}
                    </span>
                    {user.isAdmin && (
                      <span title="Meeting Admin">
                        <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                    {user.status === 'watching' ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Watching
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> Buffering
                      </span>
                    )}
                    {typeof user.bufferAhead === 'number' && (
                      <span className="text-slate-400 font-mono text-[9px]">
                        ({user.bufferAhead}s بافر)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Status & Mic Badge */}
              <div className="flex items-center gap-2 text-slate-400">
                {user.pingMs ? (
                  <span
                    className={`text-[10px] font-mono ${
                      user.pingMs <= 60 ? 'text-emerald-400' : user.pingMs <= 120 ? 'text-amber-400' : 'text-red-400'
                    }`}
                    title="پینگ کاربر به سرور"
                  >
                    {user.pingMs}ms
                  </span>
                ) : null}
                {userIsSpeaking ? (
                  <span className="text-emerald-400 animate-pulse" title="Speaking">
                    <Volume2 className="w-3.5 h-3.5" />
                  </span>
                ) : userIsMuted ? (
                  <span className="text-slate-500" title="Microphone Muted">
                    <MicOff className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span className="text-emerald-400" title="Microphone Ready">
                    <Mic className="w-3.5 h-3.5" />
                  </span>
                )}
                <Wifi className="w-3 h-3 text-emerald-500" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
