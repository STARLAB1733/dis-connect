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
import RoleCarousel, { RoleKey } from '@/components/RoleCarousel';
import Image from 'next/image'
import QRCode from 'react-qr-code';

type Player = { uid: string; name: string; role?: string };

export default function LobbyPage() {
  const { lobbyId } = useParams() as { lobbyId: string };
  const router = useRouter();
  const [userUid, setUserUid] = useState<string|null>(null);
  const [name, setName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayer, setMyPlayer] = useState<Player|null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [fullLobbyURL, setFullLobbyURL] = useState<string>('');

  // 1. Init Firebase auth
  useEffect(() => { initAuth(); }, []);

  // 2. Grab `window.location.origin` on the client, so we can build the QR code.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setFullLobbyURL(`${origin}/lobby/${lobbyId}`);
    }
  }, [lobbyId]);

  // 3. Listen for anonymous auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setUserUid(user?.uid || null);
    });
    return unsub;
  }, []);

  // 4. Create & listen lobby doc
  useEffect(() => {
    if (!userUid) return;
    const ref = doc(db, 'lobbies', lobbyId);

    // Check if it already exists
    getDoc(ref).then(snap => {
        if (!snap.exists()) {
        // Only on first creation, set the defaults:
        setDoc(ref, {
            // don't set players here, so it starts undefined
            currentIdx: 0,
            started: false,
            created: serverTimestamp()
        },
        { merge: true } // (merge: true) ensures we don't clobber anything if it already exists
      );
    }
  });

  // Then subscribe to changes
  const unsub = onSnapshot(ref, snap => {
    const data = snap.data() || {};
    setPlayers(data.players || []);
    const me = (data.players || []).find((p: Player) => p.uid === userUid) ?? null;
    setMyPlayer(me);

    // If Firestore says `started: true`, show overlay and then navigate:
    if (data.started && !isStarting) {
      setIsStarting(true);
      // Give React a moment to show the overlay, then navigate:
      setTimeout(() => {
        router.push(`/game/${lobbyId}`);
      }, 50);
    }
  });

  return unsub;
}, [lobbyId, router, userUid, isStarting]);

  // 5. Join with name
  const joinLobby = async () => {
    if (!name || !userUid) return;
    const ref = doc(db, 'lobbies', lobbyId);
    await updateDoc(ref, {
      players: arrayUnion({ uid: userUid, name })
    });
  };

  // 6. Pick a role
  const pickRole = async (role: string) => {
    if (!myPlayer) return;
    const updated = players.map(p =>
      p.uid === userUid ? { ...p, role } : p
    );
    const ref = doc(db, 'lobbies', lobbyId);
    await updateDoc(ref, { players: updated });
    // if all 3 have roles, start the game
    if (updated.filter(p => p.role).length === 3) {
      await updateDoc(ref, { started: true, startTime: serverTimestamp() });
    }
  };

  // Compute which roles have already been picked
  const takenRoles: RoleKey[] = players
  .map((p) => p.role)
  .filter((r): r is RoleKey => typeof r === 'string');

  const roleToSvg: Record<RoleKey, string> = {
    'software-engineer': '/roles/swe.svg',
    'data-scientist': '/roles/ds.svg',
    'cloud-engineer': '/roles/ce.svg'
  };

  const roleToLabel: Record<RoleKey, string> = {
    'software-engineer': 'Software Engineer',
    'data-scientist': 'Data Science / AI Engineer',
    'cloud-engineer': 'Cloud Engineer'
  };

  // If we’re in the “just switched to started” phase, render a full‐screen overlay:
  if (isStarting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="flex flex-col items-center">
          <div
            className="
              w-12 h-12
              border-4 border-[#FF6600]
              border-t-transparent
              rounded-full
              animate-spin
            "
          />
          <p className="mt-4 text-white text-lg">Starting game…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col text-white p-6 max-w-md mx-auto">
      {/* -------------------------------------
           Lobby header
         ------------------------------------- */}
      <h1 className="text-2xl font-semibold text-center tracking-wider text-[#FF6600]">
        LOBBY : <span className="font-mono font-normal">{lobbyId}</span>
      </h1>

      {/* -------------------------------------
        QR CODE: show only once the lobby exists (i.e. after the onSnapshot has run once)
      ------------------------------------- */}
      {fullLobbyURL && (
        <div className="flex flex-col items-center mb-6">
          <p className="mb-2 tracking-wider text-[#FF6600] text-xs font-medium">
            Scan to join this lobby
          </p>
          <div className="bg-white p-2 rounded-md">
            <QRCode value={fullLobbyURL} size={128} />
          </div>
        </div>
      )}

      {!userUid && (
        <p className="italic text-gray-500 text-center ">Initializing…</p>
      )}

      {/* -------------------------------------
           If user has not joined, show name input
         ------------------------------------- */}
      {userUid && !myPlayer && (
        <div className="space-y-3 mb-12 mt-6">
          <input
            type="text"
            value={name}
            onChange={e=>setName(e.target.value)}
            placeholder="YOUR NAME"
            className="
              w-full
              border-2
              border-[#FF6600]
              text-[#FF6600]
              placeholder:text-[#FF6600]/50
              bg-transparent
              py-3 px-4
              rounded-lg
              text-center
              tracking-widest
              focus:outline-none 
              focus:ring-2 
              focus:ring-[#FF6600]
            "
          />
          <button
            onClick={joinLobby}
            className="
              flex 
              items-center
              mx-auto
              text-[#FF6600]
              uppercase tracking-wide
              text-lg
              underline underline-offset-6
              hover:text-[#ff7a1a]
              hover:cursor-pointer
              disabled:opacity-40 disabled:cursor-not-allowed
              font-semibold
            "
            disabled={!name.trim()}
          >
            &gt;&gt; JOIN &gt;&gt;
          </button>
        </div>
      )}

      {/* -------------------------------------
           Player list (always show exactly 3 slots)
           Only show “Player list” if the user hasn't joined yet OR has already chosen a role
         ------------------------------------- */}
      {( !myPlayer || myPlayer.role ) && (
        <div className="w-full">
          <div className="border-y border-gray-700 py-1 border-y-2">
            <h2 className="flex justify-center tracking-wider text-gray-400">
              <span className="font-semibold">PLAYERS</span>
            </h2>
          </div>

          <ul className="mt-2 space-y-2 text-center">
            {players.map((p) => (
              <li key={p.uid} className="text-gray-400 text-md">
                {p.name}{' '}
                {p.role && <em>({p.role.replace('-', ' ')})</em>}
              </li>
            ))}
            {Array.from({ length: Math.max(0, 3 - players.length) }).map((_, idx) => (
              <li key={`waiting-${idx}`} className="text-gray-500 italic">
                Waiting for player…
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* -------------------------------------
           If current user has not yet chosen a role, show the carousel
         ------------------------------------- */}
      {myPlayer && !myPlayer.role && (
        <div className="w-full">
          <RoleCarousel 
            onConfirm={(chosenRole: RoleKey) => pickRole(chosenRole)}
            unavailableRoles={takenRoles}
          />
        </div>
      )}

      {/* -------------------------------------
           As soon as the current user has confirmed role, show that user's SVG *below* the player list
         ------------------------------------- */}
      {myPlayer && myPlayer.role && (
        <div className="w-full mt-4 flex flex-col items-center">
          <span className="text-[#FF6600] uppercase tracking-wide">
            You are a <span className="underline underline-offset-3 font-semibold">{roleToLabel[myPlayer.role as RoleKey]}</span>
          </span>
          <Image
            src={roleToSvg[myPlayer.role as RoleKey]}
            alt={roleToLabel[myPlayer.role as RoleKey]}
            width={192}
            height={192}
            className="w-48 h-48 object-contain"
          />
        </div>
      )}
    </main>
  );
}
