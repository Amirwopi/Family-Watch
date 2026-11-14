import React from 'react';
import { useSocket } from '../context/SocketContext.js';

export const ReactionsOverlay: React.FC = () => {
  const { reactions } = useSocket();

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-16 animate-float flex flex-col items-center"
          style={{ left: `${r.xOffset ?? 50}%` }}
        >
          <span className="text-4xl filter drop-shadow-md select-none">{r.emoji}</span>
          <span className="text-[10px] bg-black/60 backdrop-blur-sm text-slate-300 px-1.5 py-0.5 rounded-full mt-1 border border-white/10">
            {r.username}
          </span>
        </div>
      ))}
    </div>
  );
};

