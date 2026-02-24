'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { initAuth, auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import QRCode from 'react-qr-code';

type Player = { uid: string; name: string };

export default function LobbyPage() {
  const { lobbyId } = useParams() as { lobbyId: string };
  const router = useRouter();
  const [userUid, setUserUid] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [fullLobbyURL, setFullLobbyURL] = useState<string>('');
  const [lobbyTeamName, setLobbyTeamName] = useState<string | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setFullLobbyURL(`${window.location.origin}/lobby/${lobbyId}`);
    }
  }, [lobbyId]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => setUserUid(user?.uid || null));
    return unsub;
  }, []);

  useEffect(() => {
    if (!userUid) return;
    const ref = doc(db, 'lobbies', lobbyId);

    getDoc(ref).then(snap => {
      if (!snap.exists()) {
        setDoc(ref, {
          started: false,
          players: [],
          rotationIdx: 0,
          chapterIdx: 0,
          arcIdx: 0,
          roundAnswers: {},
          finished: false,
          phase: 'individual',
          groupQuestionIdx: 0,
          groupWager: null,
          groupWagerLocked: false,
          created: serverTimestamp()
        }, { merge: true });
      }
    });

    const unsub = onSnapshot(ref, snap => {
      const data = snap.data() || {};
      setPlayers(data.players || []);
      if (data.teamName) setLobbyTeamName(data.teamName);
      const me = (data.players || []).find((p: Player) => p.uid === userUid) ?? null;
      setMyPlayer(me);
      setGameStarted(!!data.started);

      if (data.started && !isStarting) {
        setIsStarting(true);
        // Redirect returning players immediately; new visitors become spectators
        setTimeout(() => router.push(`/game/${lobbyId}`), 50);
      }
    });

    return unsub;
  }, [lobbyId, router, userUid, isStarting]);

  const joinLobby = async () => {
    if (!name || !userUid) return;
    await updateDoc(doc(db, 'lobbies', lobbyId), { players: arrayUnion({ uid: userUid, name }) });
  };

  const startGame = async () => {
    if (players.length === 0) return;
    const ROLES = ['software-engineer', 'data-scientist', 'cloud-engineer'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {
      started: true,
      rotationIdx: 0,
      chapterIdx: 0,
      arcIdx: 0,
      roundAnswers: {},
      phase: 'individual',
      groupQuestionIdx: 0,
      groupWager: null,
      groupWagerLocked: false,
      currentRoles: Object.fromEntries(players.map((p, i) => [p.uid, ROLES[i % 3]])),
      startTime: serverTimestamp()
    };
    if (teamName.trim()) updates.teamName = teamName.trim();
    await updateDoc(doc(db, 'lobbies', lobbyId), updates);
  };

  const isHost = players.length > 0 && players[0]?.uid === userUid;

  if (isStarting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-white text-lg tracking-wider">DEPLOYING...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col text-white p-4 sm:p-6 page-container">
      <h1 className="text-2xl font-semibold text-center tracking-wider text-[#FF6600] mb-2">
        LOBBY : <span className="font-mono font-normal">{lobbyId}</span>
      </h1>

      {/* Game Description */}
      <div className="bg-[#1e293b]/50 border border-[#334155] rounded-lg p-4 mb-4 text-center">
        <p className="text-sm text-[#e2e8f0] leading-relaxed">
          Ready, Guardians? You&apos;ve got 12 chapters to solve crises, rotate roles, and figure out which tech vocation fits you best.
        </p>
        <button
          onClick={() => setShowHowToPlay(true)}
          className="mt-3 text-xs text-[#FF6600] hover:text-[#ff7a1a] uppercase tracking-widest font-semibold underline underline-offset-2"
        >
          How to Play →
        </button>
      </div>

      {lobbyTeamName && (
        <p className="text-center text-[#94a3b8] text-sm tracking-widest mb-4">
          TEAM: <span className="text-[#e2e8f0] font-semibold">{lobbyTeamName}</span>
        </p>
      )}

      {fullLobbyURL && (
        <div className="flex flex-col items-center mb-6">
          <p className="mb-2 tracking-wider text-[#FF6600] text-xs font-medium">Scan to join</p>
          <div className="bg-white p-2 rounded-md">
            <QRCode value={fullLobbyURL} size={128} />
          </div>
        </div>
      )}

      {!userUid && <p className="italic text-[#94a3b8] text-center">Initializing...</p>}

      {/* Game in progress — reconnecting player (known UID) */}
      {userUid && myPlayer && gameStarted && (
        <div className="flex flex-col items-center gap-3 mt-8 text-center">
          <div className="w-8 h-8 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#FF6600] text-sm uppercase tracking-widest font-semibold">Reconnecting...</p>
          <p className="text-[#94a3b8] text-xs">Returning you to the active session.</p>
        </div>
      )}

      {/* Game in progress — unknown player, block new joins */}
      {userUid && !myPlayer && gameStarted && (
        <div className="mt-8 text-center space-y-2 border border-[#334155] rounded-xl p-6">
          <p className="text-[#FF6600] font-semibold uppercase tracking-widest text-sm">Game in Progress</p>
          <p className="text-[#94a3b8] text-sm leading-relaxed">
            This session has already started. New players cannot join mid-game.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-5 py-3 text-sm text-[#94a3b8] border border-[#334155] rounded-lg hover:border-[#FF6600] hover:text-[#FF6600] transition"
          >
            Back to Home
          </button>
        </div>
      )}

      {/* Pre-game — join form for new players */}
      {userUid && !myPlayer && !gameStarted && (
        <div className="space-y-3 mb-6 sm:mb-12 mt-6">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="YOUR NAME"
            className="w-full border-2 border-[#FF6600] text-[#FF6600] placeholder:text-[#FF6600]/50 bg-transparent py-3 px-4 rounded-lg text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
          />
          <button
            onClick={joinLobby}
            disabled={!name.trim()}
            className="flex items-center mx-auto py-3 px-6 text-[#FF6600] uppercase tracking-wide text-lg underline underline-offset-6 hover:text-[#ff7a1a] hover:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
          >
            &gt;&gt; JOIN &gt;&gt;
          </button>
        </div>
      )}

      {myPlayer && !gameStarted && (
        <div className="w-full mt-4">
          <div className="border-y border-[#334155] py-1 border-y-2">
            <h2 className="flex justify-center tracking-wider text-[#94a3b8]">
              <span className="font-semibold">PLAYERS ({players.length})</span>
            </h2>
          </div>
          <ul className="mt-2 space-y-2 text-center">
            {players.map((p, idx) => (
              <li key={p.uid} className="text-[#94a3b8] text-base">
                {p.name}
                {idx === 0 && <span className="text-[#FF6600] text-xs ml-2">(HOST)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {myPlayer && isHost && !gameStarted && (
        <div className="w-full mt-8 flex flex-col items-center space-y-4">
          <input
            type="text"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            placeholder="Team name (optional)"
            className="w-full border-2 border-[#334155] text-[#e2e8f0] placeholder:text-[#94a3b8]/60 bg-transparent py-3 px-4 rounded-lg text-center tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
          />
          <button
            onClick={startGame}
            className="w-full px-6 py-4 bg-[#FF6600] hover:bg-[#e65a00] hover:cursor-pointer text-white rounded-lg tracking-wider uppercase transition duration-200 text-xl font-semibold"
          >
            START GAME
          </button>
        </div>
      )}

      {myPlayer && !isHost && !gameStarted && (
        <div className="mt-8 text-center">
          <p className="text-[#94a3b8] uppercase tracking-wider text-sm">Waiting for host to start...</p>
        </div>
      )}

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#0f172a] border-2 border-[#FF6600] rounded-lg max-h-[90vh] overflow-y-auto w-full max-w-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-[#0f172a] border-b border-[#334155] px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-[#FF6600] tracking-wider">HOW TO PLAY</h2>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="p-2 text-[#94a3b8] hover:text-[#FF6600] text-2xl font-light"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-6 text-[#e2e8f0] text-sm leading-relaxed">
              <section>
                <h3 className="text-[#FF6600] font-semibold text-base mb-2">🎮 THE GAME</h3>
                <p className="text-[#94a3b8]">
                  Work together as a team of Guardians through 12 scenarios spanning 3 arcs:
                </p>
                <ul className="mt-2 space-y-1 text-[#94a3b8] text-xs ml-4">
                  <li>• Arc 1: NDP 2026 (a parade app crisis)</li>
                  <li>• Arc 2: Exercise Northstar (military command systems)</li>
                  <li>• Arc 3: Ops Resilience (critical infrastructure under attack)</li>
                </ul>
                <p className="text-[#94a3b8] mt-2 text-xs">
                  Each chapter, you answer one question based on YOUR current role.
                </p>
              </section>

              <section>
                <h3 className="text-[#FF6600] font-semibold text-base mb-2">👥 YOUR ROLES (rotate every 4 chapters)</h3>
                <ul className="space-y-2 text-[#94a3b8] text-xs">
                  <li><strong className="text-[#e2e8f0]">Software Engineer:</strong> System design, performance, architecture</li>
                  <li><strong className="text-[#e2e8f0]">Data Scientist:</strong> Predictions, analysis, pattern recognition</li>
                  <li><strong className="text-[#e2e8f0]">Cloud Engineer:</strong> Infrastructure, scaling, resilience</li>
                </ul>
                <p className="text-[#94a3b8] mt-2 text-xs">
                  Everyone plays their role at the same time. All Guardians must answer before moving to the next chapter.
                </p>
              </section>

              <section>
                <h3 className="text-[#FF6600] font-semibold text-base mb-2">💡 HOW TO ANSWER</h3>
                <p className="text-[#94a3b8] text-xs leading-relaxed">
                  Answer the question. Better answers = stronger impact. Using a hint reduces your impact by 30%.
                </p>
              </section>

              <section>
                <h3 className="text-[#FF6600] font-semibold text-base mb-2">⭐ YOUR SCORE</h3>
                <p className="text-[#94a3b8] text-xs font-semibold">PERSONA (Who you are):</p>
                <p className="text-[#94a3b8] text-xs mt-1">
                  Your choices build 8 axes that define your unique Guardian archetype.
                </p>
                <p className="text-[#94a3b8] text-xs font-semibold mt-3">VOCATION (What you do best):</p>
                <p className="text-[#94a3b8] text-xs mt-1">
                  Your strongest role becomes your recommended vocation.
                </p>
              </section>

              <section>
                <h3 className="text-[#FF6600] font-semibold text-base mb-2">🏁 AFTER THE GAME</h3>
                <p className="text-[#94a3b8] text-xs">
                  See your persona archetype, recommended vocation, your team&apos;s scores, and where you rank on the global leaderboard.
                </p>
              </section>
            </div>

            {/* Footer */}
            <div className="border-t border-[#334155] px-6 py-4 bg-[#1e293b]/30">
              <button
                onClick={() => setShowHowToPlay(false)}
                className="w-full px-4 py-3 bg-[#FF6600] hover:bg-[#e65a00] text-white rounded-lg font-semibold text-sm tracking-wider transition"
              >
                GOT IT
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
