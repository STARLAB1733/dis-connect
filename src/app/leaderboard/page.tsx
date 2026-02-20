'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type IndividualEntry = { uid: string; name: string; teamName?: string; score: number; vocation: string };
type TeamEntry = { teamName: string; totalScore: number; playerCount: number; avgScore: number };

function LeaderboardContent() {
  const router = useRouter();
  const [tab, setTab] = useState<'team' | 'individual'>('team');
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [individuals, setIndividuals] = useState<IndividualEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [tSnap, iSnap] = await Promise.all([
          getDocs(query(collection(db, 'teams'), orderBy('totalScore', 'desc'), limit(50))),
          getDocs(query(collection(db, 'events', 'global', 'scores'), orderBy('score', 'desc'), limit(50))),
        ]);
        setTeams(tSnap.docs.map(d => {
          const dd = d.data();
          return { teamName: dd.teamName, totalScore: dd.totalScore, playerCount: dd.playerCount, avgScore: dd.avgScore };
        }));
        setIndividuals(iSnap.docs.map(d => {
          const dd = d.data();
          return { uid: dd.uid, name: dd.name, teamName: dd.teamName, score: dd.score, vocation: dd.vocation };
        }));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const medalColour = (i: number) =>
    i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-[#94a3b8]';

  return (
    <main className="min-h-dvh max-w-lg mx-auto p-4 pb-12">
      <div className="flex items-center justify-between mb-6 pt-4">
        <button onClick={() => router.push('/')} className="text-[#94a3b8] hover:text-[#FF6600] text-sm tracking-wide transition">← Back</button>
        <h1 className="text-xl font-bold text-[#FF6600] tracking-widest uppercase">Leaderboard</h1>
        <div className="w-12" />
      </div>

      {/* Tabs */}
      <div className="flex mb-4 bg-[#1e293b] rounded-lg p-1">
        <button
          onClick={() => setTab('team')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${tab === 'team' ? 'bg-[#FF6600] text-white' : 'text-[#94a3b8] hover:text-[#e2e8f0]'}`}
        >
          🏆 Team Rankings
        </button>
        <button
          onClick={() => setTab('individual')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${tab === 'individual' ? 'bg-[#FF6600] text-white' : 'text-[#94a3b8] hover:text-[#e2e8f0]'}`}
        >
          👤 Individual
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center mt-16">
          <div className="w-10 h-10 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'team' ? (
        teams.length === 0 ? (
          <p className="text-center text-[#94a3b8] mt-16">No team scores yet.<br />Play with a team name to appear here.</p>
        ) : (
          <div className="bg-[#1e293b] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#334155]">
                  <th className="text-left p-3 text-[#94a3b8] w-8">#</th>
                  <th className="text-left p-3 text-[#94a3b8]">Team</th>
                  <th className="text-center p-3 text-[#94a3b8]">Players</th>
                  <th className="text-right p-3 text-[#94a3b8]">Total</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t, i) => (
                  <tr key={t.teamName} className="border-b border-[#334155]/50 hover:bg-[#334155]/30 transition">
                    <td className={`p-3 font-bold text-base ${medalColour(i)}`}>{i + 1}</td>
                    <td className="p-3">
                      <p className="text-[#e2e8f0] font-semibold">{t.teamName}</p>
                      <p className="text-[#94a3b8] text-xs">avg {t.avgScore} / player</p>
                    </td>
                    <td className="p-3 text-center text-[#94a3b8]">{t.playerCount}</td>
                    <td className="p-3 text-right text-[#FF6600] font-bold text-base">{t.totalScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        individuals.length === 0 ? (
          <p className="text-center text-[#94a3b8] mt-16">No individual scores yet.</p>
        ) : (
          <div className="bg-[#1e293b] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#334155]">
                  <th className="text-left p-3 text-[#94a3b8] w-8">#</th>
                  <th className="text-left p-3 text-[#94a3b8]">Player</th>
                  <th className="text-right p-3 text-[#94a3b8]">Score</th>
                </tr>
              </thead>
              <tbody>
                {individuals.map((e, i) => (
                  <tr key={e.uid} className="border-b border-[#334155]/50 hover:bg-[#334155]/30 transition">
                    <td className={`p-3 font-bold text-base ${medalColour(i)}`}>{i + 1}</td>
                    <td className="p-3">
                      <p className="text-[#e2e8f0] font-medium">{e.name}</p>
                      {e.teamName && <p className="text-[#94a3b8] text-xs">{e.teamName}</p>}
                      <p className="text-[#94a3b8] text-xs">{e.vocation}</p>
                    </td>
                    <td className="p-3 text-right text-[#FF6600] font-bold">{e.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
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
