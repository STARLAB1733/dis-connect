'use client';

// A self-contained, screenshot-friendly persona card.
// No external images, fonts or network calls — pure Tailwind + inline SVG,
// roughly square so it crops nicely in a phone screenshot.

type TopAxis = {
  axis: string;
  score: number; // normalized 0-100
};

type Props = {
  personaName: string;
  zinger: string;
  topAxes: TopAxis[]; // the player's top 2 axes
  teamName?: string | null;
  playerName?: string | null;
};

export default function PersonaShareCard({
  personaName,
  zinger,
  topAxes,
  teamName,
  playerName,
}: Props) {
  return (
    <div className="relative w-full max-w-sm mx-auto aspect-square overflow-hidden rounded-2xl border-2 border-[#FF6600] bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#1e293b] p-5 flex flex-col justify-between">
      {/* Decorative radar rings — inline SVG, no network */}
      <svg
        className="absolute -right-12 -top-12 w-56 h-56 opacity-[0.08] pointer-events-none"
        viewBox="0 0 100 100"
        fill="none"
        stroke="#FF6600"
        strokeWidth="1"
        aria-hidden="true"
      >
        <circle cx="50" cy="50" r="15" />
        <circle cx="50" cy="50" r="30" />
        <circle cx="50" cy="50" r="45" />
        <line x1="50" y1="5" x2="50" y2="95" />
        <line x1="5" y1="50" x2="95" y2="50" />
        <line x1="18" y1="18" x2="82" y2="82" />
        <line x1="82" y1="18" x2="18" y2="82" />
      </svg>

      {/* Header: wordmark */}
      <div className="relative flex items-center justify-between">
        <p className="text-sm font-bold tracking-[0.2em] uppercase">
          <span className="text-[#FF6600]">DIS</span>
          <span className="text-[#e2e8f0]">Connect</span>
        </p>
        <p className="text-[10px] text-[#94a3b8] uppercase tracking-widest">
          Decision Persona
        </p>
      </div>

      {/* Middle: persona name + zinger */}
      <div className="relative text-center px-1">
        {playerName && (
          <p className="text-xs text-[#94a3b8] mb-1 truncate">{playerName} is…</p>
        )}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#FF6600] leading-tight">
          {personaName}
        </h2>
        <p className="text-sm text-[#e2e8f0] italic mt-2 leading-snug">
          “{zinger}”
        </p>
      </div>

      {/* Bottom: top 2 axes + team */}
      <div className="relative space-y-2">
        {topAxes.slice(0, 2).map(({ axis, score }) => (
          <div key={axis}>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-[#e2e8f0] font-semibold uppercase tracking-wider">
                {axis}
              </span>
              <span className="text-[#FF6600] font-bold">{score}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#334155] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#FF6600]"
                style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
              />
            </div>
          </div>
        ))}
        <p className="text-[10px] text-[#94a3b8] pt-1 text-center uppercase tracking-widest truncate">
          {teamName ? `Team ${teamName}` : 'Solo Agent'} · disconnect
        </p>
      </div>
    </div>
  );
}
