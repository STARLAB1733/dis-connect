'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { GroupWagerChoiceScenario } from '@/types/scenario';
import Image from 'next/image';
import { useAudio } from '@/components/AudioProvider';

type Props = {
  lobbyId: string;
  groupQuestion: GroupWagerChoiceScenario;
  arcIdx: number;
  groupQuestionIdx: number;
  facilitatorUid: string;
  facilitatorName: string;
  players: Array<{ uid: string; name: string }>;
  onNext: () => void;
};

type Phase = 'wager' | 'answer' | 'reveal';

function getImpactLabel(value: number): { label: string; icon: string; color: string } {
  if (value >= 3) return { label: 'Major advantage', icon: '↑↑', color: 'text-green-400' };
  if (value >= 1) return { label: 'Strength gained', icon: '↑', color: 'text-green-400' };
  if (value > 0) return { label: 'Slight boost', icon: '↗', color: 'text-green-300' };
  if (value > -1) return { label: 'Minor cost', icon: '↘', color: 'text-orange-400' };
  if (value >= -3) return { label: 'Took a hit', icon: '↓', color: 'text-red-400' };
  return { label: 'Major setback', icon: '↓↓', color: 'text-red-500' };
}

function getOverallVerdict(totalImpact: number): { text: string; color: string } {
  if (totalImpact > 4) return { text: 'Decisive call. Bold, well-executed, and it shows.', color: 'text-green-400' };
  if (totalImpact > 0) return { text: 'Solid call. The team is moving in the right direction.', color: 'text-green-300' };
  if (totalImpact === 0) return { text: 'Calculated risk. Every path here had its tradeoffs.', color: 'text-[#94a3b8]' };
  if (totalImpact > -4) return { text: 'Costly choice. Real consequences lie ahead.', color: 'text-orange-400' };
  return { text: 'Hard lesson. Recovery will take deliberate effort.', color: 'text-red-400' };
}

