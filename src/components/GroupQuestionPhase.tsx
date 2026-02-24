'use client';

import React, { useState, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { GroupWagerChoiceScenario } from '@/types/scenario';

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
  const [phase, setPhase] = useState<Phase>('wager');
  const [selectedWager, setSelectedWager] = useState<number | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFacilitator = user?.uid === facilitatorUid;

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
    if (!isFacilitator || !selectedOptionId || !selectedWager || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const chosenOption = groupQuestion.options.find(o => o.id === selectedOptionId);
      if (!chosenOption) return;

      // Calculate wagered impact
      const baseImpact = chosenOption.axisImpact || {};
      const wageredImpact: Record<string, number> = {};
      Object.entries(baseImpact).forEach(([axis, value]) => {
        wageredImpact[axis] = (value ?? 0) * selectedWager;
      });

      // Write to logs
      await addDoc(collection(db, 'lobbies', lobbyId, 'logs'), {
        playerId: '__team__',
        isGroupQuestion: true,
        arcIdx,
        groupQuestionIdx,
        wager: selectedWager,
        facilitatorUid,
        result: selectedOptionId,
        axisImpact: wageredImpact,
        timestamp: serverTimestamp(),
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
    if (isFacilitator) {
      return (
        <div className="min-h-dvh flex flex-col bg-[#0f172a] p-6">
          <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
            {/* Story context */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-5">
              <h1 className="text-2xl font-bold text-[#e2e8f0] mb-4">{groupQuestion.title}</h1>
              <p className="text-sm text-[#cbd5e1] leading-relaxed whitespace-pre-line">
                {groupQuestion.storyContext}
              </p>
            </div>

            {/* Facilitator prompt */}
            <div className="bg-[#1e293b] border border-[#FF6600]/50 rounded-lg p-4">
              <p className="text-sm text-[#FF6600] font-semibold mb-2">Facilitator Prompt</p>
              <p className="text-sm text-[#cbd5e1] leading-relaxed whitespace-pre-line">
                {groupQuestion.facilitatorPrompt}
              </p>
            </div>

            {/* Instruction */}
            {groupQuestion.instruction && (
              <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-4">
                <p className="text-sm text-[#94a3b8]">{groupQuestion.instruction}</p>
              </div>
            )}

            {/* Wager selection */}
            <div>
              <p className="text-sm text-[#94a3b8] uppercase tracking-widest mb-3">
                Choose Your Wager
              </p>
              <div className="grid grid-cols-1 gap-3">
                {groupQuestion.wagerOptions.map(wager => (
                  <button
                    key={wager}
                    onClick={() => handleWagerSelect(wager)}
                    disabled={isSubmitting}
                    className={`p-4 rounded-lg font-bold text-lg transition ${
                      selectedWager === wager
                        ? 'bg-[#FF6600] text-white border border-[#FF6600]'
                        : 'bg-[#1e293b] text-[#94a3b8] border border-[#334155] hover:border-[#FF6600] hover:text-[#FF6600]'
                    }`}
                  >
                    {wager}× Multiplier
                  </button>
                ))}
              </div>
            </div>

            {/* Wait message for others */}
          </div>
        </div>
      );
    } else {
      // Non-facilitator waiting view
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 bg-[#0f172a]">
          <div className="text-[#FF6600] text-4xl">⏳</div>
          <p className="text-[#94a3b8] text-center text-sm uppercase tracking-widest">
            {facilitatorName} is setting the stakes...
          </p>
          <div className="w-12 h-12 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#cbd5e1] text-sm text-center max-w-xs">
            Take a moment to discuss as a team.
          </p>
        </div>
      );
    }
  }

  // ────── ANSWER PHASE ──────────────────────────────────────────
  if (phase === 'answer') {
    if (isFacilitator) {
      return (
        <div className="min-h-dvh flex flex-col bg-[#0f172a] p-6">
          <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
            {/* Story context */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-5">
              <h1 className="text-2xl font-bold text-[#e2e8f0] mb-4">{groupQuestion.title}</h1>
              <p className="text-sm text-[#cbd5e1] leading-relaxed mb-4 whitespace-pre-line">
                {groupQuestion.storyContext}
              </p>
              {/* Wager badge */}
              <div className="inline-block bg-[#FF6600] text-white px-3 py-1 rounded-full text-sm font-bold">
                Wager Locked: {selectedWager}×
              </div>
            </div>

            {/* Options */}
            <div>
              <p className="text-sm text-[#94a3b8] uppercase tracking-widest mb-3">
                Choose the Team Answer
              </p>
              <div className="grid grid-cols-1 gap-3">
                {groupQuestion.options.map(option => (
                  <button
                    key={option.id}
                    onClick={() => handleOptionSelect(option.id)}
                    disabled={isSubmitting}
                    className={`p-4 rounded-lg text-left transition border ${
                      selectedOptionId === option.id
                        ? 'bg-[#FF6600]/20 text-[#FF6600] border-[#FF6600]'
                        : 'bg-[#1e293b] text-[#cbd5e1] border-[#334155] hover:border-[#FF6600]'
                    }`}
                  >
                    <p className="font-semibold text-sm mb-1">{option.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit button */}
            {selectedOptionId && (
              <button
                onClick={handleSubmitAnswer}
                disabled={isSubmitting}
                className="px-6 py-3 bg-[#FF6600] hover:bg-[#e65a00] text-white rounded-lg font-semibold uppercase tracking-wider transition disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Team Answer'}
              </button>
            )}
          </div>
        </div>
      );
    } else {
      // Non-facilitator answer view (read-only)
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 bg-[#0f172a]">
          <div className="text-[#FF6600] text-4xl">💭</div>
          <p className="text-[#94a3b8] text-center text-sm uppercase tracking-widest">
            Team is discussing...
          </p>
          <div className="w-12 h-12 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#cbd5e1] text-sm text-center max-w-xs">
            {facilitatorName} will make the call when ready.
          </p>
        </div>
      );
    }
  }

  // ────── REVEAL PHASE ──────────────────────────────────────────
  if (phase === 'reveal' && selectedOption) {
    const wageredImpact = selectedOption.axisImpact || {};
    const impactEntries = Object.entries(wageredImpact).map(([axis, value]) => ({
      axis,
      baseValue: value,
      wageredValue: (value ?? 0) * (selectedWager ?? 1),
    }));

    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 bg-[#0f172a]">
        <div className="max-w-2xl w-full">
          {/* Title */}
          <h2 className="text-2xl font-bold text-[#e2e8f0] text-center mb-6">
            {groupQuestion.title}
          </h2>

          {/* Chosen option */}
          <div className="bg-[#1e293b] border border-[#FF6600] rounded-lg p-5 mb-6">
            <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-2">Team Answer</p>
            <p className="text-[#e2e8f0] font-semibold text-sm mb-3">{selectedOption.label}</p>
            <div className="inline-block bg-[#FF6600] text-white px-3 py-1 rounded-full text-sm font-bold">
              {selectedWager}× Wager
            </div>
          </div>

          {/* Impact summary */}
          {impactEntries.length > 0 && (
            <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-5 mb-6">
              <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-4">
                Team Score Impact
              </p>
              <div className="space-y-2">
                {impactEntries.map(({ axis, wageredValue }) => (
                  <div key={axis} className="flex justify-between items-center">
                    <span className="text-[#cbd5e1] text-sm">{axis}</span>
                    <span
                      className={`font-bold text-sm ${
                        wageredValue >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {wageredValue >= 0 ? '+' : ''}{wageredValue.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next button (host only) */}
          {isFacilitator && (
            <button
              onClick={onNext}
              className="w-full px-6 py-4 bg-[#FF6600] hover:bg-[#e65a00] text-white rounded-lg font-semibold uppercase tracking-wider transition"
            >
              Next →
            </button>
          )}

          {!isFacilitator && (
            <p className="text-center text-[#94a3b8] text-sm">
              Waiting for {facilitatorName} to advance...
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
