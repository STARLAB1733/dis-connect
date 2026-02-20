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
  ROLE_SUBTITLES,
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
  const [skipReady, setSkipReady] = useState(false);
  const [promoteReady, setPromoteReady] = useState(false);
  // Persists for the whole game session: once host has manually skipped once,
  // all future dropped players in subsequent chapters are skipped automatically.
  const hasEverSkippedRef = useRef(false);
  // Ref to always-current skipMissingPlayers so effects can call it without stale closure
  const doSkipRef = useRef<(() => Promise<void>) | null>(null);

  // ── Derive values safely (lobby may be null at hook time) ─────────────────
  const players = lobby?.players || [];
  const arcIdx = lobby?.arcIdx ?? 0;
  const chapterIdx = lobby?.chapterIdx ?? 0;
  const rotationIdx = lobby?.rotationIdx ?? 0;
  const chapterKey = `${arcIdx}-${chapterIdx}`;
  const myIdx = user ? players.findIndex(p => p.uid === user.uid) : -1;
  const roundAnswers = lobby?.roundAnswers || {};
  const iHaveAnswered = !!(user && (submittedForRef.current === chapterKey || roundAnswers[user.uid]));
  const isHost = players.length > 0 && players[0]?.uid === user?.uid;
  const allAnswered = players.length > 0 && allPlayersAnswered(roundAnswers, players.map(p => p.uid));
  // Only the second player in line gets the promote button
  const myIsNextHost = !isHost && players.length > 1 && players[1]?.uid === user?.uid;

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

  // Reset dropout timers whenever the chapter advances
  useEffect(() => {
    setSkipReady(false);
    setPromoteReady(false);
  }, [chapterKey]);

  // Skip timer: 30s on first dropout; instant on subsequent chapters if host already skipped once
  useEffect(() => {
    if (!iHaveAnswered || allAnswered) return;
    if (hasEverSkippedRef.current) {
      setSkipReady(true);
      return;
    }
    const t = setTimeout(() => setSkipReady(true), 30_000);
    return () => clearTimeout(t);
  }, [iHaveAnswered, allAnswered, chapterKey]);

  // Auto-execute skip when ready and host has skipped before (no button needed)
  useEffect(() => {
    if (!skipReady || !isHost || !hasEverSkippedRef.current) return;
    doSkipRef.current?.();
  }, [skipReady, isHost]);

  // Promote timer: 30s after all answered but host hasn't advanced
  useEffect(() => {
    if (!allAnswered || isHost) return;
    const t = setTimeout(() => setPromoteReady(true), 30_000);
    return () => clearTimeout(t);
  }, [allAnswered, isHost, chapterKey]);

  if (!lobby || !user) return <Spinner />;

  // Redirect guard in render path (belt-and-suspenders alongside onSnapshot)
  if (lobby.finished) return <Spinner />;

  const scenario = getScenario(arcIdx, chapterIdx);
  if (!scenario) return <Spinner />;

  // ── Spectator view: user arrived after game started ───────────────────────
  if (myIdx === -1) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 bg-[#0f172a]">
        <p className="text-[#FF6600] text-xs uppercase tracking-widest font-semibold">Spectating</p>
        <h1 className="text-xl font-bold text-[#e2e8f0] text-center">{scenario.title}</h1>
        <p className="text-sm text-[#94a3b8] text-center max-w-xs">{scenario.description}</p>
        <div className="flex gap-2 flex-wrap justify-center mt-2">
          {players.map(p => (
            <span key={p.uid} className="text-xs px-3 py-1 rounded-full bg-[#1e293b] text-[#94a3b8]">
              {p.name}
            </span>
          ))}
        </div>
        <p className="text-[#94a3b8] text-xs text-center mt-4 max-w-xs">
          You joined after the game started — watch only.
        </p>
      </div>
    );
  }

  // myIdx >= 0 is guaranteed past this point
  const myRole: RoleKey = lobby.currentRoles?.[user.uid]
    ?? getPlayerRole(myIdx, rotationIdx);

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

  // Host-only: mark pending players as answered to unblock the chapter
  const skipMissingPlayers = async () => {
    const pendingUids = players.map(p => p.uid).filter(uid => !roundAnswers[uid]);
    if (pendingUids.length === 0) return;
    const updates: Record<string, true> = {};
    pendingUids.forEach(uid => { updates[`roundAnswers.${uid}`] = true; });
    await updateDoc(doc(db, 'lobbies', lobbyId), updates);
    hasEverSkippedRef.current = true;
  };
  // Keep ref current so the auto-skip effect always calls the latest version
  doSkipRef.current = skipMissingPlayers;

  // Next-in-line only: reorder players so this user becomes the host
  const promoteToHost = async () => {
    const reordered = [
      players.find(p => p.uid === user.uid)!,
      ...players.filter(p => p.uid !== user.uid),
    ];
    await updateDoc(doc(db, 'lobbies', lobbyId), { players: reordered });
  };

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
          {promoteReady && myIsNextHost && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-[#94a3b8] text-xs text-center">Host appears to be offline.</p>
              <button
                onClick={promoteToHost}
                className="px-6 py-3 bg-[#1e293b] border border-[#FF6600] text-[#FF6600] rounded-lg text-sm font-semibold tracking-wider uppercase transition hover:bg-[#FF6600] hover:text-white"
              >
                Assume Command
              </button>
            </div>
          )}
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
        {skipReady && isHost && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-[#94a3b8] text-xs text-center">Some agents appear to be offline.</p>
            <button
              onClick={skipMissingPlayers}
              className="px-6 py-3 bg-[#1e293b] border border-[#334155] text-[#94a3b8] rounded-lg text-sm font-semibold tracking-wider uppercase transition hover:border-[#FF6600] hover:text-[#FF6600]"
            >
              Skip Offline Agents
            </button>
          </div>
        )}
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
              className={`px-2.5 py-1 rounded-full font-semibold transition flex flex-col items-center leading-tight
                ${myRole === rk ? 'bg-[#FF6600] text-white text-xs' : 'bg-[#1e293b] text-[#94a3b8] text-xs'}`}
            >
              {ROLE_LABELS[rk]}
              {myRole === rk && (
                <span className="text-[0.6rem] font-normal opacity-80">{ROLE_SUBTITLES[rk]}</span>
              )}
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
