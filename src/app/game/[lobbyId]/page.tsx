'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, onSnapshot, updateDoc, runTransaction } from 'firebase/firestore';
import ScenarioWrapper from '@/components/ScenarioWrapper';
import { getScenario, ALL_SCENARIOS } from '@/lib/scenarioLoader';

type Player = { uid: string; name: string; role?: string };

type LobbyData = {
  players?: Player[];
  roundIdx?: number;
  roundAnswers?: Record<string, boolean>;
  started?: boolean;
};

export default function GamePage() {
  const { lobbyId } = useParams() as { lobbyId: string };
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [lobby, setLobby] = useState<LobbyData | null>(null);
  const [role, setRole] = useState<string>('');
  const [hasAnswered, setHasAnswered] = useState(false);

  // Subscribe to lobby doc
  useEffect(() => {
    if (!lobbyId) return;
    const ref = doc(db, 'lobbies', lobbyId);
    const unsub = onSnapshot(ref, snap => {
      const data = snap.data() as LobbyData | undefined;
      if (!data) return;
      setLobby(data);
      const me = (data.players || []).find((p: Player) => p.uid === user?.uid);
      setRole(me?.role || '');
    });
    return unsub;
  }, [lobbyId, user]);

  // Reset hasAnswered whenever the round advances
  useEffect(() => {
    setHasAnswered(false);
  }, [lobby?.roundIdx]);

  // Redirect to results when all rounds are done
  useEffect(() => {
    if (!lobby) return;
    const roundIdx = lobby.roundIdx ?? 0;
    if (roundIdx >= ALL_SCENARIOS.length) {
      window.setTimeout(() => {
        router.push(`/results/${lobbyId}`);
      }, 0);
    }
  }, [lobby, lobbyId, router]);

  // Wait until we have lobby & user
  if (!lobby || !user) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#ff6600]">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const players = lobby.players || [];
  const roundIdx = lobby.roundIdx ?? 0;
  const roundAnswers = lobby.roundAnswers ?? {};
  const totalRounds = ALL_SCENARIOS.length;

  // How many players have answered this round
  const answeredCount = Object.keys(roundAnswers).length;
  const totalPlayers = players.length;

  const scenario = getScenario(roundIdx);

  // Guard if scenario is null (game over)
  if (!scenario) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#ff6600]">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const iHaveAnswered = hasAnswered || !!roundAnswers[user.uid];

  // Called when current player submits their answer
  const onNext = async (pointsEarned: number) => {
    setHasAnswered(true);
    const ref = doc(db, 'lobbies', lobbyId);

    // Use a transaction to safely update roundAnswers and conditionally advance roundIdx + teamScore
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      const data = snap.data() as LobbyData & { teamScore?: number };
      if (!data) return;

      const currentRound = data.roundIdx ?? 0;
      const currentAnswers = data.roundAnswers ?? {};
      const currentScore = data.teamScore ?? 0;

      // Mark this player as answered
      const updatedAnswers = { ...currentAnswers, [user.uid]: true };
      const newScore = currentScore + pointsEarned;

      // Check if everyone has answered
      const numPlayers = (data.players || []).length;
      const allDone = Object.keys(updatedAnswers).length >= numPlayers;

      if (allDone) {
        // Advance to next round, reset answers
        transaction.update(ref, {
          roundIdx: currentRound + 1,
          roundAnswers: {},
          teamScore: newScore,
        });
      } else {
        // Just record this player's answer + score
        transaction.update(ref, {
          roundAnswers: updatedAnswers,
          teamScore: newScore,
        });
      }
    });
  };

  // Progress: rounds completed out of total
  const percent = Math.min(100, Math.round((roundIdx / totalRounds) * 100));

  // Waiting screen: player answered, waiting for others
  const waitingCount = totalPlayers - answeredCount;

  return (
    <div className="min-h-dvh flex flex-col bg-[#ff6600]">
      <main className="p-4 max-w-md mx-auto w-full">
        {/* ───── Progress Bar ───── */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-white mb-1">
            <span className="uppercase tracking-wider font-medium">Chapter {roundIdx + 1} of {totalRounds}</span>
            <span>{percent}%</span>
          </div>
          <div className="w-full bg-white/40 h-2 rounded-full overflow-hidden">
            <div
              className="h-2 bg-white transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* ───── Story Header ───── */}
        <header className="bg-black/30 rounded-xl p-4 mb-6 text-white">
          <div className="text-xs uppercase tracking-widest text-white/70 mb-1 font-medium">
            {scenario.title}
          </div>
          <p className="text-sm leading-relaxed">{scenario.storyContext}</p>
        </header>

        {/* ───── Body ───── */}
        {iHaveAnswered ? (
          <div className="flex flex-col items-center pt-8 text-white">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-xl font-semibold mb-2 uppercase tracking-wide">Done — nice work!</p>
            <p className="text-white/80 text-center">
              Waiting for {waitingCount} more player{waitingCount !== 1 ? 's' : ''} to finish…
            </p>
            {/* Animated dots */}
            <div className="flex space-x-2 mt-8">
              {[0, 200, 400].map((delay) => (
                <span
                  key={delay}
                  className="w-3 h-3 bg-white rounded-full"
                  style={{
                    animation: 'dotPulse 1s infinite ease-in-out',
                    animationDelay: `${delay}ms`,
                  }}
                />
              ))}
            </div>

            {/* Show who's answered */}
            <div className="mt-8 w-full max-w-xs">
              {players.map((p) => (
                <div key={p.uid} className="flex items-center justify-between py-2 border-b border-white/20 last:border-0">
                  <span className="text-sm">{p.name}</span>
                  <span className="text-sm">
                    {roundAnswers[p.uid] ? '✅' : '⏳'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ScenarioWrapper
            lobbyId={lobbyId}
            scenario={scenario}
            role={role}
            onNext={onNext}
          />
        )}
      </main>
    </div>
  );
}
