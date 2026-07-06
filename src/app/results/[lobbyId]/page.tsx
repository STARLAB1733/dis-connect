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
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, initAuth } from '@/lib/firebase';
import { computePersona, computePerRoleScores, Impact } from '@/lib/persona';
import { getPersonaIdentity, getVocationRecommendation, getTeammateCallouts } from '@/lib/personaMapping';
import type { PersonaIdentity } from '@/lib/personaMapping';
import type { Axis } from '@/lib/persona';
import PersonaShareCard from '@/components/PersonaShareCard';
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
  RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement
);

const GLOBAL_EVENT = 'global';

type PersonaResult = {
  playerId: string;
  normalized: Record<Axis, number>;
  identity: PersonaIdentity;
  vocation: { roleKey: string; label: string; scores: { key: string; label: string; score: number }[] };
  totalScore: number;
};

type IndividualEntry = {
  uid: string;
  name: string;
  teamName?: string;
  score: number;
  vocation: string;
};

type TeamEntry = {
  teamName: string;
  totalScore: number;
  playerCount: number;
  avgScore: number;
};

function Spinner() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-[#94a3b8]">Loading results...</p>
    </div>
  );
}

export default function ResultsPage() {
  const { lobbyId } = useParams() as { lobbyId: string };
  const [user, userLoading] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<PersonaResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [teamLeaderboard, setTeamLeaderboard] = useState<TeamEntry[]>([]);
  const [individualLeaderboard, setIndividualLeaderboard] = useState<IndividualEntry[]>([]);
  const [myTeamName, setMyTeamName] = useState<string | null>(null);
  const [tab, setTab] = useState<'team' | 'individual'>('team');
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  // Reveal staging: 0 = suspense, 1 = top axes teased, 2 = persona revealed
  const [revealStage, setRevealStage] = useState(0);
  const router = useRouter();

  // Short, skippable build-up before the persona card appears (~1.6s total)
  useEffect(() => {
    if (loading || error) return;
    const t1 = setTimeout(() => setRevealStage(s => Math.max(s, 1)), 600);
    const t2 = setTimeout(() => setRevealStage(s => Math.max(s, 2)), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [loading, error]);

  useEffect(() => {
    if (!lobbyId || !user) return;

    async function loadResults() {
      try {
        // Ensure auth is initialized
        await initAuth();

        const lobbySnap = await getDoc(doc(db, 'lobbies', lobbyId));
        const lobbyData = lobbySnap.data() || {};
        const teamName: string | null = lobbyData.teamName || null;
        setMyTeamName(teamName);

        const playerNames: Record<string, string> = {};
        (lobbyData.players || []).forEach((p: { uid: string; name: string }) => {
          playerNames[p.uid] = p.name;
        });
        setPlayerNames(playerNames);

        // Get all answer logs
        const logsSnap = await getDocs(query(
          collection(db, 'lobbies', lobbyId, 'logs'),
          orderBy('timestamp', 'asc')
        ));

        const impactsByPlayer: Record<string, Impact[]> = {};
        const logsByPlayer: Record<string, { role: string; axisImpact: Impact }[]> = {};
        const groupQuestionImpact: Impact = {};

        logsSnap.docs.forEach((docSnap) => {
          const data = docSnap.data() as { playerId: string; role?: string; axisImpact?: Impact; isGroupQuestion?: boolean };
          if (!data.playerId || !data.axisImpact) return;

          // Separate group question impacts from individual impacts
          if (data.isGroupQuestion && data.playerId === '__team__') {
            // Sum up all group question impacts
            Object.entries(data.axisImpact).forEach(([axis, value]) => {
              groupQuestionImpact[axis as keyof typeof groupQuestionImpact] = (groupQuestionImpact[axis as keyof typeof groupQuestionImpact] ?? 0) + (value ?? 0);
            });
          } else if (data.playerId !== '__team__') {
            // Individual player impact (exclude team-wide logs)
            if (!impactsByPlayer[data.playerId]) {
              impactsByPlayer[data.playerId] = [];
              logsByPlayer[data.playerId] = [];
            }
            impactsByPlayer[data.playerId].push(data.axisImpact);
            logsByPlayer[data.playerId].push({ role: data.role || '', axisImpact: data.axisImpact });
          }
        });

        const finalResults: PersonaResult[] = Object.entries(impactsByPlayer).map(
          ([playerId, impactArray]) => {
            const normalized = computePersona(impactArray);
            const identity = getPersonaIdentity(normalized);
            const roleScores = computePerRoleScores(logsByPlayer[playerId] || []);
            const vocation = getVocationRecommendation(roleScores);
            const totalScore = Math.round(vocation.scores.reduce((s, v) => s + v.score, 0) * 100) / 100;
            return { playerId, normalized, identity, vocation, totalScore };
          }
        );
        setResults(finalResults);

        // ── Write scores to Firestore ──────────────────────────────────────
        // Get fresh auth state right before writing (in case session changed during async work)
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('Authentication lost during results page load. Please refresh and try again.');
        }

        // Always write to "global" event, also write to team-named event if set
        const myResult = finalResults.find(r => r.playerId === currentUser.uid);
        if (myResult) {
          const scorePayload = {
            uid: currentUser.uid,
            name: playerNames[currentUser.uid] || 'Agent',
            teamName: teamName || null,
            score: myResult.totalScore,
            vocation: myResult.vocation.label,
            lobbyId,
            timestamp: serverTimestamp(),
          };

          // Write to global leaderboard
          await setDoc(
            doc(db, 'events', GLOBAL_EVENT, 'scores', currentUser.uid),
            scorePayload,
            { merge: true }
          );

          // Also write to team-named event for team filtering
          if (teamName) {
            await setDoc(
              doc(db, 'events', teamName, 'scores', currentUser.uid),
              scorePayload,
              { merge: true }
            );

            // Write team aggregate with GROUP SCORE.
            // Group score is a single shared value — all players compute the same number
            // from the same logs, so we just overwrite with the latest computed value.
            const teamRef = doc(db, 'teams', teamName);
            const groupScore = Math.round(
              Object.values(groupQuestionImpact).reduce((a, b) => a + b, 0) * 10 * 100
            ) / 100;
            const playerCount = (lobbyData.players || []).length;

            await setDoc(teamRef, {
              teamName,
              groupScore,
              playerCount,
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }
        }

        // ── Load leaderboards ──────────────────────────────────────────────
        // Individual: top 20 from global
        const indivSnap = await getDocs(query(
          collection(db, 'events', GLOBAL_EVENT, 'scores'),
          orderBy('score', 'desc'),
          limit(20)
        ));
        setIndividualLeaderboard(indivSnap.docs.map(d => {
          const dd = d.data();
          return { uid: dd.uid, name: dd.name, teamName: dd.teamName, score: dd.score, vocation: dd.vocation };
        }));

        // Team: top 20 teams (ranked by group score)
        const teamSnap = await getDocs(query(
          collection(db, 'teams'),
          orderBy('groupScore', 'desc'),
          limit(20)
        ));
        setTeamLeaderboard(teamSnap.docs.map(d => {
          const dd = d.data();
          return { teamName: dd.teamName, totalScore: dd.groupScore || 0, playerCount: dd.playerCount || 0, avgScore: (dd.groupScore || 0) / (dd.playerCount || 1) };
        }));

        setLoading(false);
      } catch (e: unknown) {
        console.error('Results error:', e);
        setError(e instanceof Error ? e.message : 'Failed to load results.');
        setLoading(false);
      }
    }

    loadResults();
  }, [lobbyId, user]);

  if (userLoading || loading) return <Spinner />;

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-red-400 text-center">{error}</p>
        <button onClick={() => router.push('/')} className="px-4 py-2 bg-[#FF6600] text-white rounded-lg">Back to Home</button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="p-4 text-center text-red-400">You must be signed in to view your results.</p>
      </div>
    );
  }

  const myResult = results.find(r => r.playerId === user.uid);

  if (!myResult) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-2xl font-bold text-[#FF6600]">Your Results</h1>
        <p className="text-[#cbd5e1] text-center">Results not yet available. Did you complete all chapters?</p>
        <button onClick={() => router.push('/')} className="px-4 py-2 bg-[#FF6600] text-white rounded-lg">Back to Home</button>
      </div>
    );
  }

  const { normalized, identity, vocation } = myResult;

  // Top 2 axes for the share card + reveal tease (read-only over game data)
  const topAxes = (Object.entries(normalized) as [Axis, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([axis, score]) => ({ axis, score }));

  // One-line teammate comparisons — only shown when 2+ players have results
  const callouts = getTeammateCallouts(user.uid, results, playerNames);

  const barData = {
    labels: vocation.scores.map(s => s.label),
    datasets: [{
      label: 'Vocation Score',
      data: vocation.scores.map(s => s.score),
      backgroundColor: vocation.scores.map(s => s.key === vocation.roleKey ? '#FF6600' : '#334155'),
      borderRadius: 6,
    }],
  };

  const barOptions = {
    indexAxis: 'y' as const,
    scales: {
      x: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
      y: { ticks: { color: '#FF6600', font: { size: 11, weight: 'bold' as const } }, grid: { display: false } },
    },
    plugins: { legend: { display: false } },
    maintainAspectRatio: false,
  };

  const axisLabels: Axis[] = ['Innovation', 'Stability', 'Speed', 'Precision', 'Cost-Conscious', 'Performance-First', 'Autonomy', 'Collaboration'];

  const radarData = {
    labels: axisLabels,
    datasets: [{
      label: 'Your Score',
      data: axisLabels.map(axis => normalized[axis]),
      backgroundColor: 'rgba(255, 102, 0, 0.4)',
      borderColor: '#FF6600',
      borderWidth: 2,
      pointBackgroundColor: '#FF6600',
    }],
  };

  const radarOptions = {
    scales: {
      r: {
        suggestedMin: 0, suggestedMax: 100,
        ticks: { stepSize: 25, display: false },
        grid: { color: '#334155' },
        angleLines: { color: '#334155' },
        pointLabels: { color: '#FF6600', font: { size: 9 } },
      },
    },
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    maintainAspectRatio: false,
  };

  const medalColour = (i: number) =>
    i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-[#94a3b8]';

  const myTeamEntry = myTeamName ? teamLeaderboard.find(t => t.teamName === myTeamName) : null;
  const myTeamRank = myTeamName ? teamLeaderboard.findIndex(t => t.teamName === myTeamName) + 1 : null;

  return (
    <main className="page-container p-4 pb-12">

      {/* 0. Persona reveal — short staged build-up, tap anywhere to skip */}
      <section className="mb-8 pt-4" onClick={() => setRevealStage(2)}>
        {revealStage < 2 && (
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl w-full max-w-sm mx-auto aspect-square flex flex-col items-center justify-center gap-4 px-6 cursor-pointer select-none">
            <div className="w-10 h-10 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#e2e8f0] font-semibold animate-pulse text-center">
              Decrypting your decision DNA…
            </p>
            <div
              className={`flex flex-wrap justify-center gap-2 transition-all duration-500 ${
                revealStage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
            >
              {topAxes.map(({ axis }) => (
                <span
                  key={axis}
                  className="px-3 py-1 rounded-full bg-[#FF6600]/15 border border-[#FF6600]/40 text-[#FF6600] text-xs font-semibold uppercase tracking-wider"
                >
                  {axis}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-[#94a3b8] uppercase tracking-widest">Tap to skip</p>
          </div>
        )}

        <div
          className={`transition-all duration-700 ease-out ${
            revealStage >= 2
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-6 scale-95 h-0 overflow-hidden pointer-events-none'
          }`}
        >
          <PersonaShareCard
            personaName={identity.name}
            zinger={identity.zinger}
            topAxes={topAxes}
            teamName={myTeamName}
            playerName={playerNames[user.uid]}
          />
          <p className="text-center text-xs text-[#94a3b8] mt-3">
            📸 Screenshot &amp; share your persona!
          </p>

          {callouts.length > 0 && (
            <div className="max-w-sm mx-auto mt-4 space-y-2">
              {callouts.map((line, i) => (
                <p
                  key={i}
                  className="bg-[#1e293b] border border-[#334155] rounded-lg px-4 py-2.5 text-sm text-[#cbd5e1] text-center"
                >
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 1. Score + Team — single unified card */}
      <section className="mb-6">
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl overflow-hidden text-center">
          {/* Individual score */}
          <div className="p-5">
            <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-1">Your Score</p>
            <p className="text-5xl font-bold text-[#FF6600]">{myResult.totalScore}</p>
            <p className="text-xs text-[#94a3b8] mt-1">12 chapters · 3 story arcs</p>
          </div>

          {/* Team info — only rendered if in a team */}
          {myTeamName && myTeamEntry && (
            <>
              <div className="border-t border-[#334155]" />
              <div className="p-4">
                <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-2">Team Group Score</p>
                <p className="text-xl font-bold text-[#FF6600]">{myTeamName}</p>
                <p className="text-[#e2e8f0] text-sm mt-1">
                  Group Score: <span className="font-bold text-[#FF6600]">{myTeamEntry.totalScore}</span>
                  <span className="text-[#94a3b8] ml-2">· {myTeamEntry.playerCount} player{myTeamEntry.playerCount !== 1 ? 's' : ''}</span>
                </p>
                {myTeamRank && myTeamRank <= 3 && (
                  <p className={`text-2xl font-bold mt-1 ${medalColour(myTeamRank - 1)}`}>
                    #{myTeamRank} Team 🏆
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* 2. Leaderboard with tabs */}
      {(teamLeaderboard.length > 0 || individualLeaderboard.length > 0) && (
        <section className="mb-8">
          <div className="flex mb-3 bg-[#1e293b] rounded-lg p-1">
            <button
              onClick={() => setTab('team')}
              className={`flex-1 py-3 text-sm font-semibold rounded-md transition ${tab === 'team' ? 'bg-[#FF6600] text-white' : 'text-[#94a3b8] hover:text-[#e2e8f0]'}`}
            >
              🏆 Team Rankings
            </button>
            <button
              onClick={() => setTab('individual')}
              className={`flex-1 py-3 text-sm font-semibold rounded-md transition ${tab === 'individual' ? 'bg-[#FF6600] text-white' : 'text-[#94a3b8] hover:text-[#e2e8f0]'}`}
            >
              👤 Individual
            </button>
          </div>

          {tab === 'team' && (
            teamLeaderboard.length === 0 ? (
              <p className="text-center text-[#94a3b8] text-sm py-4">No team scores yet — play with a team name to appear here.</p>
            ) : (
              <div className="bg-[#1e293b] rounded-xl overflow-hidden">
                <div className="overflow-y-auto max-h-96 themed-scroll">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#1e293b] z-10">
                      <tr className="border-b border-[#334155]">
                        <th className="text-left p-3 text-[#94a3b8] w-8">#</th>
                        <th className="text-left p-3 text-[#94a3b8]">Team</th>
                        <th className="text-center p-3 text-[#94a3b8] hidden sm:table-cell">Players</th>
                        <th className="text-right p-3 text-[#94a3b8]">Total Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamLeaderboard.map((t, i) => (
                        <tr key={t.teamName} className={`border-b border-[#334155]/50 ${t.teamName === myTeamName ? 'bg-[#FF6600]/10' : ''}`}>
                          <td className={`p-3 font-bold text-base ${medalColour(i)}`}>{i + 1}</td>
                          <td className="p-3">
                            <p className="text-[#e2e8f0] font-semibold max-w-[140px] truncate">{t.teamName}</p>
                            <p className="text-[#94a3b8] text-xs">avg {t.avgScore} / player</p>
                          </td>
                          <td className="p-3 text-center text-[#94a3b8] hidden sm:table-cell">{t.playerCount}</td>
                          <td className="p-3 text-right text-[#FF6600] font-bold text-base">{t.totalScore}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {tab === 'individual' && (
            individualLeaderboard.length === 0 ? (
              <p className="text-center text-[#94a3b8] text-sm py-4">No individual scores yet.</p>
            ) : (
              <div className="bg-[#1e293b] rounded-xl overflow-hidden">
                <div className="overflow-y-auto max-h-96 themed-scroll">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#1e293b] z-10">
                      <tr className="border-b border-[#334155]">
                        <th className="text-left p-3 text-[#94a3b8] w-8">#</th>
                        <th className="text-left p-3 text-[#94a3b8]">Player</th>
                        <th className="text-right p-3 text-[#94a3b8] hidden sm:table-cell">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {individualLeaderboard.map((e, i) => (
                        <tr key={e.uid} className={`border-b border-[#334155]/50 ${e.uid === user.uid ? 'bg-[#FF6600]/10' : ''}`}>
                          <td className={`p-3 font-bold text-base ${medalColour(i)}`}>{i + 1}</td>
                          <td className="p-3">
                            <p className="text-[#e2e8f0] font-medium">
                              {e.name}
                              {e.uid === user.uid && <span className="text-[#FF6600] text-xs ml-1">(you)</span>}
                            </p>
                            {e.teamName && <p className="text-[#94a3b8] text-xs">{e.teamName}</p>}
                            <p className="text-[#94a3b8] text-xs">{e.vocation}</p>
                          </td>
                          <td className="p-3 text-right text-[#FF6600] font-bold hidden sm:table-cell">{e.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </section>
      )}

      {/* 3. Recommended vocation */}
      <section className="text-center mb-8">
        <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-2">Your recommended C4X vocation</p>
        <h1 className="text-3xl font-bold text-[#FF6600]">{vocation.label}</h1>
      </section>

      {/* 4. Vocation breakdown chart */}
      <section className="mb-8">
        <h2 className="text-sm uppercase tracking-wider text-[#94a3b8] mb-3">Vocation Breakdown</h2>
        <div className="w-full h-44 chart-container bg-[#1e293b] rounded-lg p-3">
          <Bar data={barData} options={barOptions} />
        </div>
      </section>

      {/* 5. Persona archetype */}
      <section className="text-center mb-6">
        <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-2">Your Decision Style</p>
        <h2 className="text-2xl font-bold text-[#FF6600] mb-3">{identity.name}</h2>
        {identity.svgPath && (
          <div className="w-full h-48 sm:h-60 relative mx-auto mb-4 persona-image">
            <Image src={identity.svgPath} alt={identity.name} fill style={{ objectFit: 'contain' }} priority />
          </div>
        )}
        <p className="text-[#cbd5e1] text-center mb-4">{identity.description}</p>

        {identity.traits.length > 0 && (
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 text-left max-w-sm mx-auto">
            <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-2 text-center">Signature Moves</p>
            <ul className="space-y-1.5">
              {identity.traits.map((trait, i) => (
                <li key={i} className="text-sm text-[#e2e8f0] flex gap-2">
                  <span className="text-[#FF6600] shrink-0">▸</span>
                  <span>{trait}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#94a3b8] italic mt-3 text-center">{identity.watchOut}</p>
          </div>
        )}
      </section>

      {/* 6. Radar chart */}
      <section className="mb-8">
        <div className="w-full h-72 radar-container">
          <Radar data={radarData} options={radarOptions} />
        </div>
      </section>

      {/* 7. Recruitment CTA */}
      <section className="mb-6 bg-[#1e293b] border border-[#334155] rounded-xl p-5 text-center space-y-3">
        <p className="text-xs text-[#94a3b8] uppercase tracking-widest">Think you have what it takes?</p>
        <p className="text-[#e2e8f0] text-sm leading-relaxed">
          SAF Digital and Intelligence Service is looking for people like you. Join the Mission. Discover the different ways you can contribute to the DIS.
        </p>
        <a
          href="https://www.dis.gov.sg/careers/military-domain-experts-scheme/c4-expert/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-6 py-3 bg-[#FF6600] hover:bg-[#e65a00] text-white font-semibold rounded-lg tracking-wider uppercase transition duration-200 text-sm"
        >
          Find Out More
        </a>
      </section>

      <button
        onClick={() => router.push('/')}
        className="my-4 px-6 py-3 bg-transparent text-[#94a3b8] border border-[#334155] rounded-lg tracking-wide uppercase font-semibold hover:border-[#FF6600] hover:text-[#FF6600] transition duration-200 w-full text-sm"
      >
        Play Again
      </button>
    </main>
  );
}
