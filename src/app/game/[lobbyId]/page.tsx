'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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
import { useAudio } from '@/components/AudioProvider';

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
  // Track the chapter key we last submitted an answer for, to detect genuine new chapters
  const submittedForRef = useRef<string | null>(null);
  const { switchBgm, playSfx } = useAudio();

  // Switch to game BGM on mount, back to lobby on unmount
  useEffect(() => {
    switchBgm('game');
    return () => switchBgm('lobby');
  }, [switchBgm]);

  useEffect(() => {
    if (!lobbyId) return;
    const ref = doc(db, 'lobbies', lobbyId);
    return onSnapshot(ref, snap => {
      const data = snap.data() as LobbyData | undefined;
      if (!data) return;
      setLobby(data);
      if (data.finished) {
        router.push(`/results/${lobbyId}`);
      }
    });
  }, [lobbyId, router]);

  if (!lobby || !user) return <Spinner />;

  const players = lobby.players || [];
  const myIdx = players.findIndex(p => p.uid === user.uid);
  const arcIdx = lobby.arcIdx ?? 0;
  const chapterIdx = lobby.chapterIdx ?? 0;
  const rotationIdx = lobby.rotationIdx ?? 0;

  const myRole: RoleKey = lobby.currentRoles?.[user.uid]
    ?? (myIdx >= 0 ? getPlayerRole(myIdx, rotationIdx) : 'software-engineer');

  const scenario = getScenario(arcIdx, chapterIdx);
  const roundAnswers = lobby.roundAnswers || {};

  // A unique key for this chapter — used to detect when Firestore advances to a new chapter
  const chapterKey = `${arcIdx}-${chapterIdx}`;
  // I have answered this chapter if I submitted for this exact chapterKey OR if Firestore shows my answer
  const iHaveAnswered = submittedForRef.current === chapterKey || !!roundAnswers[user.uid];

  const isHost = players.length > 0 && players[0].uid === user.uid;
  const allAnswered = players.length > 0 && allPlayersAnswered(roundAnswers, players.map(p => p.uid));

  const totalChapters = NUM_ARCS * CHAPTERS_PER_ARC;
  const completedChapters = arcIdx * CHAPTERS_PER_ARC + chapterIdx;
  const percent = Math.round((completedChapters / totalChapters) * 100);

  const advanceChapter = async () => {
    const next = nextChapterState(arcIdx, chapterIdx, rotationIdx);
    const ref = doc(db, 'lobbies', lobbyId);
    if (next.finished) {
      playSfx('complete');
      await updateDoc(ref, { finished: true, finishedAt: serverTimestamp(), roundAnswers: {} });
    } else {
      playSfx('advance');
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
      // Clear our local submission record so next chapter renders the scenario
      submittedForRef.current = null;
    }
  };

  const onNext = async () => {
    playSfx('success');
    // Record that we submitted for this specific chapter
    submittedForRef.current = chapterKey;
    await updateDoc(doc(db, 'lobbies', lobbyId), {
      [`roundAnswers.${user.uid}`]: true,
    });
  };

  if (!scenario) return <Spinner />;

  // ── All players answered → show advance screen ──────────────────────────
  if (allAnswered) {
    if (isHost) {
      const next = nextChapterState(arcIdx, chapterIdx, rotationIdx);
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 bg-[#0f172a]">
          <div className="text-[#FF6600] text-4xl">✓</div>
          <p className="text-[#e2e8f0] text-lg font-semibold tracking-wider text-center">
            All agents reporting in.
          </p>
          <p className="text-[#94a3b8] text-sm text-center">
            {next.finished
              ? 'All 12 chapters complete. Prepare final debrief.'
              : `Arc ${arcIdx + 1} · Chapter ${chapterIdx + 1} complete.`}
          </p>
          <button
            onClick={advanceChapter}
            className="px-8 py-4 bg-[#FF6600] hover:bg-[#e65a00] text-white rounded-lg tracking-wider uppercase font-semibold text-lg transition"
          >
            {next.finished ? 'VIEW RESULTS →' : 'NEXT CHAPTER →'}
          </button>
        </div>
      );
    } else {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 bg-[#0f172a]">
          <div className="w-12 h-12 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#94a3b8] text-center tracking-wider text-sm uppercase">
            Standby — awaiting next briefing...
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            {players.map(p => (
              <span key={p.uid} className="text-xs px-3 py-1 rounded-full bg-[#FF6600] text-white">
                {p.name}
              </span>
            ))}
          </div>
        </div>
      );
    }
  }

  // ── This player answered, waiting for others ─────────────────────────────
  if (iHaveAnswered) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 bg-[#0f172a]">
        <div className="w-12 h-12 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#94a3b8] text-center tracking-wider text-sm uppercase">
          Waiting for other agents...
        </p>
        <div className="flex gap-2 flex-wrap justify-center">
          {players.map(p => (
            <span
              key={p.uid}
              className={`text-xs px-3 py-1 rounded-full transition ${
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

  // ── Active scenario ───────────────────────────────────────────────────────
  const arcNames = ['NDP 2026', 'Exercise Northstar', 'Ops Resilience'];

  return (
    <div className="min-h-dvh flex flex-col bg-[#0f172a]">
      <main className="p-4 max-w-md mx-auto w-full">
        {/* Progress bar */}
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
      </main>
    </div>
  );
}
