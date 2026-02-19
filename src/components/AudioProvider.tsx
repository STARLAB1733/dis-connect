'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

type AudioContextType = {
  isMuted: boolean;
  toggleMute: () => void;
  playSfx: (name: 'select' | 'success' | 'advance' | 'complete') => void;
};

const AudioContext = createContext<AudioContextType>({
  isMuted: false,
  toggleMute: () => {},
  playSfx: () => {},
});

export function useAudio() {
  return useContext(AudioContext);
}

/**
 * AudioProvider wraps the app and provides:
 * - Background music (loops, respects mute)
 * - SFX playback via playSfx()
 * - Mute toggle (persisted to localStorage)
 *
 * Audio files expected in /public/audio/:
 *   bgm-lobby.mp3   – ambient lobby music
 *   bgm-game.mp3    – tense game music
 *   sfx-select.mp3  – button/choice select
 *   sfx-success.mp3 – correct answer
 *   sfx-advance.mp3 – chapter advance
 *   sfx-complete.mp3 – mission complete
 */
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const sfxRefs = useRef<Record<string, HTMLAudioElement>>({});
  const [ready, setReady] = useState(false);

  // Load mute preference
  useEffect(() => {
    const saved = localStorage.getItem('dis-muted');
    if (saved === 'true') setIsMuted(true);
    setReady(true);
  }, []);

  // Init BGM
  useEffect(() => {
    if (!ready) return;
    const audio = new Audio('/audio/bgm-lobby.mp3');
    audio.loop = true;
    audio.volume = 0.35;
    audio.muted = isMuted;
    bgmRef.current = audio;

    // Start on first user interaction
    const startBgm = () => {
      audio.play().catch(() => {});
      document.removeEventListener('click', startBgm);
      document.removeEventListener('keydown', startBgm);
    };
    document.addEventListener('click', startBgm, { once: true });
    document.addEventListener('keydown', startBgm, { once: true });

    return () => {
      audio.pause();
      bgmRef.current = null;
    };
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync mute state to BGM
  useEffect(() => {
    if (bgmRef.current) bgmRef.current.muted = isMuted;
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      localStorage.setItem('dis-muted', String(next));
      return next;
    });
  }, []);

  const playSfx = useCallback((name: 'select' | 'success' | 'advance' | 'complete') => {
    if (isMuted) return;
    const src = `/audio/sfx-${name}.mp3`;
    if (!sfxRefs.current[name]) {
      sfxRefs.current[name] = new Audio(src);
      sfxRefs.current[name].volume = 0.6;
    }
    const sfx = sfxRefs.current[name];
    sfx.currentTime = 0;
    sfx.play().catch(() => {});
  }, [isMuted]);

  return (
    <AudioContext.Provider value={{ isMuted, toggleMute, playSfx }}>
      {children}
      {/* Mute toggle button — fixed bottom-right */}
      {ready && (
        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          className="fixed bottom-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:border-[#FF6600] hover:text-[#FF6600] transition text-lg shadow-lg"
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      )}
    </AudioContext.Provider>
  );
}
