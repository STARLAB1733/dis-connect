'use client';

import { useEffect, useState } from 'react';

/**
 * Reactive story beat shown right after a player submits a choice, so the
 * game visibly reacts instead of silently scoring. Renders as a full-screen
 * overlay styled like an incoming comms message; tap anywhere to continue.
 */
export default function ConsequenceBeat({
  text,
  tone,
  onDismiss,
}: {
  text: string;
  /** success = green accent, fail = amber, neutral = orange (choice outcomes) */
  tone: 'success' | 'fail' | 'neutral';
  onDismiss: () => void;
}) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 30);
    return () => clearTimeout(t);
  }, []);

  const accent =
    tone === 'success' ? 'border-emerald-500/60 text-emerald-400'
    : tone === 'fail' ? 'border-amber-500/60 text-amber-400'
    : 'border-[#FF6600]/60 text-[#FF6600]';

  const heading =
    tone === 'success' ? '📡 Incoming — nice work'
    : tone === 'fail' ? '📡 Incoming — plot twist'
    : '📡 Incoming transmission';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#0f172a]/90 p-6"
      onClick={onDismiss}
      role="button"
      aria-label="Continue"
    >
      <div
        className={`w-full max-w-sm rounded-xl border bg-[#1e293b] p-5 shadow-2xl transition-all duration-300 ${accent} ${
          entered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95'
        }`}
      >
        <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${accent.split(' ')[1]}`}>
          {heading}
        </p>
        <p className="text-sm text-[#e2e8f0] leading-relaxed">{text}</p>
        <p className="mt-4 text-center text-xs text-[#94a3b8] animate-pulse">tap to continue</p>
      </div>
    </div>
  );
}
