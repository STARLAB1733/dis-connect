// src/app/results/[lobbyId]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, doc, getDoc, orderBy, query } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { computeRoleFit, getBestFitRole, ROLE_PROFILES, RoleFitTotals } from '@/lib/roleFit';
import type { RoleFitImpact } from '@/lib/roleFit';
import Image from 'next/image';

type LogEntry = {
  playerId: string;
  axisImpact?: Record<string, number>;
  pointsEarned?: number;
};

export default function ResultsPage() {
  const { lobbyId } = useParams() as { lobbyId: string };
  const [user, userLoading] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [myTotals, setMyTotals] = useState<RoleFitTotals | null>(null);
  const [teamScore, setTeamScore] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!lobbyId) return;

    async function loadResults() {
      try {
        // Fetch lobby doc for team score
        const lobbyRef = doc(db, 'lobbies', lobbyId);
        const lobbySnap = await getDoc(lobbyRef);
        if (lobbySnap.exists()) {
          setTeamScore(lobbySnap.data()?.teamScore ?? 0);
        }

        // Fetch all logs
        const logsRef = collection(db, 'lobbies', lobbyId, 'logs');
        const q = query(logsRef, orderBy('timestamp', 'asc'));
        const snapshot = await getDocs(q);

        // Group axisImpact by player
        const impactsByPlayer: Record<string, RoleFitImpact[]> = {};
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as LogEntry;
          if (!data.playerId) return;
          if (!impactsByPlayer[data.playerId]) impactsByPlayer[data.playerId] = [];
          if (data.axisImpact) {
            // Cast the stored impact — keys are se/cloud/data from our scenarios
            impactsByPlayer[data.playerId].push(data.axisImpact as RoleFitImpact);
          }
        });

        if (user && impactsByPlayer[user.uid]) {
          setMyTotals(computeRoleFit(impactsByPlayer[user.uid]));
        }

        setLoading(false);
      } catch (e) {
        console.error(e);
        setError('Failed to load results.');
        setLoading(false);
      }
    }

    loadResults();
  }, [lobbyId, user]);

  if (userLoading || loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#ff6600]">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="p-4 text-center text-red-500">{error}</p>;
  }

  if (!user || !myTotals) {
    return (
      <main className="max-w-md mx-auto p-4 text-center">
        <p className="text-gray-500 mt-8">Results not available. Did you complete all rounds?</p>
      </main>
    );
  }

  const bestFit = getBestFitRole(myTotals);
  const profile = ROLE_PROFILES[bestFit];

  // Normalise scores to percentages for the bar chart
  const maxScore = Math.max(myTotals.se, myTotals.cloud, myTotals.data, 0.01);
  const bars: { key: keyof RoleFitTotals; label: string; pct: number }[] = [
    { key: 'se', label: 'Software Engineer', pct: (myTotals.se / maxScore) * 100 },
    { key: 'cloud', label: 'Cloud Platform Engineer', pct: (myTotals.cloud / maxScore) * 100 },
    { key: 'data', label: 'Data & AI Engineer', pct: (myTotals.data / maxScore) * 100 },
  ];

  return (
    <main className="min-h-dvh bg-black text-white">
      {/* Win Banner */}
      <div className="bg-[#FF6600] py-8 px-4 text-center">
        <p className="text-xs uppercase tracking-widest text-white/70 mb-1 font-medium">Mission Complete</p>
        <h1 className="text-4xl font-black tracking-tight">DEBRIEF</h1>
        <p className="mt-2 text-white/80 text-sm">Here&apos;s what your decisions say about you.</p>
      </div>

      <div className="max-w-md mx-auto px-4 py-8 space-y-6">

        {/* Team Score */}
        <section className="bg-white/5 rounded-2xl p-5 text-center border border-white/10">
          <p className="text-xs uppercase tracking-widest text-white/50 mb-1">Team Score</p>
          <p className="text-5xl font-black text-[#FF6600]">{Math.round(teamScore)}</p>
          <p className="text-white/50 text-xs mt-1">points earned across all 4 chapters</p>
        </section>

        {/* Best Fit Role */}
        <section className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <p className="text-xs uppercase tracking-widest text-white/50 mb-3">Your Best Fit</p>
          <div className="flex items-center gap-4 mb-4">
            <Image
              src={profile.svgPath}
              alt={profile.name}
              width={72}
              height={72}
              className="w-18 h-18 object-contain flex-shrink-0"
            />
            <div>
              <h2 className="text-xl font-bold text-[#FF6600]">{profile.name}</h2>
              <p className="text-sm text-white/70 italic mt-1">&ldquo;{profile.tagline}&rdquo;</p>
            </div>
          </div>
          <p className="text-sm text-white/80 leading-relaxed">{profile.description}</p>
        </section>

        {/* Role-Fit Bars */}
        <section className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <p className="text-xs uppercase tracking-widest text-white/50 mb-4">Role Affinity</p>
          <div className="space-y-3">
            {bars.map((b) => (
              <div key={b.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={b.key === bestFit ? 'text-[#FF6600] font-semibold' : 'text-white/60'}>
                    {b.label}
                  </span>
                  <span className="text-white/60">{Math.round(b.pct)}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full bg-[#FF6600] transition-all duration-700"
                    style={{ width: `${b.pct}%`, opacity: b.key === bestFit ? 1 : 0.4 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Day in the Life */}
        <section className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <p className="text-xs uppercase tracking-widest text-white/50 mb-4">A Day in the Life</p>
          <ul className="space-y-2">
            {profile.dayInLife.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-white/80">
                <span className="text-[#FF6600] flex-shrink-0 mt-0.5">▸</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Buttons */}
        <div className="space-y-3 pb-8">
          <button
            onClick={() => router.push('/leaderboard')}
            className="w-full py-4 bg-[#FF6600] text-white font-bold rounded-xl text-lg tracking-wide uppercase hover:bg-[#e65a00] transition duration-200"
          >
            View Leaderboard
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 border border-white/20 text-white/70 rounded-xl text-sm tracking-wide uppercase hover:border-white/40 transition duration-200"
          >
            Play Again
          </button>
        </div>

      </div>
    </main>
  );
}
