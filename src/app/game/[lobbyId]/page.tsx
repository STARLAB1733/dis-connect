'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { auth, db, initAuth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import ScenarioWrapper from '@/components/ScenarioWrapper';
import GroupQuestionPhase from '@/components/GroupQuestionPhase';
import { getScenario, getGroupScenario } from '@/lib/scenarioLoader';
import {
  ROLE_LABELS,
  ROLE_SUBTITLES,
  ROLE_KEYS,
  NUM_ARCS,
  CHAPTERS_PER_ARC,
  getPlayerRole,
  allPlayersAnswered,
  nextChapterState,
  isGroupPhaseRequired,
  getFacilitatorIdx,
  type RoleKey,
} from '@/lib/roleRotation';
import Image from 'next/image';
import { useAudio } from '@/components/AudioProvider';

const ARC_NAMES = ['NDP 2026', 'Exercise Northstar', 'Ops Resilience'];

type LobbyData = {
  players: { uid: string; name: string }[];
  rotationIdx: number;
  chapterIdx: number;
  arcIdx?: number;
  currentRoles?: Record<string, RoleKey>;
  roundAnswers?: Record<string, boolean>;
  finished?: boolean;
  teamName?: string;
  phase?: 'individual' | 'group';
  groupQuestionIdx?: number;
  groupWager?: number | null;
  groupWagerLocked?: boolean;
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
  // UIDs that have been explicitly skipped at least once — confirmed dropouts.
  // Only these players are auto-skipped in subsequent chapters; active players are never touched.
  const knownDropoutsRef = useRef<Set<string>>(new Set());
  // Ref to always-current skipMissingPlayers so effects can call it without stale closure
  const doSkipRef = useRef<(() => Promise<void>) | null>(null);

  // ── Derive values safely (lobby may be null at hook time) ─────────────────
  const players = useMemo(() => lobby?.players || [], [lobby]);
  const arcIdx = lobby?.arcIdx ?? 0;
  const chapterIdx = lobby?.chapterIdx ?? 0;
  const rotationIdx = lobby?.rotationIdx ?? 0;
  const chapterKey = `${arcIdx}-${chapterIdx}`;
  const myIdx = user ? players.findIndex(p => p.uid === user.uid) : -1;
  const roundAnswers = useMemo(() => lobby?.roundAnswers || {}, [lobby]);
  const iHaveAnswered = !!(user && (submittedForRef.current === chapterKey || roundAnswers[user.uid]));
  const isHost = players.length > 0 && players[0]?.uid === user?.uid;
  const allAnswered = players.length > 0 && allPlayersAnswered(roundAnswers, players.map(p => p.uid));
  // Only the second player in line gets the promote button
  const myIsNextHost = !isHost && players.length > 1 && players[1]?.uid === user?.uid;

  // Group phase helpers
  const phase = lobby?.phase ?? 'individual';
  const groupQuestionIdx = lobby?.groupQuestionIdx ?? 0;
  const groupScenario = phase === 'group' ? getGroupScenario(arcIdx) : null;
  const facilitatorIdx = players.length > 0 ? getFacilitatorIdx(arcIdx, players.length) : -1;
  const facilitatorUid = facilitatorIdx >= 0 ? players[facilitatorIdx]?.uid : '';
  const facilitatorName = facilitatorIdx >= 0 ? players[facilitatorIdx]?.name : '';

  // Ensure anonymous auth is initialised (handles direct deep-links to /game/*)
  useEffect(() => { initAuth(); }, []);

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

  // Skip timer: fires after this player has answered but others haven't.
  // Uses a 5s delay when the only pending players are confirmed dropouts (fast auto-advance),
  // otherwise 30s (gives active players time to answer before the host sees the skip button).
  useEffect(() => {
    if (!iHaveAnswered || allAnswered) return;
    const pendingUids = players.map(p => p.uid).filter(uid => !roundAnswers[uid]);
    const onlyKnownDropouts =
      pendingUids.length > 0 && pendingUids.every(uid => knownDropoutsRef.current.has(uid));
    const delay = onlyKnownDropouts ? 5_000 : 30_000;
    const t = setTimeout(() => setSkipReady(true), delay);
    return () => clearTimeout(t);
  }, [iHaveAnswered, allAnswered, chapterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-execute skip when skipReady AND every still-pending player is a confirmed dropout.
  // This ensures active players (who just haven't answered yet) are never force-skipped.
  useEffect(() => {
    if (!skipReady || !isHost) return;
    const pendingUids = players.map(p => p.uid).filter(uid => !roundAnswers[uid]);
    const onlyKnownDropouts =
      pendingUids.length > 0 && pendingUids.every(uid => knownDropoutsRef.current.has(uid));
    if (onlyKnownDropouts) doSkipRef.current?.();
  }, [skipReady, isHost, players, roundAnswers]);

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

  // ── Lobby code badge — shown on every screen for easy reconnection ───────
  const LobbyCode = () => (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
      <p className="text-xs text-[#475569] uppercase tracking-widest text-center mb-0.5">Session code</p>
      <p className="font-mono text-xs text-[#64748b] bg-[#1e293b] border border-[#334155] px-3 py-1 rounded-md tracking-widest">
        {lobbyId}
      </p>
    </div>
  );

  // ── Spectator view: user arrived after game started ───────────────────────
  if (myIdx === -1) {
    return (
      <div className="relative min-h-dvh flex flex-col items-center justify-center gap-4 p-6 bg-[#0f172a]">
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
        <LobbyCode />
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

      // Check if we need to enter group phase (end of arc, 2+ players)
      const enterGroupPhase =
        chapterIdx === CHAPTERS_PER_ARC - 1 &&
        isGroupPhaseRequired(players.length);

      if (enterGroupPhase) {
        await updateDoc(ref, {
          arcIdx: next.arcIdx,
          chapterIdx: next.chapterIdx,
          rotationIdx: next.rotationIdx,
          roundAnswers: {},
          currentRoles: newRoles,
          phase: 'group',
          groupQuestionIdx: 0,
          groupWager: null,
          groupWagerLocked: false,
        });
      } else {
        await updateDoc(ref, {
          arcIdx: next.arcIdx,
          chapterIdx: next.chapterIdx,
          rotationIdx: next.rotationIdx,
          roundAnswers: {},
          currentRoles: newRoles,
          phase: 'individual',
        });
      }
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

  // Host-only: mark pending players as answered to unblock the chapter,
  // and record their UIDs as confirmed dropouts so subsequent chapters auto-skip them.
  const skipMissingPlayers = async () => {
    const pendingUids = players.map(p => p.uid).filter(uid => !roundAnswers[uid]);
    if (pendingUids.length === 0) return;
    const updates: Record<string, true> = {};
    pendingUids.forEach(uid => {
      updates[`roundAnswers.${uid}`] = true;
      knownDropoutsRef.current.add(uid);
    });
    await updateDoc(doc(db, 'lobbies', lobbyId), updates);
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

  // ── Group question phase ──────────────────────────────────────────────────
  if (phase === 'group' && groupScenario && groupQuestionIdx < groupScenario.questions.length) {
    const currentGroupQuestion = groupScenario.questions[groupQuestionIdx];

    const handleAdvanceGroupQuestion = async () => {
      if (!isHost) return;
      const nextGroupQuestionIdx = groupQuestionIdx + 1;
      const ref = doc(db, 'lobbies', lobbyId);

      if (nextGroupQuestionIdx < groupScenario.questions.length) {
        // More group questions in this arc
        await updateDoc(ref, {
          groupQuestionIdx: nextGroupQuestionIdx,
          groupWager: null,
          groupWagerLocked: false,
        });
      } else {
        // Done with group questions, advance to next arc or finish
        const next = nextChapterState(arcIdx, chapterIdx, rotationIdx);
        const newRoles = Object.fromEntries(
          players.map((p, i) => [p.uid, ROLE_KEYS[(i + next.rotationIdx) % 3]])
        );

        if (next.finished) {
          playSfx('complete');
          await updateDoc(ref, {
            finished: true,
            finishedAt: serverTimestamp(),
            roundAnswers: {},
          });
        } else {
          playSfx('advance');
          await updateDoc(ref, {
            arcIdx: next.arcIdx,
            chapterIdx: next.chapterIdx,
            rotationIdx: next.rotationIdx,
            roundAnswers: {},
            currentRoles: newRoles,
            phase: 'individual',
            groupQuestionIdx: 0,
            groupWager: null,
            groupWagerLocked: false,
          });
        }
      }
    };

    return (
      <GroupQuestionPhase
        lobbyId={lobbyId}
        groupQuestion={currentGroupQuestion}
        arcIdx={arcIdx}
        groupQuestionIdx={groupQuestionIdx}
        facilitatorUid={facilitatorUid}
        facilitatorName={facilitatorName}
        players={players}
        onNext={handleAdvanceGroupQuestion}
      />
    );
  }

  // ── All players answered → show advance screen ──────────────────────────
  if (allAnswered) {
    if (isHost) {
      const next = nextChapterState(arcIdx, chapterIdx, rotationIdx);
      const isArcEnd = chapterIdx === CHAPTERS_PER_ARC - 1;
      const willEnterGroupPhase = isArcEnd && isGroupPhaseRequired(players.length);

      return (
        <div className="relative min-h-dvh flex flex-col items-center justify-center gap-6 p-6 pb-16 bg-[#0f172a]">
          <div className="text-[#FF6600] text-4xl">✓</div>
          <p className="text-[#e2e8f0] text-lg font-semibold tracking-wider text-center">
            All guardians reporting in.
          </p>
          <p className="text-[#94a3b8] text-sm text-center">
            {next.finished
              ? 'All 12 chapters complete. Prepare final debrief.'
              : `Arc ${arcIdx + 1} · Chapter ${chapterIdx + 1} complete.`}
          </p>

          {/* Group phase preparation message */}
          {willEnterGroupPhase && (
            <div className="bg-[#1e293b] border border-[#FF6600]/50 rounded-lg p-4 w-full max-w-md">
              <p className="text-[#FF6600] text-sm font-semibold mb-1">Next: Group Question Phase</p>
              <p className="text-[#cbd5e1] text-xs leading-relaxed">
                Prepare to discuss as a team. {players.find(p => p.uid === players[getFacilitatorIdx(arcIdx + 1, players.length)]?.uid)?.name || 'A facilitator'} will lead the discussion and make strategic decisions.
              </p>
            </div>
          )}

          <button
            onClick={advanceChapter}
            className="px-8 py-4 bg-[#FF6600] hover:bg-[#e65a00] text-white rounded-lg tracking-wider uppercase font-semibold text-lg transition"
          >
            {next.finished ? 'VIEW RESULTS →' : 'NEXT CHAPTER →'}
          </button>
          <LobbyCode />
        </div>
      );
    } else {
      return (
        <div className="relative min-h-dvh flex flex-col items-center justify-center gap-6 p-6 pb-16 bg-[#0f172a]">
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
          <LobbyCode />
        </div>
      );
    }
  }

  // ── This player answered, waiting for others ─────────────────────────────
  if (iHaveAnswered) {
    return (
      <div className="relative min-h-dvh flex flex-col items-center justify-center gap-6 p-6 pb-16 bg-[#0f172a]">
        <div className="w-12 h-12 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#94a3b8] text-center tracking-wider text-sm uppercase">
          Waiting for other guardians...
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
            <p className="text-[#94a3b8] text-xs text-center">Some guardians appear to be offline.</p>
            <button
              onClick={skipMissingPlayers}
              className="px-6 py-3 bg-[#1e293b] border border-[#334155] text-[#94a3b8] rounded-lg text-sm font-semibold tracking-wider uppercase transition hover:border-[#FF6600] hover:text-[#FF6600]"
            >
              Skip Offline Guardians
            </button>
          </div>
        )}
        <LobbyCode />
      </div>
    );
  }

  // ── Active scenario ───────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh flex flex-col bg-[#0f172a]">
      <main className="p-4 page-container w-full">
        {/* Progress bar */}
        <div className="mb-3">
          <div className="w-full bg-[#334155] h-1.5 rounded-full overflow-hidden">
            <div className="h-1.5 bg-[#FF6600] transition-[width] duration-500" style={{ width: `${percent}%` }} />
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-[#94a3b8]">{ARC_NAMES[arcIdx]} · Ch {chapterIdx + 1}/{CHAPTERS_PER_ARC}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#475569] bg-[#1e293b] border border-[#334155] px-2 py-0.5 rounded tracking-widest">{lobbyId}</span>
              <span className="text-xs text-[#94a3b8]">{percent}%</span>
            </div>
          </div>
        </div>

        {/* Role pills */}
        <div className="flex gap-1.5 mb-4 flex-wrap game-role-pills">
          {ROLE_KEYS.map(rk => (
            <span
              key={rk}
              className={`px-2.5 py-1 rounded-full font-semibold transition flex flex-col items-center leading-tight game-role-pill
                ${myRole === rk ? 'bg-[#FF6600] text-white text-xs' : 'bg-[#1e293b] text-[#94a3b8] text-xs'}`}
            >
              {ROLE_LABELS[rk]}
              <span className="text-[0.65rem] font-normal opacity-80">{ROLE_SUBTITLES[rk]}</span>
            </span>
          ))}
        </div>

        {/* Chapter image */}
        {scenario.image && (
          <div className="w-full h-32 sm:h-40 relative mb-4 rounded-lg overflow-hidden game-chapter-image">
            <Image src={scenario.image} alt={scenario.title} fill sizes="(max-width: 768px) 100vw, 56rem" style={{ objectFit: 'cover' }} priority />
          </div>
        )}

        {scenario.storyContext && (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 mb-4 text-center">
            <p className="text-sm text-[#cbd5e1] italic leading-relaxed">{scenario.storyContext}</p>
          </div>
        )}

        {/* Scenario header */}
        <header className="bg-[#1e293b] border border-[#334155] rounded-lg p-3 mb-5 text-center game-header">
          <h1 className="text-lg font-bold text-[#e2e8f0] pb-1">{scenario.title}</h1>
          <p className="text-sm text-[#94a3b8]">{scenario.description}</p>
        </header>

        {/* Scenario content */}
        <div className="scenario-wrapper">
          <ScenarioWrapper
            lobbyId={lobbyId}
            scenario={scenario}
            role={myRole}
            onNext={onNext}
            arcIdx={arcIdx}
            chapterIdx={chapterIdx}
          />
        </div>
      </main>
    </div>
  );
}
