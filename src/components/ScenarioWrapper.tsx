// src/components/ScenarioWrapper.tsx
'use client';

import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import DragDropLayoutStep from './DragDropLayoutStep';
import DragDropOrderStep from './DragDropOrderStep';
import NumericInputStep from './NumericInputStep';
import BinaryChoiceStep from './BinaryChoiceStep';
import ConsequenceBeat from './ConsequenceBeat';
import GlossaryText from './GlossaryText';
import { Scenario, SubScenario, AxisImpact } from '@/types/scenario';
import type {
  DragDropLayoutScenario,
  DragDropOrderScenario,
  NumericInputScenario,
  BinaryChoiceScenario,
  BinaryChoiceOption,
} from '@/types/scenario';

type Props = {
  lobbyId: string;
  scenario: Scenario;
  role: string;
  onNext: () => void;
  arcIdx?: number;
  chapterIdx?: number;
};

export default function ScenarioWrapper({ lobbyId, scenario, role, onNext, arcIdx, chapterIdx }: Props) {
  const [user] = useAuthState(auth);
  const [hintShown, setHintShown] = useState(false);
  const [beat, setBeat] = useState<{ text: string; tone: 'success' | 'fail' | 'neutral' } | null>(null);
  const sub: SubScenario | undefined = scenario.subScenarios[role];

   /**
   * handleComplete is called with different `result` shapes:
   *  - For order‐drag: result is `string[]` (array of item IDs in user order)
   *  - For layout‐drag: result is `Record<string, string[]>` where each key is a zone ID and the value is an array of item IDs dropped there.
   *  - For numeric‐input: result is `{ userValue: number }`
   *  - For binary‐choice: result is the chosen `optionId: string`
   */
  if (!sub) {
    return (
      <div className="rounded-lg border border-[#334155] p-4 text-center">
        <p className="text-[#94a3b8] text-sm">No task assigned for your role in this chapter.</p>
      </div>
    );
  }

   const handleComplete = async (result: unknown) => {
    if (!user) return;

    let weightedImpact: AxisImpact = {};
    // Reactive story beat to show after submit (success/fail for scored
    // tasks at a 0.6 ratio threshold, per-option for choices)
    let nextBeat: { text: string; tone: 'success' | 'fail' | 'neutral' } | null = null;
    const pickOutcomeBeat = (s: { consequenceSuccess?: string; consequenceFail?: string }, ratio: number) => {
      const text = ratio >= 0.6 ? s.consequenceSuccess : s.consequenceFail;
      if (text) nextBeat = { text, tone: ratio >= 0.6 ? 'success' : 'fail' };
    };

    // 1) DRAG‐DROP scenarios
    if (sub.type === 'drag-drop') {
      // CASE A: “order” variant (user reorders a flat list)
      if ((sub as DragDropOrderScenario).variant === 'order') {
        const orderSub = sub as DragDropOrderScenario;
        const userOrder: string[] = result as string[]; 
        const correctOrder: string[] = orderSub.correctOrder || [];

        // Count how many IDs are in the exactly correct position
        let correctCount = 0;
        correctOrder.forEach((correctId, idx) => {
          if (userOrder[idx] === correctId) correctCount++;
        });

        // Score ratio between 0…1
        const ratio = correctOrder.length > 0
          ? correctCount / correctOrder.length
          : 0;

        // Multiply each axisImpact by that ratio
        const baseImpact = orderSub.axisImpact || {};
        weightedImpact = {};
        Object.entries(baseImpact).forEach(([axis, value]) => {
          weightedImpact[axis] = (value ?? 0) * ratio;
        });
        pickOutcomeBeat(orderSub, ratio);
      }

      // CASE B: “layout” variant (user assigns items into zones with continuous-distance scoring)
      else {
        const layoutSub    = sub as DragDropLayoutScenario;
        const userMapping  = result as Record<string,string[]>;

        // ––– Build userZoneIndex: itemId → zone index where user dropped it
        const zoneIds = layoutSub.dropZones.map(z => z.id);
        const userZoneIndex: Record<string, number> = {};
        for (let zi = 0; zi < zoneIds.length; zi++) {
          const zid = zoneIds[zi];
          for (const itemId of userMapping[zid] || []) {
            userZoneIndex[itemId] = zi;
          }
        }

        // ––– Build correctZoneIndex: itemId → correct zone index
        const correctOrder = layoutSub.correctOrder || [];
        const correctZoneIndex: Record<string, number> = {};
        for (let i = 0; i < correctOrder.length; i++) {
          correctZoneIndex[ correctOrder[i] ] = i;
        }

        // ––– Compute totalDistance = Σ |userZoneIndex – correctZoneIndex|
        let totalDistance = 0;
        correctOrder.forEach((itemId) => {
          const czi = correctZoneIndex[itemId];
          const uzi = userZoneIndex[itemId];
          if (uzi === undefined) {
            // If missing entirely (left in palette), treat as “worst‐case”: distance = |(N–1) – czi|
            totalDistance += Math.abs((layoutSub.dropZones.length - 1) - czi);
          } else {
            totalDistance += Math.abs(uzi - czi);
          }
        });

        // ––– Compute maxDistance = Σ max(|i–0|, |i–(N–1)|) for i=0…N–1
        const N = layoutSub.dropZones.length;
        let maxDistance = 0;
        for (let i = 0; i < N; i++) {
          maxDistance += Math.max(Math.abs(i - 0), Math.abs(i - (N - 1)));
        }

        // ––– ratio ∈ [0..1], clamp at 0
        let ratio = 1 - totalDistance / maxDistance;
        if (ratio < 0) ratio = 0;

        // ––– Multiply each base axisImpact by ratio
        const baseImpact = layoutSub.axisImpact || {};
        weightedImpact = {};
        Object.entries(baseImpact).forEach(([axis, value]) => {
          weightedImpact[axis] = (value ?? 0) * ratio;
        });
        pickOutcomeBeat(layoutSub, ratio);
      }
    }

    // 2) NUMERIC‐INPUT scenario
    else if (sub.type === 'numeric-input') {
      const numSub = sub as NumericInputScenario;
      // result is expected to be { userValue: number }
      const userValue: number = (result as { userValue: number }).userValue;
      const diff = Math.abs(userValue - numSub.expected);

      // Compute a continuous ratio: 1 when diff=0, down to 0 when diff=tolerance,
      // and clamp at 0 if diff > tolerance.
      let ratio = (numSub.tolerance - diff) / numSub.tolerance;
      if (ratio < 0) ratio = 0;

      const baseImpact = numSub.axisImpact || {};
      weightedImpact = {};
      Object.entries(baseImpact).forEach(([axis, value]) => {
        weightedImpact[axis] = (value ?? 0) * ratio;
      });
      pickOutcomeBeat(numSub, ratio);
    }

    // 3) BINARY‐CHOICE scenario
    else if (sub.type === 'binary-choice') {
      const bcSub = sub as BinaryChoiceScenario;
      // result is the chosen option id
      const chosenId: string = result as string;
      const chosenOption: BinaryChoiceOption | undefined =
        bcSub.options.find((o) => o.id === chosenId);

      // If found, copy that option’s axisImpact; else empty
      if (chosenOption && chosenOption.axisImpact) {
        weightedImpact = { ...chosenOption.axisImpact };
      } else {
        weightedImpact = {};
      }
      if (chosenOption?.consequence) {
        nextBeat = { text: chosenOption.consequence, tone: 'neutral' };
      }
    }

    // 4) Apply hint penalty if the hint was revealed (–30%)
    if (hintShown) {
      Object.keys(weightedImpact).forEach(axis => {
        weightedImpact[axis] = (weightedImpact[axis] ?? 0) * 0.7;
      });
    }

    // 5) Finally, write to Firestore using weightedImpact
    await addDoc(collection(db, 'lobbies', lobbyId, 'logs'), {
      playerId: user.uid,
      role,
      scenarioId: scenario.id,
      arcIdx: arcIdx ?? 0,
      chapterIdx: chapterIdx ?? 0,
      result,
      axisImpact: weightedImpact,
      hintUsed: hintShown,
      timestamp: serverTimestamp(),
    });

    // Show the reactive beat if one exists; onNext fires when it's dismissed
    if (nextBeat) {
      setBeat(nextBeat);
    } else {
      onNext();
    }
  };

  return (
    <div className="space-y-4">
      {beat && (
        <ConsequenceBeat
          text={beat.text}
          tone={beat.tone}
          onDismiss={() => {
            setBeat(null);
            onNext();
          }}
        />
      )}

      {/* Role header (always rendered) */}
      <section className="space-y-1">
        <h2 className="text-xl font-semibold text-[#e2e8f0]">{sub.title}</h2>
        <p className="text-sm text-[#94a3b8] italic whitespace-pre-line"><GlossaryText text={sub.instruction} /></p>
      </section>

      {/* Hint system */}
      {sub.hint && (
        <div className="rounded-lg border border-[#334155] overflow-hidden">
          {!hintShown ? (
            <button
              onClick={() => setHintShown(true)}
              className="w-full flex items-center gap-2 px-3 py-3 text-sm text-[#94a3b8] hover:text-[#FF6600] hover:bg-[#1e293b] transition text-left"
            >
              <span>💡</span>
              <span>Show hint <span className="text-xs opacity-70">(−30% score for this chapter)</span></span>
            </button>
          ) : (
            <div className="px-3 py-2 bg-[#1e293b]">
              <p className="text-xs text-[#FF6600] font-semibold mb-1">💡 Hint <span className="text-[#94a3b8] font-normal">(−30% applied)</span></p>
              <p className="text-sm text-[#cbd5e1]"><GlossaryText text={sub.hint} /></p>
            </div>
          )}
        </div>
      )}

      {/* Scenario body */}
      {sub.type === 'drag-drop' && (
        sub.variant === 'layout'
          ? <DragDropLayoutStep items={sub.items} dropZones={sub.dropZones} onComplete={handleComplete} />
          : <DragDropOrderStep items={sub.items} onComplete={handleComplete} />
      )}

      {sub.type === 'numeric-input' && (
        <NumericInputStep
          chartData={sub.chartData}
          expected={sub.expected}
          tolerance={sub.tolerance}
          onComplete={handleComplete}
        />
      )}

      {sub.type === 'binary-choice' && (
          <BinaryChoiceStep options={sub.options} onComplete={handleComplete} />
        )}
    </div>
  );
}
