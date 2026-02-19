'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Entry = { uid: string; name: string; teamName?: string; score: number; vocation: string };

function LeaderboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event') || 'global';
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const ref = collection(db, 'events', eventId, 'scores');
        const snap = await getDocs(query(ref, orderBy('score', 'desc'), limit(50)));
        setEntries(snap.docs.map(d => {
          const dd = d.data();
          return { uid: dd.uid, name: dd.name, teamName: dd.teamName, score: dd.score, vocation: dd.vocation };
        }));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [eventId]);

  const rankColour = (i: number) =>
    i === 0 ? 'text-yellow-400' : i === 1 ? 'text-[#94a3b8]' : i === 2 ? 'text-amber-600' : 'text-[#94a3b8]';

  return (
    <main className="min-h-dvh max-w-lg mx-auto p-4 pb-12">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/')} className="text-[#94a3b8] hover:text-[#FF6600] text-sm tracking-wide transition">
          ← Back
        </button>
        <h1 className="text-xl font-bold text-[#FF6600] tracking-widest uppercase">Leaderboard</h1>
        <div className="w-12" />
      </div>

      {eventId !== 'global' && (
        <p className="text-center text-[#94a3b8] text-xs tracking-widest mb-4 uppercase">
          Event: <span className="text-[#e2e8f0]">{eventId}</span>
        </p>
      )}

      {loading ? (
        <div className="flex justify-center mt-16">
          <div className="w-10 h-10 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-center text-[#94a3b8] mt-16">No scores yet.</p>
      ) : (
        <div className="bg-[#1e293b] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#334155]">
                <th className="text-left p-3 text-[#94a3b8] w-10">#</th>
                <th className="text-left p-3 text-[#94a3b8]">Player</th>
                <th className="text-left p-3 text-[#94a3b8] hidden sm:table-cell">Vocation</th>
                <th className="text-right p-3 text-[#94a3b8]">Score</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.uid} className="border-b border-[#334155]/50 hover:bg-[#334155]/30 transition">
                  <td className={`p-3 font-bold text-base ${rankColour(i)}`}>{i + 1}</td>
                  <td className="p-3">
                    <p className="text-[#e2e8f0] font-medium">{e.name}</p>
                    {e.teamName && <p className="text-[#94a3b8] text-xs">{e.teamName}</p>}
                  </td>
                  <td className="p-3 text-[#94a3b8] text-xs hidden sm:table-cell">{e.vocation}</td>
                  <td className="p-3 text-right text-[#FF6600] font-bold">{e.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LeaderboardContent />
    </Suspense>
  );
}
