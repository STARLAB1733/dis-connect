// src/components/ScenarioWrapper.tsx
'use client';

import React from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import DragDropLayoutStep from './DragDropLayoutStep';
import DragDropOrderStep from './DragDropOrderStep';
import NumericInputStep from './NumericInputStep';
import BinaryChoiceStep from './BinaryChoiceStep';
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
};

export default function ScenarioWrapper({ lobbyId, scenario, role, onNext }: Props) {
  const [user] = useAuthState(auth);
  const sub: SubScenario = scenario.subScenarios[role];

   /**
   * handleComplete is called with different `result` shapes:
   *  - For order‐drag: result is `string[]` (array of item IDs in user order)
   *  - For layout‐drag: result is `Record<string, string[]>` where each key is a zone ID and the value is an array of item IDs dropped there.
   *  - For numeric‐input: result is `{ userValue: number }`
   *  - For binary‐choice: result is the chosen `optionId: string`
   */
   const handleComplete = async (result: unknown) => {
    if (!user) return;

    let weightedImpact: AxisImpact = {};

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
    }

    // 4) Finally, write to Firestore using weightedImpact
    await addDoc(collection(db, 'lobbies', lobbyId, 'logs'), {
      playerId: user.uid,
      role,
      scenarioId: scenario.id,
      result,            // raw answer (array, mapping, number, or chosenId)
      axisImpact: weightedImpact,
      timestamp: serverTimestamp(),
    });

    // Move on to the next turn
    onNext();
  };

  return (
    <div className="space-y-4 space-x-4">
      {/* Role header (always rendered) */}
      <section className="space-y-1">
        <h2 className="text-xl font-semibold text-black">{sub.title}</h2>
        <p className="text-sm text-gray-900 italic whitespace-pre-line">{sub.instruction}</p>
      </section>

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
