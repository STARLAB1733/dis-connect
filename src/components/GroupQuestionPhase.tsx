'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp, onSnapshot } from 'firebase/firestore';
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
  const [lobbyPhase, setLobbyPhase] = useState<'wager' | 'answer' | null>(null);
  const [firebaseWager, setFirebaseWager] = useState<number | null>(null);

  const isFacilitator = user?.uid === facilitatorUid;

  // Listen to lobby changes to sync wager and phase across all players
  useEffect(() => {
    if (!lobbyId) return;
    const unsubscribe = onSnapshot(doc(db, 'lobbies', lobbyId), (snap) => {
      const data = snap.data();
      if (data?.groupWagerLocked && data.groupWager) {
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

          {/* Discussion guide (all see) */}
          <div className={`border rounded-lg p-4 ${isFacilitator ? 'bg-[#1e293b] border-[#FF6600]/50' : 'bg-[#1e293b] border-[#334155]'}`}>
            <p className={`text-sm font-semibold mb-2 ${isFacilitator ? 'text-[#FF6600]' : 'text-[#94a3b8]'}`}>
              {isFacilitator ? 'Facilitator Prompt' : 'Discussion Guide'}
            </p>
            <p className="text-sm text-[#cbd5e1] leading-relaxed whitespace-pre-line">
              {groupQuestion.facilitatorPrompt}
            </p>
          </div>

          {/* Answer options - all can see (read-only for non-facilitators) */}
          <div>
            <p className="text-sm text-[#94a3b8] uppercase tracking-widest mb-3">
              Options to Discuss
            </p>
            <div className="grid grid-cols-1 gap-3">
              {groupQuestion.options.map(option => (
                <div
                  key={option.id}
                  className="p-4 rounded-lg text-left border bg-[#1e293b] border-[#334155]"
                >
                  <p className="font-semibold text-sm text-[#cbd5e1]">{option.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Wager section - only facilitator can interact */}
          <div>
            <div className="mb-3">
              <p className="text-sm text-[#94a3b8] uppercase tracking-widest mb-2">
                {isFacilitator ? 'Set the Wager Multiplier' : 'Waiting for Wager...'}
              </p>
              {isFacilitator && (
                <p className="text-xs text-[#cbd5e1] mb-2">
                  Higher wager amplifies the team score impact (positive or negative) based on choice quality.
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3">
              {groupQuestion.wagerOptions.map(wager => (
                <button
                  key={wager}
                  onClick={() => handleWagerSelect(wager)}
                  disabled={isSubmitting || !isFacilitator}
                  className={`p-4 rounded-lg font-bold text-lg transition ${
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
            <div className="text-center p-3 bg-[#1e293b] border border-[#334155] rounded-lg">
              <p className="text-[#94a3b8] text-sm">
                {facilitatorName} is setting the wager. Discuss the options.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ────── ANSWER PHASE ──────────────────────────────────────────
  if (phase === 'answer') {
    return (
      <div className="min-h-dvh flex flex-col bg-[#0f172a] p-6">
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
          {/* Story context with wager badge */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-5">
            <h1 className="text-2xl font-bold text-[#e2e8f0] mb-4">{groupQuestion.title}</h1>
            <p className="text-sm text-[#cbd5e1] leading-relaxed mb-4 whitespace-pre-line">
              {groupQuestion.storyContext}
            </p>
            <div className="inline-block bg-[#FF6600] text-white px-3 py-1 rounded-full text-sm font-bold">
              Wager Locked: {selectedWager}×
            </div>
          </div>

          {/* Options - everyone sees, only facilitator can select */}
          <div>
            <p className="text-sm text-[#94a3b8] uppercase tracking-widest mb-3">
              {isFacilitator ? 'Choose the Team Answer' : 'Team is Deciding...'}
            </p>
            <div className="grid grid-cols-1 gap-3">
              {groupQuestion.options.map(option => (
                <button
                  key={option.id}
                  onClick={() => isFacilitator && handleOptionSelect(option.id)}
                  disabled={!isFacilitator}
                  className={`p-4 rounded-lg text-left transition border ${
                    !isFacilitator
                      ? 'bg-[#1e293b] text-[#475569] border-[#334155] cursor-not-allowed'
                      : selectedOptionId === option.id
                      ? 'bg-[#FF6600]/20 text-[#FF6600] border-[#FF6600] cursor-pointer hover:bg-[#FF6600]/30'
                      : 'bg-[#1e293b] text-[#cbd5e1] border-[#334155] cursor-pointer hover:border-[#FF6600]'
                  }`}
                >
                  <p className="font-semibold text-sm mb-1">{option.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Submit button - only facilitator */}
          {isFacilitator && selectedOptionId && (
            <button
              onClick={handleSubmitAnswer}
              disabled={isSubmitting}
              className="px-6 py-3 bg-[#FF6600] hover:bg-[#e65a00] text-white rounded-lg font-semibold uppercase tracking-wider transition disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Team Answer'}
            </button>
          )}

          {/* Status for non-facilitators */}
          {!isFacilitator && (
            <div className="text-center p-3 bg-[#1e293b] border border-[#334155] rounded-lg">
              <p className="text-[#94a3b8] text-sm">
                {facilitatorName} will submit the team's answer when ready.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ────── REVEAL PHASE ──────────────────────────────────────────
  if (phase === 'reveal' && selectedOption) {
    const wageredImpact = selectedOption.axisImpact || {};
    const wagerToUse = firebaseWager || selectedWager || 1;
    const impactEntries = Object.entries(wageredImpact).map(([axis, value]) => ({
      axis,
      baseValue: value,
      wageredValue: (value ?? 0) * wagerToUse,
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
              {firebaseWager || selectedWager}× Wager
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
