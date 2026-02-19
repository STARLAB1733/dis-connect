'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import ScenarioWrapper from '@/components/ScenarioWrapper';
import { getScenario } from '@/lib/scenarioLoader';
import {
  ROLE_LABELS,
  ROLE_KEYS,
  NUM_ARCS,
  CHAPTERS_PER_ARC,
  getPlayerRole,
  allPlayersAnswered,
  nextChapterState,
  type RoleKey,
} from '@/lib/roleRotation';
import Image from 'next/image';

type LobbyData = {
  players: { uid: string; name: string }[];
  rotationIdx: number;
  chapterIdx: number;
  arcIdx?: number;
  currentRoles?: Record<string, RoleKey>;
  roundAnswers?: Record<string, boolean>;
  finished?: boolean;
  teamName?: string;
};

function Spinner() {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function GamePage() {
  const { lobbyId } = useParams() as { lobbyId: string };
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [lobby, setLobby] = useState<LobbyData | null>(null);
  const [answered, setAnswered] = useState(false);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!lobbyId) return;
    const ref = doc(db, 'lobbies', lobbyId);
    return onSnapshot(ref, snap => {
      const data = snap.data() as LobbyData | undefined;
      if (!data) return;
      setLobby(data);

      if (data.finished) {
        router.push(`/results/${lobbyId}`);
        return;
      }

      // When everyone has answered, host advances the round
      if (data.roundAnswers && data.players?.length > 0) {
        const uids = data.players.map(p => p.uid);
        if (allPlayersAnswered(data.roundAnswers, uids)) {
          // Reset answered state for next chapter
          setAnswered(false);
          setWaiting(false);
        }
      }
    });
  }, [lobbyId, router]);

  if (!lobby || !user) return <Spinner />;

  const players = lobby.players || [];
  const myIdx = players.findIndex(p => p.uid === user.uid);
  const arcIdx = lobby.arcIdx ?? 0;
  const chapterIdx = lobby.chapterIdx ?? 0;
  const rotationIdx = lobby.rotationIdx ?? 0;

  // Derive role from currentRoles map (set on game start) or compute from rotation
  const myRole: RoleKey = lobby.currentRoles?.[user.uid]
    ?? (myIdx >= 0 ? getPlayerRole(myIdx, rotationIdx) : 'software-engineer');

  const scenario = getScenario(arcIdx, chapterIdx);
  const roundAnswers = lobby.roundAnswers || {};
  const iHaveAnswered = answered || !!roundAnswers[user.uid];
  const isHost = players.length > 0 && players[0].uid === user.uid;

  const totalChapters = NUM_ARCS * CHAPTERS_PER_ARC;
  const completedChapters = arcIdx * CHAPTERS_PER_ARC + chapterIdx;
  const percent = Math.round((completedChapters / totalChapters) * 100);

  const allAnswered = players.length > 0 && allPlayersAnswered(roundAnswers, players.map(p => p.uid));

  // Advance to next chapter (host only, called after all answer)
  const advanceChapter = async () => {
    const next = nextChapterState(arcIdx, chapterIdx, rotationIdx);
    const ref = doc(db, 'lobbies', lobbyId);
    if (next.finished) {
      await updateDoc(ref, { finished: true, finishedAt: serverTimestamp(), roundAnswers: {} });
    } else {
      // Reassign roles based on new rotation
      const newRoles = Object.fromEntries(
        players.map((p, i) => [p.uid, ROLE_KEYS[(i + next.rotationIdx) % 3]])
      );
      await updateDoc(ref, {
        arcIdx: next.arcIdx,
        chapterIdx: next.chapterIdx,
        rotationIdx: next.rotationIdx,
        roundAnswers: {},
        currentRoles: newRoles,
      });
    }
  };

  const onNext = async () => {
    setAnswered(true);
    setWaiting(true);
    // Mark this player as answered
    await updateDoc(doc(db, 'lobbies', lobbyId), {
      [`roundAnswers.${user.uid}`]: true,
    });
  };

  if (!scenario) return <Spinner />;

  // Show waiting screen while waiting for others
  if (iHaveAnswered && !allAnswered) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 bg-[#0f172a]">
        <div className="w-12 h-12 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#94a3b8] text-center tracking-wider text-sm uppercase">
          Waiting for other agents to complete their tasks...
        </p>
        <div className="flex gap-2 flex-wrap justify-center">
          {players.map(p => (
            <span
              key={p.uid}
              className={`text-xs px-3 py-1 rounded-full ${
                roundAnswers[p.uid] ? 'bg-[#FF6600] text-white' : 'bg-[#1e293b] text-[#94a3b8]'
              }`}
            >
              {p.name}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // All answered — host can advance (others see standby)
  if (allAnswered && players.length > 0) {
    if (isHost) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 bg-[#0f172a]">
          <p className="text-[#e2e8f0] text-lg font-semibold tracking-wider">All agents reporting in.</p>
          <p className="text-[#94a3b8] text-sm text-center">
            {nextChapterState(arcIdx, chapterIdx, rotationIdx).finished
              ? 'Mission complete. Prepare final debrief.'
              : `Proceeding to Chapter ${chapterIdx + 2} of Arc ${arcIdx + 1}.`}
          </p>
          <button
            onClick={advanceChapter}
            className="px-8 py-4 bg-[#FF6600] hover:bg-[#e65a00] text-white rounded-lg tracking-wider uppercase font-semibold text-lg transition"
          >
            {nextChapterState(arcIdx, chapterIdx, rotationIdx).finished ? 'VIEW RESULTS' : 'NEXT CHAPTER →'}
          </button>
        </div>
      );
    } else {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 bg-[#0f172a]">
          <div className="w-12 h-12 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#94a3b8] text-center tracking-wider text-sm uppercase">
            Standby — awaiting briefing for next chapter...
          </p>
        </div>
      );
    }
  }

  const arcNames = ['NDP 2026', 'Exercise Northstar', 'Ops Resilience'];

  return (
    <div className="min-h-dvh flex flex-col bg-[#0f172a]">
      <main className="p-4 max-w-md mx-auto w-full">
        {/* Progress Bar */}
        <div className="mb-3">
          <div className="w-full bg-[#334155] h-1.5 rounded-full overflow-hidden">
            <div className="h-1.5 bg-[#FF6600] transition-[width] duration-500" style={{ width: `${percent}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-[#94a3b8]">{arcNames[arcIdx]} · Ch {chapterIdx + 1}/{CHAPTERS_PER_ARC}</span>
            <span className="text-xs text-[#94a3b8]">{percent}%</span>
          </div>
        </div>

        {/* Role pills */}
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {ROLE_KEYS.map(rk => (
            <span
              key={rk}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold transition
                ${myRole === rk ? 'bg-[#FF6600] text-white' : 'bg-[#1e293b] text-[#94a3b8]'}`}
            >
              {ROLE_LABELS[rk]}
            </span>
          ))}
        </div>

        {/* Chapter image */}
        {scenario.image && (
          <div className="w-full h-40 relative mb-4 rounded-lg overflow-hidden">
            <Image src={scenario.image} alt={scenario.title} fill style={{ objectFit: 'cover' }} priority />
          </div>
        )}

        {/* Scenario header */}
        <header className="bg-[#1e293b] border border-[#334155] rounded-lg p-3 mb-5 text-center">
          <h1 className="text-lg font-bold text-[#e2e8f0] pb-1">{scenario.title}</h1>
          <p className="text-sm text-[#94a3b8]">{scenario.description}</p>
        </header>

        {/* Scenario content */}
        <ScenarioWrapper
          lobbyId={lobbyId}
          scenario={scenario}
          role={myRole}
          onNext={onNext}
          arcIdx={arcIdx}
          chapterIdx={chapterIdx}
        />

        {/* Player status dots */}
        {waiting && (
          <div className="mt-4 flex gap-1.5 justify-center">
            {players.map(p => (
              <div
                key={p.uid}
                title={p.name}
                className={`w-2 h-2 rounded-full ${roundAnswers[p.uid] ? 'bg-[#FF6600]' : 'bg-[#334155]'}`}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
