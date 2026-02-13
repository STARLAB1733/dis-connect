// src/app/results/[lobbyId]/page.tsx

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { computePersona, Impact } from '@/lib/persona';
import { getPersonaIdentity } from '@/lib/personaMapping';
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
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

type PersonaResult = {
  playerId: string;
  normalized: Record<Axis, number>;
  identity: { name: string; description: string; svgPath: string };
};

export default function ResultsPage() {
  const { lobbyId } = useParams() as { lobbyId: string };
  const [user, userLoading] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<PersonaResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!lobbyId) return;

    async function loadAllLogs() {
      try {
        // 1) Fetch all logs under lobbies/{lobbyId}/logs, ordered by timestamp
        const logsRef = collection(db, 'lobbies', lobbyId, 'logs');
        const q = query(logsRef, orderBy('timestamp', 'asc'));
        const snapshot = await getDocs(q);

        // 2) Group axisImpact values by playerId
        const impactsByPlayer: Record<string, Impact[]> = {};
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as {
            playerId: string;
            axisImpact?: Impact;
          };
          if (!data.playerId) return;
          if (!impactsByPlayer[data.playerId]) {
            impactsByPlayer[data.playerId] = [];
          }
          if (data.axisImpact) {
            impactsByPlayer[data.playerId].push(data.axisImpact);
          }
        });

        // 3) For each player, compute normalized scores and map to an identity
        const finalResults: PersonaResult[] = Object.entries(impactsByPlayer).map(
          ([playerId, impactArray]) => {
            const normalized = computePersona(impactArray);
            const identity = getPersonaIdentity(normalized);
            return { playerId, normalized, identity };
          }
        );

        setResults(finalResults);
        setLoading(false);
      } catch (e: unknown) {
        console.error(e);
        setError('Failed to load results.');
        setLoading(false);
      }
    }

    loadAllLogs();
  }, [lobbyId]);

  // Show loading until both Firebase auth and Firestore fetch are done
  if (userLoading || loading) {
    return <p className="p-4 text-center">Loading results…</p>;
  }

  // Make sure we have a logged-in user
  if (!user) {
    return (
      <p className="p-4 text-center text-red-500">
        You must be signed in to view your persona.
      </p>
    );
  }

  // Filter down to only the current user's result
  const myResult = results.find((r) => r.playerId === user.uid);

  // If there is no entry for this user, show a friendly message
  if (!myResult) {
    return (
      <main className="max-w-3xl mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Your Persona</h1>
        <p>Your results are not yet available. Did you complete all your turns?</p>
      </main>
    );
  }

  // If there was an error loading Firestore logs, display it
  if (error) {
    return (
      <p className="p-4 text-center text-red-500">{error}</p>
    );
  }

  // At this point, we have a valid myResult for the current user
  const { normalized, identity } = myResult;

  // Prepare radar‐chart data
  const axisLabels: Axis[] = [
    'Innovation',
    'Stability',
    'Speed',
    'Precision',
    'Cost-Conscious',
    'Performance-First',
    'Autonomy',
    'Collaboration',
  ];

  const data = {
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

  const options = {
    scales: {
      r: {
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: { stepSize: 25, display: false },
        grid: { color: '#CBD5E0' },
        angleLines: { color: '#CBD5E0' },
        pointLabels: { color: '#FF6600', font: { size: 12 } },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    maintainAspectRatio: false,
  };

  return (
    <main className="max-w-md mx-auto p-4">
      {/* <h1 className="text-lg font-bold mb-12 text-gray-500 font-bold">LOBBY : <span className='font-normal'>{lobbyId}</span></h1> */}
      <h1 className="text-3xl font-bold mb-8 text-center text-[#FF6600]">YOUR PERSONA REPORT</h1>

      {/* RAW AXIS-SCORES (for testing) */}
      {/* <div className="mb-6">
        <h2 className="font-medium mb-2">Raw Axis Scores:</h2>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(normalized).map(([axis, score]) => (
            <div key={axis} className="flex items-center">
              <span className="w-40 font-semibold">{axis}:</span>
              <span className="ml-2">{score}</span>
            </div>
          ))}
        </div>
      </div> */}

      {/* PERSONA IMAGE + IDENTITY */}
      <div className="flex flex-col items-center">
        {/* Render the user’s persona SVG */}
        {identity.svgPath && (
          <div className="w-full h-86 relative max-w-md mb-8">
            <Image
              src={identity.svgPath}
              alt={identity.name}
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
       )}

        {/* Persona name + description */}
        <h2 className="text-2xl font-bold mb-4">{identity.name}</h2>
        <p className="text-gray-300 text-center text-xl">
          {identity.description}
        </p>

        {/* Radar Chart Visualization */}
        <div className="w-full h-60 mt-8">
          <Radar data={data} options={options} />
        </div>

        {/* ───── “Play Again” Button ───── */}
        <button
          onClick={() => router.push('/')}
          className="
            my-8
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

      </div>
    </main>
  );
}
