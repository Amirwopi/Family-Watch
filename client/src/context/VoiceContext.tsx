import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from './SocketContext.js';

interface VoiceContextType {
  isMicMuted: boolean;
  isSpeaking: boolean;
  speakingUsers: Record<string, boolean>;
  mutedUsers: Record<string, boolean>;
  micError: string | null;
  toggleMic: () => Promise<void>;
}

const VoiceContext = createContext<VoiceContextType | null>(null);

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

// Component to reliably play incoming remote audio streams
const AudioPlayer: React.FC<{ stream: MediaStream }> = ({ stream }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch((err) => {
        console.warn('[Voice] Remote audio playback requires user interaction:', err);
      });
    }
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline className="hidden" />;
};

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket, roomState, currentUser } = useSocket();

  const [isMicMuted, setIsMicMuted] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingUsers, setSpeakingUsers] = useState<Record<string, boolean>>({});
  const [mutedUsers, setMutedUsers] = useState<Record<string, boolean>>({});
  const [micError, setMicError] = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkSpeakingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Acquire or get existing local microphone stream
  const getLocalAudioStream = async (): Promise<MediaStream> => {
    if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
      return localStreamRef.current;
    }

    const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
    const hasMediaDevices = !!(nav && nav.mediaDevices && typeof nav.mediaDevices.getUserMedia === 'function');
    const legacyGetUserMedia = nav ? (nav.getUserMedia || nav.webkitGetUserMedia || nav.mozGetUserMedia || nav.msGetUserMedia) : null;

    if (!hasMediaDevices && !legacyGetUserMedia) {
      const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;
      const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

      let errMessage = 'دسترسی میکروفون در این مرورگر پشتیبانی نمی‌شود.';
      if (!isSecure && !isLocalhost) {
        errMessage = 'میکروفون در شبکه نیازمند HTTPS یا localhost است (روی LAN نیاز به فلگ کروم دارد).';
      }
      setMicError(errMessage);
      throw new Error(errMessage);
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      };

      let stream: MediaStream;
      if (hasMediaDevices) {
        stream = await nav.mediaDevices.getUserMedia(constraints);
      } else {
        stream = await new Promise<MediaStream>((resolve, reject) => {
          legacyGetUserMedia.call(nav, constraints, resolve, reject);
        });
      }

      localStreamRef.current = stream;

      // Start audio analysis for speaking detection
      setupSpeakingDetector(stream);

      return stream;
    } catch (err: any) {
      console.error('[Voice] Failed to get microphone stream:', err);
      let friendlyMsg = err.message || 'دسترسی به میکروفون رد شد یا دستگاه در دسترس نیست';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        friendlyMsg = 'دسترسی میکروفون تایید نشد (Permission Denied). لطفاً در مرورگر اجازه دسترسی بدهید.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        friendlyMsg = 'هیچ دستگاه میکروفونی متصل نیست.';
      } else if (err.name === 'NotReadableError') {
        friendlyMsg = 'میکروفون توسط برنامه دیگری در سیستم در حال استفاده است.';
      }
      setMicError(friendlyMsg);
      throw err;
    }
  };

  // Setup Web Audio Analyser to detect when local user is speaking
  const setupSpeakingDetector = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const buffer = new Uint8Array(analyser.frequencyBinCount);

      if (checkSpeakingIntervalRef.current) clearInterval(checkSpeakingIntervalRef.current);

      checkSpeakingIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || isMicMuted) {
          if (isSpeakingRef.current) {
            isSpeakingRef.current = false;
            setIsSpeaking(false);
            socket?.emit('voice:speaking', false);
          }
          return;
        }

        analyserRef.current.getByteFrequencyData(buffer);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const average = sum / buffer.length;

        // If average volume is above threshold (talking detected)
        if (average > 15) {
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            setIsSpeaking(true);
            socket?.emit('voice:speaking', true);
          }

          if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
          speakingTimeoutRef.current = setTimeout(() => {
            if (isSpeakingRef.current) {
              isSpeakingRef.current = false;
              setIsSpeaking(false);
              socket?.emit('voice:speaking', false);
            }
          }, 400);
        }
      }, 100);
    } catch (err) {
      console.warn('[Voice] AudioContext speaking detector error:', err);
    }
  };

  // Create or get RTCPeerConnection for a remote peer
  const getOrCreatePeerConnection = useCallback((remoteSocketId: string): RTCPeerConnection => {
    let pc = peerConnectionsRef.current.get(remoteSocketId);
    if (pc && pc.connectionState !== 'closed') {
      return pc;
    }

    pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(remoteSocketId, pc);

    // Add local audio tracks if we already have a stream
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        pc?.addTrack(track, localStreamRef.current!);
      });
    }

    // ICE candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('voice:signal', {
          targetSocketId: remoteSocketId,
          signal: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    // Remote audio track received
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStreams((prev) => ({
          ...prev,
          [remoteSocketId]: event.streams[0],
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc?.connectionState === 'disconnected' || pc?.connectionState === 'failed' || pc?.connectionState === 'closed') {
        setRemoteStreams((prev) => {
          const updated = { ...prev };
          delete updated[remoteSocketId];
          return updated;
        });
      }
    };

    return pc;
  }, [socket]);

  // Initiate WebRTC Call to a peer
  const initiateCallToPeer = useCallback(async (remoteSocketId: string) => {
    try {
      const pc = getOrCreatePeerConnection(remoteSocketId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket?.emit('voice:signal', {
        targetSocketId: remoteSocketId,
        signal: { type: 'offer', sdp: offer },
      });
    } catch (err) {
      console.error('[Voice] Failed to initiate call to peer:', remoteSocketId, err);
    }
  }, [getOrCreatePeerConnection, socket]);

  // Connect WebRTC to all other users in room
  const connectToAllPeers = useCallback(async () => {
    if (!roomState?.users || !currentUser) return;

    for (const remoteSocketId of Object.keys(roomState.users)) {
      if (remoteSocketId !== currentUser.socketId) {
        // Deterministic initiator: lexicographically lower socket ID initiates
        if (currentUser.socketId < remoteSocketId) {
          await initiateCallToPeer(remoteSocketId);
        }
      }
    }
  }, [roomState?.users, currentUser, initiateCallToPeer]);

  // Listen for WebRTC signals from peers via socket
  useEffect(() => {
    if (!socket) return;

    const handleVoiceSignal = async (data: { senderSocketId: string; signal: any }) => {
      const { senderSocketId, signal } = data;
      if (!senderSocketId || !signal) return;

      try {
        const pc = getOrCreatePeerConnection(senderSocketId);

        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          // Ensure local tracks are added
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((track) => {
              const senders = pc.getSenders();
              const alreadyAdded = senders.some((s) => s.track === track);
              if (!alreadyAdded) {
                pc.addTrack(track, localStreamRef.current!);
              }
            });
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('voice:signal', {
            targetSocketId: senderSocketId,
            signal: { type: 'answer', sdp: answer },
          });
        } else if (signal.type === 'answer') {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          }
        } else if (signal.type === 'candidate') {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      } catch (err) {
        console.error('[Voice] Signal handling error:', err);
      }
    };

    const handleUserStatus = (data: { socketId: string; isMuted: boolean }) => {
      setMutedUsers((prev) => ({ ...prev, [data.socketId]: data.isMuted }));
    };

    const handleUserSpeaking = (data: { socketId: string; isSpeaking: boolean }) => {
      setSpeakingUsers((prev) => ({ ...prev, [data.socketId]: data.isSpeaking }));
    };

    const handleUserLeft = (socketId: string) => {
      const pc = peerConnectionsRef.current.get(socketId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(socketId);
      }
      setRemoteStreams((prev) => {
        const updated = { ...prev };
        delete updated[socketId];
        return updated;
      });
      setSpeakingUsers((prev) => {
        const updated = { ...prev };
        delete updated[socketId];
        return updated;
      });
      setMutedUsers((prev) => {
        const updated = { ...prev };
        delete updated[socketId];
        return updated;
      });
    };

    socket.on('voice:signal', handleVoiceSignal);
    socket.on('voice:user_status', handleUserStatus);
    socket.on('voice:user_speaking', handleUserSpeaking);
    socket.on('user:left', handleUserLeft);

    return () => {
      socket.off('voice:signal', handleVoiceSignal);
      socket.off('voice:user_status', handleUserStatus);
      socket.off('voice:user_speaking', handleUserSpeaking);
      socket.off('user:left', handleUserLeft);
    };
  }, [socket, getOrCreatePeerConnection]);

  // Connect to peers when roomState users list changes
  useEffect(() => {
    connectToAllPeers();
  }, [connectToAllPeers]);

  // Toggle Microphone (Mute / Unmute)
  const toggleMic = async () => {
    setMicError(null);

    if (isMicMuted) {
      // Unmuting: Acquire audio and enable track
      try {
        const stream = await getLocalAudioStream();
        stream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });

        // Ensure track is attached to all existing peer connections
        peerConnectionsRef.current.forEach((pc) => {
          stream.getAudioTracks().forEach((track) => {
            const senders = pc.getSenders();
            const trackSender = senders.find((s) => s.track?.kind === 'audio');
            if (trackSender) {
              trackSender.replaceTrack(track);
            } else {
              pc.addTrack(track, stream);
            }
          });
        });

        // Ensure calls are connected to all peers
        await connectToAllPeers();

        setIsMicMuted(false);
        socket?.emit('voice:status', { isMuted: false });
      } catch (err: any) {
        setMicError(err.message || 'Could not access microphone');
      }
    } else {
      // Muting: Disable track
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }

      setIsMicMuted(true);
      setIsSpeaking(false);
      isSpeakingRef.current = false;

      socket?.emit('voice:status', { isMuted: true });
      socket?.emit('voice:speaking', false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();

      if (checkSpeakingIntervalRef.current) clearInterval(checkSpeakingIntervalRef.current);
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, []);

  return (
    <VoiceContext.Provider
      value={{
        isMicMuted,
        isSpeaking,
        speakingUsers,
        mutedUsers,
        micError,
        toggleMic,
      }}
    >
      {/* Invisible audio elements to play voices of other participants */}
      {Object.entries(remoteStreams).map(([peerId, stream]) => (
        <AudioPlayer key={peerId} stream={stream} />
      ))}
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};

