// src/app/leaderboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, orderBy, query, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type TeamEntry = {
  lobbyId: string;
  teamName?: string;
  teamScore: number;
  players: { name: string; role?: string }[];
  rank: number;
};

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<TeamEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        // Fetch finished lobbies sorted by teamScore descending
        const lobbiesRef = collection(db, 'lobbies');
        const q = query(
          lobbiesRef,
          where('started', '==', true),
          orderBy('teamScore', 'desc'),
          limit(20)
        );
        const snap = await getDocs(q);

        const results: TeamEntry[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              lobbyId: d.id,
              teamScore: data.teamScore ?? 0,
              players: (data.players ?? []).map((p: { name: string; role?: string }) => ({
                name: p.name,
                role: p.role,
              })),
            };
          })
          // Only show lobbies where score > 0 (i.e. teams that actually played)
          .filter((e) => e.teamScore > 0)
          .map((e, i) => ({ ...e, rank: i + 1 }));

        setEntries(results);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-black text-white">
      {/* Header */}
      <div className="bg-[#FF6600] py-8 px-4 text-center">
        <p className="text-xs uppercase tracking-widest text-white/70 mb-1 font-medium">Event Leaderboard</p>
        <h1 className="text-4xl font-black tracking-tight">TOP TEAMS</h1>
        <p className="mt-2 text-white/80 text-sm">Who rose to the top today?</p>
      </div>

      <div className="max-w-md mx-auto px-4 py-8 space-y-4">
        {entries.length === 0 && (
          <p className="text-center text-white/50 py-8">No completed games yet. Play first!</p>
        )}

        {entries.map((entry) => (
          <div
            key={entry.lobbyId}
            className={`rounded-2xl p-5 border ${
              entry.rank === 1
                ? 'bg-[#FF6600]/20 border-[#FF6600]'
                : entry.rank === 2
                ? 'bg-white/10 border-white/30'
                : entry.rank === 3
                ? 'bg-white/5 border-white/20'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {entry.rank <= 3 ? MEDALS[entry.rank - 1] : `#${entry.rank}`}
                </span>
                <div>
                  <p className="font-bold text-lg">
                    {entry.players.map((p) => p.name).join(', ') || 'Team'}
                  </p>
                  <p className="text-xs text-white/50">Lobby {entry.lobbyId}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-[#FF6600]">{entry.teamScore}</p>
                <p className="text-xs text-white/50">pts</p>
              </div>
            </div>

            {/* Player roles */}
            <div className="flex flex-wrap gap-2">
              {entry.players.map((p, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70"
                >
                  {p.name} · {p.role ? p.role.replace('-', ' ') : 'Unknown'}
                </span>
              ))}
            </div>
          </div>
        ))}

        {/* Back / Play buttons */}
        <div className="pt-4 space-y-3">
          <button
            onClick={() => router.push('/')}
            className="w-full py-4 bg-[#FF6600] text-white font-bold rounded-xl text-lg tracking-wide uppercase hover:bg-[#e65a00] transition duration-200"
          >
            Play Now
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 border border-white/20 text-white/70 rounded-xl text-sm tracking-wide uppercase hover:border-white/40 transition duration-200"
          >
            Refresh
          </button>
        </div>
      </div>
    </main>
  );
}
