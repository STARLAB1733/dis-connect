'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function HomePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const createLobby = () => {
    setIsLoading(true);
    const id = uuidv4().slice(0, 8);
    router.push(`/lobby/${id}`);
  };

  const joinLobby = () => {
    if (!code.trim()) return;
    setIsLoading(true);
    router.push(`/lobby/${code.trim()}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col bg-black text-white max-w-md mx-auto">
      {/* Title */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center space-y-2">
        <p className="text-xs uppercase tracking-widest text-white/40 font-medium">SAF Digital Intelligence Service</p>
        <h1>
          <span className="text-7xl font-black text-[#FF6600]">DIS</span>
          <span className="text-6xl font-black text-white/60">Connect</span>
        </h1>
        <p className="text-white/50 text-sm max-w-xs leading-relaxed pt-2">
          A team cyber challenge for 3 players. Tackle 4 chapters together and find out which digital role suits you best.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-1 items-start justify-center px-6">
        <div className="flex flex-col items-center space-y-4 w-full max-w-sm">
          <button
            onClick={createLobby}
            className="w-full px-6 py-4 bg-[#FF6600] hover:bg-[#e65a00] text-white rounded-xl tracking-wider uppercase transition duration-200 text-xl font-bold"
          >
            Create Lobby
          </button>

          <div className="w-full flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-sm">or join</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="flex w-full">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinLobby()}
              placeholder="Enter lobby code"
              className="flex-grow px-4 py-3 bg-white/5 border border-white/20 rounded-l-xl focus:outline-none focus:border-[#FF6600] text-white placeholder:text-white/30 transition"
            />
            <button
              onClick={joinLobby}
              className="px-5 py-3 bg-white/10 text-white rounded-r-xl hover:bg-white/20 transition duration-200 font-medium border border-white/20 border-l-0"
            >
              Join
            </button>
          </div>

          <button
            onClick={() => router.push('/leaderboard')}
            className="text-white/30 text-xs uppercase tracking-widest hover:text-white/60 transition duration-200 pt-2"
          >
            View Leaderboard →
          </button>
        </div>
      </div>
    </main>
  );
}
