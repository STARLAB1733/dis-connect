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
    if (!code.trim()) {
      return;
    }
    setIsLoading(true);
    router.push(`/lobby/${code.trim()}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div
          className="
            w-12 h-12
            border-4 border-[#FF6600]
            border-t-transparent
            rounded-full
            animate-spin
          "
        />
      </div>
    );
  }

  // Otherwise, show the normal homepage UI:
  return (
    <main className="min-h-dvh flex flex-col max-w-md mx-auto">
      {/* Top half */}
      <div className="flex flex-1 items-center justify-center">
        <h1 className="text-center">
          <span className="text-7xl font-bold text-[#FF6600] font-sans">DIS</span>
          <span className="text-6xl font-bold text-gray-500 font-sans">Connect</span>
        </h1>
      </div>

      {/* Bottom half */}
      <div className="flex flex-1 items-start justify-center">
        <div className="flex flex-col items-center space-y-6 w-full px-4 max-w-sm">
          <button
            onClick={createLobby}
            className="
              w-full
              px-6 py-4
              bg-[#FF6600]
              hover:bg-[#b34400]
              hover:cursor-pointer
              text-black
              rounded-lg
              tracking-wider
              uppercase
              transition duration-200
              text-2xl
              font-semibold
            "
          >
            CREATE LOBBY
          </button>

          <span className="text-gray-500 font-medium">OR</span>

          <div className="flex w-full max-w-sm mx-auto">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter lobby code"
              className="
                flex-grow
                px-4 py-2
                border
                rounded-l-lg
                focus:outline-none
              "
            />
            <button
              onClick={joinLobby}
              className="
                px-4 py-2
                bg-gray-600 text-white
                rounded-r-lg
                hover:bg-gray-800
                transition duration-200
                hover:cursor-pointer
              "
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
