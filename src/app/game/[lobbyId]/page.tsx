'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import ScenarioWrapper from '@/components/ScenarioWrapper';
import { getScenario, ALL_SCENARIOS } from '@/lib/scenarioLoader';

type Player = { uid: string; name: string; role?: string };

export default function GamePage() {
  const { lobbyId } = useParams() as { lobbyId: string };
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [lobby, setLobby] = useState<{
    players?: Player[];
    currentIdx?: number;
    started?: boolean;
  } | null>(null);
  const [role, setRole] = useState<string>('');

  // Subscribe to lobby doc
  useEffect(() => {
    if (!lobbyId) return;
    const ref = doc(db, 'lobbies', lobbyId);
    const unsub = onSnapshot(ref, snap => {
      const data = snap.data();
      if (!data) return;
      setLobby(data);
      const me = (data.players || []).find((p: { uid: string | undefined; }) => p.uid === user?.uid);
      setRole(me?.role || '');
    });
    return unsub;
  }, [lobbyId, user]);

  // 2) Redirect to /results/[lobbyId] when game is done
  useEffect(() => {
    if (!lobby) return;
    const players = lobby.players ?? [];
    const idx = lobby.currentIdx ?? 0;
    const totalTurns = (ALL_SCENARIOS.length) * players.length;

    if (idx >= totalTurns) {
      // Navigation must be performed inside useEffect, not during render
      window.setTimeout(() => {
        // use Next.js router.push (client-side navigation)
        // We can import useRouter() here, or simply:
        router.push(`/results/${lobbyId}`);
      }, 0);
    }
  }, [lobby, lobbyId, router]);

  // Wait until we have lobby & user
  if (!lobby || !user) {
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

  const players     = lobby.players || [];
  const idx         = lobby.currentIdx ?? 0;
  const numPlayers  = players.length;
  const totalTurns = ALL_SCENARIOS.length * numPlayers;

  // Determine which scenario and whose turn
  const scenarioIdx = Math.floor(idx / numPlayers);
  const scenario    = getScenario(scenarioIdx);
  const turnIndex   = idx % numPlayers;
  const currentUid  = players[turnIndex]?.uid;
  const isMyTurn    = currentUid === user.uid;

  // Guard if scenario is null
  if (!scenario) {
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

  // Called when current player finishes their step
  const onNext = async () => {
    const ref = doc(db, 'lobbies', lobbyId);
    await updateDoc(ref, { currentIdx: idx + 1 });
  };

  // Compute percentage (0–100) of completed turns
  const percent = Math.min(100, Math.round((idx / totalTurns) * 100));

  return (
    <div className="min-h-dvh flex flex-col bg-[#ff6600]" >
      <main className="p-4 max-w-md mx-auto">
        {/* ───── Progress Bar ───── */}
        <div className="mb-6">
          <div className="w-full bg-white/40 h-2 rounded-full overflow-hidden">
            <div
              className="h-2 bg-white transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-white text-right">{percent}%</p>
        </div>

        {/* ───── Scenario Header ───── */}
        <header className="bg-gray-500 bg-opacity-90 border border-gray-700 rounded-lg p-2 mb-6 text-center">
          <h1 className="text-xl font-bold text-white pb-1">{scenario.title}</h1>
          <p className="text-sm text-white">{scenario.description}</p>
        </header>

        {/* ───── Body ───── */}
        {isMyTurn ? (
          <ScenarioWrapper
            lobbyId={lobbyId}
            scenario={scenario}
            role={role}
            onNext={onNext}
          />
        ) : (
          <div className="flex flex-col items-center">
            <p className="pt-12 uppercase text-white font-semibold tracking-wider mb-4">
              Waiting for Player {players[turnIndex]?.name}…
            </p>
            {/* Animated loading dots */}
            <div className="flex space-x-2">
              <span
                className="w-4 h-4 bg-white rounded-full"
                style={{
                  animation: 'dotPulse 1s infinite',
                  animationTimingFunction: 'ease-in-out',
                  animationDelay: '0ms',
                }}
              ></span>
              <span
                className="w-4 h-4 bg-[#FFE0CC] rounded-full"
                style={{
                  animation: 'dotPulse 1s infinite',
                  animationTimingFunction: 'ease-in-out',
                  animationDelay: '200ms',
                }}
              />
              <span
                className="w-4 h-4 bg-[#FFCC99] rounded-full"
                style={{
                  animation: 'dotPulse 1s infinite',
                  animationTimingFunction: 'ease-in-out',
                  animationDelay: '400ms',
                }}
              />
              <span
                className="w-4 h-4 bg-[#FFB266] rounded-full"
                style={{
                  animation: 'dotPulse 1s infinite',
                  animationTimingFunction: 'ease-in-out',
                  animationDelay: '600ms',
                }}
              />
              <span
                className="w-4 h-4 bg-[#FF9933] rounded-full"
                style={{
                  animation: 'dotPulse 1s infinite',
                  animationTimingFunction: 'ease-in-out',
                  animationDelay: '800ms',
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
