'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  orderBy,
  query,
  limit,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { computePersona, computePerRoleScores, Impact } from '@/lib/persona';
import { getPersonaIdentity, getVocationRecommendation } from '@/lib/personaMapping';
import type { Axis } from '@/lib/persona';
import Image from 'next/image';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Radar, Bar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

type PersonaResult = {
  playerId: string;
  normalized: Record<Axis, number>;
  identity: { name: string; description: string; svgPath: string };
  vocation: { roleKey: string; label: string; scores: { key: string; label: string; score: number }[] };
  totalScore: number;
};

type LeaderboardEntry = {
  uid: string;
  name: string;
  score: number;
  vocation: string;
};

export default function ResultsPage() {
  const { lobbyId } = useParams() as { lobbyId: string };
  const [user, userLoading] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<PersonaResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!lobbyId || !user) return;

    async function loadResults() {
      try {
        // Get lobby doc for event info and player names
        const lobbySnap = await getDoc(doc(db, 'lobbies', lobbyId));
        const lobbyData = lobbySnap.data() || {};
        const lobbyEventId = lobbyData.eventId || lobbyData.teamName || null;
        setEventId(lobbyEventId);
        const lobbyTeamName: string | null = lobbyData.teamName || null;

        const playerNames: Record<string, string> = {};
        (lobbyData.players || []).forEach((p: { uid: string; name: string }) => {
          playerNames[p.uid] = p.name;
        });

        // Get all logs
        const logsRef = collection(db, 'lobbies', lobbyId, 'logs');
        const q = query(logsRef, orderBy('timestamp', 'asc'));
        const snapshot = await getDocs(q);

        // Group by player
        const impactsByPlayer: Record<string, Impact[]> = {};
        const logsByPlayer: Record<string, { role: string; axisImpact: Impact }[]> = {};

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as {
            playerId: string;
            role?: string;
            axisImpact?: Impact;
          };
          if (!data.playerId) return;

          if (!impactsByPlayer[data.playerId]) {
            impactsByPlayer[data.playerId] = [];
            logsByPlayer[data.playerId] = [];
          }

          if (data.axisImpact) {
            impactsByPlayer[data.playerId].push(data.axisImpact);
            logsByPlayer[data.playerId].push({
              role: data.role || '',
              axisImpact: data.axisImpact,
            });
          }
        });

        const finalResults: PersonaResult[] = Object.entries(impactsByPlayer).map(
          ([playerId, impactArray]) => {
            const normalized = computePersona(impactArray);
            const identity = getPersonaIdentity(normalized);
            const roleScores = computePerRoleScores(logsByPlayer[playerId] || []);
            const vocation = getVocationRecommendation(roleScores);
            const totalScore = vocation.scores.reduce((s, v) => s + v.score, 0);
            return { playerId, normalized, identity, vocation, totalScore };
          }
        );

        setResults(finalResults);

        // Write to event leaderboard if event exists
        if (lobbyEventId && user) {
          const myResult = finalResults.find(r => r.playerId === user.uid);
          if (myResult) {
            const scoreRef = doc(db, 'events', lobbyEventId, 'scores', user.uid);
            await setDoc(scoreRef, {
              uid: user.uid,
              name: playerNames[user.uid] || 'Unknown',
              teamName: lobbyTeamName || undefined,
              score: Math.round(myResult.totalScore * 100) / 100,
              vocation: myResult.vocation.label,
              lobbyId,
              timestamp: new Date(),
            }, { merge: true });
          }

          // Load leaderboard
          const scoresRef = collection(db, 'events', lobbyEventId, 'scores');
          const lbQuery = query(scoresRef, orderBy('score', 'desc'), limit(20));
          const lbSnap = await getDocs(lbQuery);
          const lb: LeaderboardEntry[] = lbSnap.docs.map(d => {
            const dd = d.data();
            return { uid: dd.uid, name: dd.name, score: dd.score, vocation: dd.vocation };
          });
          setLeaderboard(lb);
        }

        setLoading(false);
      } catch (e: unknown) {
        console.error('Results page error:', e);
        setError(
          e instanceof Error ? e.message : 'Failed to load results. Check console for details.'
        );
        setLoading(false);
      }
    }

    loadResults();
  }, [lobbyId, user]);

  if (userLoading || loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
        <div
          className="
            w-12 h-12
            border-4 border-[#FF6600]
            border-t-transparent
            rounded-full
            animate-spin
          "
        />
        <p className="text-sm text-[#94a3b8]">Loading results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-red-400 text-center">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-[#FF6600] text-white rounded-lg"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="p-4 text-center text-red-400">
          You must be signed in to view your results.
        </p>
      </div>
    );
  }

  const myResult = results.find((r) => r.playerId === user.uid);

  if (!myResult) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-2xl font-bold text-[#FF6600]">Your Results</h1>
        <p className="text-[#cbd5e1] text-center">
          Your results are not yet available. Did you complete all your turns?
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-[#FF6600] text-white rounded-lg"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const { normalized, identity, vocation } = myResult;

  // Vocation breakdown bar chart
  const barData = {
    labels: vocation.scores.map(s => s.label),
    datasets: [
      {
        label: 'Vocation Score',
        data: vocation.scores.map(s => s.score),
        backgroundColor: vocation.scores.map(s =>
          s.key === vocation.roleKey ? '#FF6600' : '#334155'
        ),
        borderRadius: 6,
      },
    ],
  };

  const barOptions = {
    indexAxis: 'y' as const,
    scales: {
      x: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
      y: { ticks: { color: '#FF6600', font: { size: 13, weight: 'bold' as const } }, grid: { display: false } },
    },
    plugins: { legend: { display: false } },
    maintainAspectRatio: false,
  };

  // Radar chart
  const axisLabels: Axis[] = [
    'Innovation', 'Stability', 'Speed', 'Precision',
    'Cost-Conscious', 'Performance-First', 'Autonomy', 'Collaboration',
  ];

  const radarData = {
    labels: axisLabels,
    datasets: [
      {
        label: 'Your Score',
        data: axisLabels.map((axis) => normalized[axis]),
        backgroundColor: 'rgba(255, 102, 0, 0.4)',
        borderColor: '#FF6600',
        borderWidth: 2,
        pointBackgroundColor: '#FF6600',
      },
    ],
  };

  const radarOptions = {
    scales: {
      r: {
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: { stepSize: 25, display: false },
        grid: { color: '#334155' },
        angleLines: { color: '#334155' },
        pointLabels: { color: '#FF6600', font: { size: 11 } },
      },
    },
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    maintainAspectRatio: false,
  };

  return (
    <main className="max-w-md mx-auto p-4 pb-12">
      {/* Vocation Recommendation (top section) */}
      <section className="text-center mb-8">
        <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-2">Your recommended C4X vocation</p>
        <h1 className="text-3xl font-bold text-[#FF6600] mb-1">{vocation.label}</h1>
        <p className="text-sm text-[#94a3b8]">Based on 12 chapters across 3 story arcs</p>
      </section>

      {/* Vocation breakdown chart */}
      <section className="mb-8">
        <h2 className="text-sm uppercase tracking-wider text-[#94a3b8] mb-3">Vocation Breakdown</h2>
        <div className="w-full h-36 bg-[#1e293b] rounded-lg p-3">
          <Bar data={barData} options={barOptions} />
        </div>
      </section>

      {/* Persona archetype */}
      <section className="text-center mb-6">
        <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-2">Your Decision Style</p>
        {identity.svgPath && (
          <div className="w-full h-60 relative max-w-md mb-4">
            <Image
              src={identity.svgPath}
              alt={identity.name}
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
        )}
        <h2 className="text-2xl font-bold mb-2">{identity.name}</h2>
        <p className="text-[#cbd5e1] text-center">{identity.description}</p>
      </section>

      {/* Radar chart */}
      <section className="mb-8">
        <div className="w-full h-60">
          <Radar data={radarData} options={radarOptions} />
        </div>
      </section>

      {/* Event Leaderboard */}
      {eventId && leaderboard.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm uppercase tracking-wider text-[#94a3b8] mb-3 text-center">
            Event Leaderboard
          </h2>
          <div className="bg-[#1e293b] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#334155]">
                  <th className="text-left p-3 text-[#94a3b8]">#</th>
                  <th className="text-left p-3 text-[#94a3b8]">Name</th>
                  <th className="text-left p-3 text-[#94a3b8]">Vocation</th>
                  <th className="text-right p-3 text-[#94a3b8]">Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, idx) => (
                  <tr
                    key={entry.uid}
                    className={`border-b border-[#1e293b] ${entry.uid === user.uid ? 'bg-[#FF6600]/10' : ''}`}
                  >
                    <td className="p-3 text-[#cbd5e1] font-semibold">{idx + 1}</td>
                    <td className="p-3 text-[#e2e8f0]">
                      {entry.name}
                      {entry.uid === user.uid && (
                        <span className="text-[#FF6600] text-xs ml-1">(you)</span>
                      )}
                    </td>
                    <td className="p-3 text-[#94a3b8] text-xs">{entry.vocation}</td>
                    <td className="p-3 text-right text-[#FF6600] font-semibold">{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <button
        onClick={() => router.push('/')}
        className="
          my-4
          px-6
          py-3
          bg-[#FF6600]
          text-white
          rounded-lg
          tracking-wide
          uppercase
          font-semibold
          hover:bg-[#e65a00]
          transition
          duration-200
          w-full
        "
      >
        Play Again
      </button>
    </main>
  );
}
