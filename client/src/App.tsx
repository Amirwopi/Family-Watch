import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { SocketProvider } from './context/SocketContext.js';
import { VoiceProvider } from './context/VoiceContext.js';
import { LoginModal } from './components/LoginModal.js';
import { MeetingHeader } from './components/MeetingHeader.js';
import { VideoPlayer } from './components/VideoPlayer.js';
import { ReactionsOverlay } from './components/ReactionsOverlay.js';
import { MeetingDock } from './components/MeetingDock.js';
import { ParticipantsList } from './components/sidebars/ParticipantsList.js';
import { ChatPanel } from './components/sidebars/ChatPanel.js';
import { QueuePanel } from './components/sidebars/QueuePanel.js';
import { AdminPanel } from './components/sidebars/AdminPanel.js';

type SidebarType = 'chat' | 'queue' | 'participants' | 'admin' | null;

const MainMeetingView: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeSidebar, setActiveSidebar] = useState<SidebarType>(null);

  if (!isAuthenticated) {
    return <LoginModal />;
  }

  return (
    <SocketProvider>
      <VoiceProvider>
        <div className="flex flex-col h-screen w-screen bg-[#0b0f17] text-gray-100 overflow-hidden font-['Inter',sans-serif]">
          {/* Top Meeting Header */}
          <MeetingHeader
            activeSidebar={activeSidebar}
            onToggleParticipants={() =>
              setActiveSidebar((prev) => (prev === 'participants' ? null : 'participants'))
            }
          />

          {/* Middle Stage Area (Video + Floating Reactions + Active Sidebar) */}
          <div className="flex-1 flex overflow-hidden relative">
            <div className="flex-1 flex flex-col relative h-full">
              <VideoPlayer />
              <ReactionsOverlay />
            </div>

            {/* Sidebars / Mobile Drawer */}
            {activeSidebar && (
              <div className="fixed inset-0 z-40 sm:static sm:z-10 flex flex-row justify-end bg-black/60 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none animate-in fade-in duration-150">
                {/* Tap outside to dismiss on mobile */}
                <div
                  className="flex-1 sm:hidden cursor-pointer"
                  onClick={() => setActiveSidebar(null)}
                  title="بستن منو"
                />
                <div className="w-full max-w-[90vw] sm:max-w-none sm:w-auto h-full flex flex-col shadow-2xl">
                  {activeSidebar === 'participants' && (
                    <ParticipantsList onClose={() => setActiveSidebar(null)} />
                  )}
                  {activeSidebar === 'chat' && (
                    <ChatPanel onClose={() => setActiveSidebar(null)} />
                  )}
                  {activeSidebar === 'queue' && (
                    <QueuePanel
                      onClose={() => setActiveSidebar(null)}
                      onOpenAdmin={() => setActiveSidebar('admin')}
                    />
                  )}
                  {activeSidebar === 'admin' && (
                    <AdminPanel onClose={() => setActiveSidebar(null)} />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Meeting Dock */}
          <MeetingDock
            activeSidebar={activeSidebar}
            setActiveSidebar={setActiveSidebar}
          />
        </div>
      </VoiceProvider>
    </SocketProvider>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainMeetingView />
    </AuthProvider>
  );
};

export default App;

