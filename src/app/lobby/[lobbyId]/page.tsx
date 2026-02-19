'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, KeyboardEvent } from 'react';
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
import RoleCarousel, { RoleKey } from '@/components/RoleCarousel';
import Image from 'next/image';
import QRCode from 'react-qr-code';

type Player = { uid: string; name: string; role?: string };

const VALID_ROLES: RoleKey[] = ['software-engineer', 'data-scientist', 'cloud-engineer'];

const roleToSvg: Record<RoleKey, string> = {
  'software-engineer': '/roles/swe.svg',
  'data-scientist': '/roles/ds.svg',
  'cloud-engineer': '/roles/ce.svg',
};

const roleToLabel: Record<RoleKey, string> = {
  'software-engineer': 'Software Engineer',
  'data-scientist': 'Data & AI Engineer',
  'cloud-engineer': 'Cloud Platform Engineer',
};

function isRoleKey(r: string): r is RoleKey {
  return (VALID_ROLES as string[]).includes(r);
}

export default function LobbyPage() {
  const { lobbyId } = useParams() as { lobbyId: string };
  const router = useRouter();
  const [userUid, setUserUid] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [fullLobbyURL, setFullLobbyURL] = useState<string>('');

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setFullLobbyURL(`${window.location.origin}/lobby/${lobbyId}`);
    }
  }, [lobbyId]);

  useEffect(() => {
    return onAuthStateChanged(auth, user => {
      setUserUid(user?.uid || null);
    });
  }, []);

  useEffect(() => {
    if (!userUid) return;
    const ref = doc(db, 'lobbies', lobbyId);

    getDoc(ref).then(snap => {
      if (!snap.exists()) {
        setDoc(ref, {
          roundIdx: 0,
          roundAnswers: {},
          teamScore: 0,
          started: false,
          created: serverTimestamp(),
        }, { merge: true });
      }
    });

    const unsub = onSnapshot(ref, snap => {
      const data = snap.data() || {};
      setPlayers(data.players || []);
      const me = (data.players || []).find((p: Player) => p.uid === userUid) ?? null;
      setMyPlayer(me);

      if (data.started && !isStarting) {
        setIsStarting(true);
        setTimeout(() => router.push(`/game/${lobbyId}`), 50);
      }
    });

    return unsub;
  }, [lobbyId, router, userUid, isStarting]);

  const joinLobby = async () => {
    if (!name.trim() || !userUid) return;
    const ref = doc(db, 'lobbies', lobbyId);
    await updateDoc(ref, { players: arrayUnion({ uid: userUid, name: name.trim() }) });
  };

  const handleNameKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') joinLobby();
  };

  const pickRole = async (role: RoleKey) => {
    if (!myPlayer) return;
    const updated = players.map(p => p.uid === userUid ? { ...p, role } : p);
    const ref = doc(db, 'lobbies', lobbyId);
    await updateDoc(ref, { players: updated });
    if (updated.filter(p => p.role).length === 3) {
      await updateDoc(ref, { started: true, startTime: serverTimestamp() });
    }
  };

  const takenRoles: RoleKey[] = players
    .map(p => p.role)
    .filter((r): r is RoleKey => typeof r === 'string' && isRoleKey(r));

  if (isStarting) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
        <div className="w-14 h-14 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin mb-6" />
        <p className="text-white text-xl font-bold uppercase tracking-wider">Mission starting…</p>
        <p className="text-white/50 text-sm mt-2">Get ready</p>
      </div>
    );
  }

  const myRole = myPlayer?.role && isRoleKey(myPlayer.role) ? myPlayer.role : null;

  return (
    <main className="min-h-dvh flex flex-col bg-black text-white max-w-md mx-auto">

      {/* Top Banner */}
      <div className="bg-[#FF6600] px-6 pt-8 pb-6">
        <p className="text-xs uppercase tracking-widest text-white/70 mb-1 font-medium">DISConnect 2.0</p>
        <h1 className="text-3xl font-black tracking-tight">MISSION BRIEFING</h1>
        <p className="mt-2 text-white/80 text-sm leading-relaxed">
          A cyber incident has just been detected on a government network.
          Your team of 3 will work through 4 chapters to investigate, respond, and secure the breach.
        </p>
      </div>

      <div className="flex-1 px-6 py-6 space-y-6">

        {/* QR + Lobby Code */}
        {fullLobbyURL && (
          <section className="flex flex-col items-center space-y-3">
            <div className="bg-white p-3 rounded-xl">
              <QRCode value={fullLobbyURL} size={112} />
            </div>
            <div className="text-center">
              <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Lobby Code</p>
              <p className="text-2xl font-mono font-bold text-[#FF6600] tracking-widest">{lobbyId}</p>
            </div>
          </section>
        )}

        {/* Name Entry */}
        {userUid && !myPlayer && (
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-white/50 text-center">Enter your name to join</p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleNameKey}
              placeholder="Your name"
              maxLength={20}
              className="w-full border-2 border-[#FF6600] text-[#FF6600] placeholder:text-[#FF6600]/40 bg-transparent py-3 px-4 rounded-xl text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#FF6600]/50"
            />
            <button
              onClick={joinLobby}
              disabled={!name.trim()}
              className="w-full py-3 bg-[#FF6600] text-white font-bold rounded-xl uppercase tracking-wide text-lg hover:bg-[#e65a00] transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Join
            </button>
          </section>
        )}

        {/* Player Slots */}
        <section className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-white/50">Team ({players.length}/3)</p>
          {players.map((p) => {
            const r = p.role && isRoleKey(p.role) ? p.role : null;
            return (
              <div key={p.uid} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                <span className="font-semibold">{p.name}</span>
                <span className={`text-sm ${r ? 'text-[#FF6600]' : 'text-white/40'}`}>
                  {r ? roleToLabel[r] : 'Choosing…'}
                </span>
              </div>
            );
          })}
          {Array.from({ length: Math.max(0, 3 - players.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="flex items-center px-4 py-3 rounded-xl border border-dashed border-white/20">
              <span className="text-white/30 text-sm italic">Waiting for player…</span>
            </div>
          ))}
        </section>

        {/* Role Carousel */}
        {myPlayer && !myRole && (
          <section>
            <p className="text-xs uppercase tracking-widest text-white/50 mb-3 text-center">Pick your role</p>
            <RoleCarousel
              onConfirm={(chosenRole: RoleKey) => pickRole(chosenRole)}
              unavailableRoles={takenRoles}
            />
          </section>
        )}

        {/* Confirmed Role */}
        {myPlayer && myRole && (
          <section className="flex flex-col items-center space-y-3 py-4">
            <p className="text-xs uppercase tracking-widest text-white/50">You are playing as</p>
            <p className="text-xl font-bold text-[#FF6600]">{roleToLabel[myRole]}</p>
            <Image
              src={roleToSvg[myRole]}
              alt={roleToLabel[myRole]}
              width={160}
              height={160}
              className="w-40 h-40 object-contain"
            />
            <p className="text-white/50 text-sm text-center">Waiting for all 3 players to pick a role…</p>
          </section>
        )}

      </div>
    </main>
  );
}