export default function GroupQuestionPhase({
  lobbyId,
  groupQuestion,
  arcIdx,
  groupQuestionIdx,
  facilitatorUid,
  facilitatorName,
  onNext,
}: Props) {
  const [user] = useAuthState(auth);
  const { playSfx } = useAudio();
  const [phase, setPhase] = useState<Phase>('wager');
  const [selectedWager, setSelectedWager] = useState<number | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firebaseWager, setFirebaseWager] = useState<number | null>(null);

  const isFacilitator = user?.uid === facilitatorUid;

  // Sync wager lock, answer submission, and phase transitions across all players
  useEffect(() => {
    if (!lobbyId) return;
    const unsubscribe = onSnapshot(doc(db, 'lobbies', lobbyId), (snap) => {
      const data = snap.data();
      // Reveal sync: when facilitator submits, everyone sees the result
      if (data?.groupAnswerSubmitted && data.groupAnswerOptionId) {
        setSelectedOptionId(data.groupAnswerOptionId);
        setPhase('reveal');
      } else if (data?.groupWagerLocked && data.groupWager) {
        // Wager locked: transition everyone to answer phase
        setFirebaseWager(data.groupWager);
        setPhase('answer');
      }
    });
    return unsubscribe;
  }, [lobbyId]);

  const handleWagerSelect = async (wager: number) => {
    if (!isFacilitator || isSubmitting) return;
    setSelectedWager(wager);
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'lobbies', lobbyId), {
        groupWager: wager,
        groupWagerLocked: true,
      });
      setPhase('answer');
    } catch (error) {
      console.error('Failed to lock wager:', error);
      setSelectedWager(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOptionSelect = (optionId: string) => {
    if (!isFacilitator) return;
    setSelectedOptionId(optionId);
  };

  const handleSubmitAnswer = async () => {
    if (!isFacilitator || !selectedOptionId || isSubmitting) return;
    const wagerToUse = selectedWager ?? firebaseWager;
    if (!wagerToUse) return;

    setIsSubmitting(true);
    playSfx('success');
    try {
      const chosenOption = groupQuestion.options.find(o => o.id === selectedOptionId);
      if (!chosenOption) return;

      // Calculate wagered impact
      const baseImpact = chosenOption.axisImpact || {};
      const wageredImpact: Record<string, number> = {};
      Object.entries(baseImpact).forEach(([axis, value]) => {
        wageredImpact[axis] = (value ?? 0) * wagerToUse;
      });

      // Write to logs
      await addDoc(collection(db, 'lobbies', lobbyId, 'logs'), {
        playerId: '__team__',
        isGroupQuestion: true,
        arcIdx,
        groupQuestionIdx,
        wager: wagerToUse,
        facilitatorUid,
        result: selectedOptionId,
        axisImpact: wageredImpact,
        timestamp: serverTimestamp(),
      });

      // Sync reveal phase to all players via lobby doc
      await updateDoc(doc(db, 'lobbies', lobbyId), {
        groupAnswerSubmitted: true,
        groupAnswerOptionId: selectedOptionId,
      });

      setPhase('reveal');
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedOption = useMemo(
    () => groupQuestion.options.find(o => o.id === selectedOptionId),
    [selectedOptionId, groupQuestion.options]
  );

  // ────── WAGER PHASE ──────────────────────────────────────────
  if (phase === 'wager') {
    return (
      <div className="min-h-dvh flex flex-col bg-[#0f172a] p-3 sm:p-6">
        <div className="page-container flex flex-col gap-4 sm:gap-6">
          {/* Story context */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-3 sm:p-5">
            <h1 className="text-lg sm:text-2xl font-bold text-[#e2e8f0] mb-3 sm:mb-4">{groupQuestion.title}</h1>
            <p className="text-xs sm:text-sm text-[#cbd5e1] leading-relaxed whitespace-pre-line">
              {groupQuestion.storyContext}
            </p>
          </div>

          {/* Illustration */}
          {groupQuestion.image && (
            <div className="w-full rounded-lg overflow-hidden">
              <Image
                src={groupQuestion.image}
                alt={groupQuestion.title}
                width={0}
                height={0}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 56rem"
                style={{ width: '100%', height: 'auto', display: 'block' }}
                priority
              />
            </div>
          )}

          {/* Discussion guide (all see) */}
          <div className={`border rounded-lg p-3 sm:p-4 ${isFacilitator ? 'bg-[#1e293b] border-[#FF6600]/50' : 'bg-[#1e293b] border-[#334155]'}`}>
            <p className={`text-xs sm:text-sm font-semibold mb-2 ${isFacilitator ? 'text-[#FF6600]' : 'text-[#94a3b8]'}`}>
              {isFacilitator ? 'Facilitator Prompt' : 'Discussion Guide'}
            </p>
            <p className="text-xs sm:text-sm text-[#cbd5e1] leading-relaxed whitespace-pre-line">
              {groupQuestion.facilitatorPrompt}
            </p>
          </div>

          {/* Answer options — all can see while discussing */}
          <div>
            <p className="text-xs sm:text-sm text-[#94a3b8] uppercase tracking-widest mb-2 sm:mb-3">
              Options to Discuss
            </p>
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              {groupQuestion.options.map(option => (
                <div
                  key={option.id}
                  className="p-3 sm:p-4 rounded-lg text-left border bg-[#1e293b] border-[#334155]"
                >
                  <p className="font-semibold text-xs sm:text-sm text-[#cbd5e1]">{option.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Wager section */}
          <div>
            <div className="mb-2 sm:mb-3">
              <p className="text-xs sm:text-sm text-[#94a3b8] uppercase tracking-widest mb-1 sm:mb-2">
                {isFacilitator ? 'Set the Wager Multiplier' : 'Waiting for Wager...'}
              </p>
              {isFacilitator && (
                <p className="text-[10px] sm:text-xs text-[#cbd5e1] mb-2">
                  Higher wager amplifies the team score impact (positive or negative) based on choice quality.
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              {groupQuestion.wagerOptions.map(wager => (
                <button
                  key={wager}
                  onClick={() => handleWagerSelect(wager)}
                  disabled={isSubmitting || !isFacilitator}
                  className={`p-3 sm:p-4 rounded-lg font-bold text-sm sm:text-lg transition ${
                    !isFacilitator
                      ? 'bg-[#1e293b] text-[#475569] border border-[#334155] cursor-not-allowed'
                      : selectedWager === wager
                      ? 'bg-[#FF6600] text-white border border-[#FF6600]'
                      : 'bg-[#1e293b] text-[#94a3b8] border border-[#334155] hover:border-[#FF6600] hover:text-[#FF6600]'
                  }`}
                >
                  {wager}× Multiplier
                </button>
              ))}
            </div>
          </div>

          {/* Status for non-facilitators */}
          {!isFacilitator && (
            <div className="text-center p-2 sm:p-3 bg-[#1e293b] border border-[#334155] rounded-lg">
              <p className="text-[#94a3b8] text-xs sm:text-sm">
                {facilitatorName} is setting the wager. Discuss the options above.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ────── ANSWER PHASE ──────────────────────────────────────────
  if (phase === 'answer') {
    const lockedWager = firebaseWager ?? selectedWager;
    return (
      <div className="min-h-dvh flex flex-col bg-[#0f172a] p-3 sm:p-6">
        <div className="page-container flex flex-col gap-4 sm:gap-6">
          {/* Story context with wager badge */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-3 sm:p-5">
            <h1 className="text-lg sm:text-2xl font-bold text-[#e2e8f0] mb-3 sm:mb-4">{groupQuestion.title}</h1>
            <p className="text-xs sm:text-sm text-[#cbd5e1] leading-relaxed mb-3 sm:mb-4 whitespace-pre-line">
              {groupQuestion.storyContext}
            </p>
            <div className="inline-block bg-[#FF6600] text-white px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
              Wager Locked: {lockedWager}×
            </div>
          </div>

          {/* Options — everyone sees, only facilitator can select */}
          <div>
            <p className="text-xs sm:text-sm text-[#94a3b8] uppercase tracking-widest mb-2 sm:mb-3">
              {isFacilitator ? 'Choose the Team Answer' : 'Team is Deciding...'}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              {groupQuestion.options.map(option => (
                <button
                  key={option.id}
                  onClick={() => isFacilitator && handleOptionSelect(option.id)}
                  disabled={!isFacilitator}
                  className={`p-3 sm:p-4 rounded-lg text-left transition border ${
                    !isFacilitator
                      ? 'bg-[#1e293b] text-[#475569] border-[#334155] cursor-not-allowed'
                      : selectedOptionId === option.id
                      ? 'bg-[#FF6600]/20 text-[#FF6600] border-[#FF6600] cursor-pointer hover:bg-[#FF6600]/30'
                      : 'bg-[#1e293b] text-[#cbd5e1] border-[#334155] cursor-pointer hover:border-[#FF6600]'
                  }`}
                >
                  <p className="font-semibold text-xs sm:text-sm mb-1">{option.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Submit button — only facilitator */}
          {isFacilitator && selectedOptionId && (
            <button
              onClick={handleSubmitAnswer}
              disabled={isSubmitting}
              className="px-4 sm:px-6 py-3 bg-[#FF6600] hover:bg-[#e65a00] text-white rounded-lg font-semibold uppercase tracking-wider text-xs sm:text-sm transition disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Team Answer'}
            </button>
          )}

          {/* Status for non-facilitators */}
          {!isFacilitator && (
            <div className="text-center p-2 sm:p-3 bg-[#1e293b] border border-[#334155] rounded-lg">
              <p className="text-[#94a3b8] text-xs sm:text-sm">
                {facilitatorName} will submit the team&apos;s answer when ready.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ────── REVEAL PHASE ──────────────────────────────────────────
  if (phase === 'reveal' && selectedOption) {
    const baseImpact = selectedOption.axisImpact || {};
    const wagerToUse = firebaseWager ?? selectedWager ?? 1;
    const impactEntries = Object.entries(baseImpact).map(([axis, value]) => ({
      axis,
      wageredValue: (value ?? 0) * wagerToUse,
    }));
    const totalImpact = impactEntries.reduce((sum, { wageredValue }) => sum + wageredValue, 0);
    const verdict = getOverallVerdict(totalImpact);

    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 sm:gap-6 p-3 sm:p-6 bg-[#0f172a]">
        <div className="page-container">
          {/* Title */}
          <h2 className="text-lg sm:text-2xl font-bold text-[#e2e8f0] text-center mb-4 sm:mb-6">
            {groupQuestion.title}
          </h2>

          {/* Chosen option */}
          <div className="bg-[#1e293b] border border-[#FF6600] rounded-lg p-3 sm:p-5 mb-4 sm:mb-6">
            <p className="text-[10px] sm:text-xs text-[#94a3b8] uppercase tracking-widest mb-2">Team Answer</p>
            <p className="text-[#e2e8f0] font-semibold text-xs sm:text-sm mb-2 sm:mb-3">{selectedOption.label}</p>
            <div className="inline-block bg-[#FF6600] text-white px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
              {wagerToUse}× Wager
            </div>
          </div>

          {/* Impact summary — qualitative */}
          {impactEntries.length > 0 && (
            <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-3 sm:p-5 mb-4 sm:mb-6">
              {/* Overall verdict */}
              <div className="mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-[#334155]">
                <p className="text-[10px] sm:text-xs text-[#94a3b8] uppercase tracking-widest mb-1 sm:mb-2">Team Verdict</p>
                <p className={`text-xs sm:text-sm font-semibold ${verdict.color}`}>{verdict.text}</p>
              </div>

              {/* Per-axis qualitative labels */}
              <p className="text-[10px] sm:text-xs text-[#94a3b8] uppercase tracking-widest mb-2 sm:mb-3">Impact Areas</p>
              <div className="space-y-1.5 sm:space-y-2">
                {impactEntries.map(({ axis, wageredValue }) => {
                  const { label, icon, color } = getImpactLabel(wageredValue);
                  return (
                    <div key={axis} className="flex justify-between items-center">
                      <span className="text-[#cbd5e1] text-xs sm:text-sm">{axis}</span>
                      <span className={`font-semibold text-xs sm:text-sm ${color}`}>
                        {icon} {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Next button — facilitator only */}
          {isFacilitator && (
            <button
              onClick={() => {
                playSfx('advance');
                onNext();
              }}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-[#FF6600] hover:bg-[#e65a00] text-white rounded-lg font-semibold uppercase tracking-wider text-xs sm:text-sm transition"
            >
              Next →
            </button>
          )}

          {!isFacilitator && (
            <p className="text-center text-[#94a3b8] text-xs sm:text-sm">
              Waiting for {facilitatorName} to advance...
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
