'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

type AudioContextType = {
  isMuted: boolean;
  toggleMute: () => void;
  playSfx: (name: 'select' | 'success' | 'advance' | 'complete') => void;
  switchBgm: (track: 'lobby' | 'game') => void;
};

const AudioContext = createContext<AudioContextType>({
  isMuted: false,
  toggleMute: () => {},
  playSfx: () => {},
  switchBgm: () => {},
});

export function useAudio() {
  return useContext(AudioContext);
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const sfxRefs = useRef<Record<string, HTMLAudioElement>>({});
  const [ready, setReady] = useState(false);
  const currentTrackRef = useRef<string>('lobby');
  const startedRef = useRef(false);

  // Load mute preference
  useEffect(() => {
    const saved = localStorage.getItem('dis-muted');
    if (saved === 'true') setIsMuted(true);
    setReady(true);
  }, []);

  // Init BGM on first user interaction
  useEffect(() => {
    if (!ready) return;

    const createBgm = (src: string) => {
      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = 0.3;
      audio.muted = isMuted;
      return audio;
    };

    const startBgm = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const audio = createBgm(`/audio/bgm-${currentTrackRef.current}.wav`);
      bgmRef.current = audio;
      audio.play().catch(() => {});
    };

    document.addEventListener('click', startBgm, { once: true });
    document.addEventListener('keydown', startBgm, { once: true });

    return () => {
      document.removeEventListener('click', startBgm);
      document.removeEventListener('keydown', startBgm);
    };
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync mute state to BGM
  useEffect(() => {
    if (bgmRef.current) bgmRef.current.muted = isMuted;
  }, [isMuted]);

  const switchBgm = useCallback((track: 'lobby' | 'game') => {
    if (currentTrackRef.current === track) return;
    currentTrackRef.current = track;

    if (!startedRef.current) return; // BGM hasn't started yet — will pick up new track on start

    const old = bgmRef.current;
    const audio = new Audio(`/audio/bgm-${track}.wav`);
    audio.loop = true;
    audio.volume = 0.3;
    audio.muted = isMuted;

    // Crossfade: fade out old, start new
    if (old) {
      let vol = old.volume;
      const fadeOut = setInterval(() => {
        vol = Math.max(0, vol - 0.05);
        old.volume = vol;
        if (vol <= 0) {
          clearInterval(fadeOut);
          old.pause();
        }
      }, 50);
    }

    audio.play().catch(() => {});
    bgmRef.current = audio;
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      localStorage.setItem('dis-muted', String(next));
      if (bgmRef.current) bgmRef.current.muted = next;
      return next;
    });
  }, []);

  const playSfx = useCallback((name: 'select' | 'success' | 'advance' | 'complete') => {
    if (isMuted) return;
    const src = `/audio/sfx-${name}.wav`;
    if (!sfxRefs.current[name]) {
      sfxRefs.current[name] = new Audio(src);
      sfxRefs.current[name].volume = 0.55;
    }
    const sfx = sfxRefs.current[name];
    sfx.currentTime = 0;
    sfx.play().catch(() => {});
  }, [isMuted]);

  return (
    <AudioContext.Provider value={{ isMuted, toggleMute, playSfx, switchBgm }}>
      {children}
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
