'use client';
import { useEffect, useState, useCallback } from 'react';

const LS_KEY = 'dis-device-mode';

export function DeviceToggle() {
  const [ready, setReady] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isManual, setIsManual] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const saved = localStorage.getItem(LS_KEY);

    if (saved === 'desktop') {
      setIsManual(true);
      setIsDesktop(true);
      document.documentElement.setAttribute('data-device', 'desktop');
    } else if (saved === 'mobile') {
      setIsManual(true);
      setIsDesktop(false);
      document.documentElement.setAttribute('data-device', 'mobile');
    } else {
      const detected = mql.matches;
      setIsDesktop(detected);
      document.documentElement.setAttribute('data-device', detected ? 'desktop' : 'mobile');
    }

    const handleChange = (e: MediaQueryListEvent) => {
      setIsManual((prev) => {
        if (!prev) {
          setIsDesktop(e.matches);
          document.documentElement.setAttribute('data-device', e.matches ? 'desktop' : 'mobile');
        }
        return prev;
      });
    };

    mql.addEventListener('change', handleChange);
    setReady(true);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  const toggle = useCallback(() => {
    setIsDesktop((prev) => {
      const next = !prev;
      localStorage.setItem(LS_KEY, next ? 'desktop' : 'mobile');
      document.documentElement.setAttribute('data-device', next ? 'desktop' : 'mobile');
      return next;
    });
    setIsManual(true);
  }, []);

  const resetAuto = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    setIsManual(false);
    const detected = window.matchMedia('(min-width: 768px)').matches;
    setIsDesktop(detected);
    document.documentElement.setAttribute('data-device', detected ? 'desktop' : 'mobile');
  }, []);

  if (!ready) return null;

  return (
    <div className="fixed bottom-4 right-16 z-50 flex flex-col items-center gap-1">
      {isManual && (
        <button
          onClick={resetAuto}
          className="text-[0.55rem] bg-[#334155] text-[#94a3b8] px-1.5 py-0.5 rounded hover:bg-[#475569] hover:text-[#e2e8f0] transition leading-none"
        >
          AUTO
        </button>
      )}
      <button
        onClick={toggle}
        aria-label={isDesktop ? 'Switch to mobile view' : 'Switch to desktop view'}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:border-[#FF6600] hover:text-[#FF6600] transition shadow-lg"
      >
        {isDesktop ? <MonitorIcon /> : <PhoneIcon />}
      </button>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
