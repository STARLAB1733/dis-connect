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
          roundAnswers: {},
          finished: false,
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
      roundAnswers: {},
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
    <main className="min-h-dvh flex flex-col text-white p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-center tracking-wider text-[#FF6600] mb-2">
        LOBBY : <span className="font-mono font-normal">{lobbyId}</span>
      </h1>

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
            className="mt-4 px-5 py-2 text-sm text-[#94a3b8] border border-[#334155] rounded-lg hover:border-[#FF6600] hover:text-[#FF6600] transition"
          >
            Back to Home
          </button>
        </div>
      )}

      {/* Pre-game — join form for new players */}
      {userUid && !myPlayer && !gameStarted && (
        <div className="space-y-3 mb-12 mt-6">
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
            className="flex items-center mx-auto text-[#FF6600] uppercase tracking-wide text-lg underline underline-offset-6 hover:text-[#ff7a1a] hover:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
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
              <li key={p.uid} className="text-[#94a3b8] text-md">
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
            className="w-full border-2 border-[#334155] text-[#e2e8f0] placeholder:text-[#94a3b8]/60 bg-transparent py-2 px-4 rounded-lg text-center tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
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
    </main>
  );
}
