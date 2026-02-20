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
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col max-w-md mx-auto px-4">
      <div className="flex-1 flex flex-col items-center justify-center gap-12">
        <h1 className="text-center">
          <span className="text-7xl font-bold text-[#FF6600] font-sans">DIS</span>
          <span className="text-6xl font-bold text-[#94a3b8] font-sans">Connect</span>
        </h1>

        <div className="flex flex-col items-center space-y-6 w-full max-w-sm">
            <button
              onClick={createLobby}
              className="
                w-full px-6 py-4
                bg-[#FF6600] hover:bg-[#e65a00]
                hover:cursor-pointer
                text-white font-semibold
                rounded-lg tracking-wider uppercase
                transition duration-200 text-2xl
              "
            >
              CREATE LOBBY
            </button>

            <span className="text-[#94a3b8] font-medium">OR</span>

            <div className="flex w-full max-w-sm mx-auto rounded-lg overflow-hidden border border-[#334155] focus-within:border-[#FF6600] transition-colors">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && joinLobby()}
                placeholder="Enter lobby code"
                className="
                  flex-grow px-4 py-3
                  bg-[#1e293b]
                  text-[#e2e8f0] placeholder:text-[#94a3b8]
                  focus:outline-none
                "
              />
              <button
                onClick={joinLobby}
                className="
                  px-5 py-3
                  bg-[#334155] text-[#e2e8f0]
                  hover:bg-[#475569]
                  transition duration-200 hover:cursor-pointer
                  font-medium tracking-wide
                "
              >
                Join
              </button>
            </div>

            <button
              onClick={() => router.push('/leaderboard')}
              className="text-[#94a3b8] hover:text-[#FF6600] text-sm uppercase tracking-wider transition"
            >
              View Leaderboard
            </button>
          </div>
      </div>

      <footer className="text-center space-y-1 py-5 text-[#475569] text-[0.7rem]">
        <p className="text-[#64748b] tracking-widest uppercase font-medium">DISConnect v2.0</p>
        <p>ME4 Anthony Tan · ME4 Wilson Gwee · ME4 Keith Chew</p>
        <p className="text-[#3d5068]">Music by Matthew Pablo · CC BY 3.0 · opengameart.org</p>
      </footer>
    </main>
  );
}
