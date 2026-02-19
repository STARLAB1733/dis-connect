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
import { Scenario, SubScenario } from '@/types/scenario';
import type {
  DragDropLayoutScenario,
  DragDropOrderScenario,
  NumericInputScenario,
  BinaryChoiceScenario,
  BinaryChoiceOption,
} from '@/types/scenario';
import type { RoleFitImpact } from '@/lib/roleFit';

type Props = {
  lobbyId: string;
  scenario: Scenario;
  role: string;
  onNext: (pointsEarned: number) => void;
};

export default function ScenarioWrapper({ lobbyId, scenario, role, onNext }: Props) {
  const [user] = useAuthState(auth);
  const sub: SubScenario = scenario.subScenarios[role];

  const handleComplete = async (result: unknown) => {
    if (!user) return;

    // roleFitImpact uses keys: se | cloud | data
    let roleFitImpact: RoleFitImpact = {};
    let pointsEarned = 0;

    // 1) DRAG-DROP scenarios
    if (sub.type === 'drag-drop') {
      // CASE A: "order" variant
      if ((sub as DragDropOrderScenario).variant === 'order') {
        const orderSub = sub as DragDropOrderScenario;
        const userOrder: string[] = result as string[];
        const correctOrder: string[] = orderSub.correctOrder || [];

        let correctCount = 0;
        correctOrder.forEach((correctId, idx) => {
          if (userOrder[idx] === correctId) correctCount++;
        });

        const ratio = correctOrder.length > 0 ? correctCount / correctOrder.length : 0;
        pointsEarned = Math.round(ratio * 100);

        const baseImpact = (orderSub.axisImpact || {}) as RoleFitImpact;
        roleFitImpact = {};
        (Object.keys(baseImpact) as Array<keyof RoleFitImpact>).forEach((key) => {
          roleFitImpact[key] = (baseImpact[key] ?? 0) * ratio;
        });
      }

      // CASE B: "layout" variant
      else {
        const layoutSub = sub as DragDropLayoutScenario;
        const userMapping = result as Record<string, string[]>;

        const zoneIds = layoutSub.dropZones.map(z => z.id);
        const userZoneIndex: Record<string, number> = {};
        for (let zi = 0; zi < zoneIds.length; zi++) {
          for (const itemId of userMapping[zoneIds[zi]] || []) {
            userZoneIndex[itemId] = zi;
          }
        }

        const correctOrder = layoutSub.correctOrder || [];
        const correctZoneIndex: Record<string, number> = {};
        for (let i = 0; i < correctOrder.length; i++) {
          correctZoneIndex[correctOrder[i]] = i;
        }

        let totalDistance = 0;
        correctOrder.forEach((itemId) => {
          const czi = correctZoneIndex[itemId];
          const uzi = userZoneIndex[itemId];
          totalDistance += uzi === undefined
            ? Math.abs((layoutSub.dropZones.length - 1) - czi)
            : Math.abs(uzi - czi);
        });

        const N = layoutSub.dropZones.length;
        let maxDistance = 0;
        for (let i = 0; i < N; i++) {
          maxDistance += Math.max(Math.abs(i), Math.abs(i - (N - 1)));
        }

        let ratio = maxDistance > 0 ? 1 - totalDistance / maxDistance : 1;
        if (ratio < 0) ratio = 0;
        pointsEarned = Math.round(ratio * 100);

        const baseImpact = (layoutSub.axisImpact || {}) as RoleFitImpact;
        roleFitImpact = {};
        (Object.keys(baseImpact) as Array<keyof RoleFitImpact>).forEach((key) => {
          roleFitImpact[key] = (baseImpact[key] ?? 0) * ratio;
        });
      }
    }

    // 2) NUMERIC-INPUT scenario
    else if (sub.type === 'numeric-input') {
      const numSub = sub as NumericInputScenario;
      const userValue: number = (result as { userValue: number }).userValue;
      const diff = Math.abs(userValue - numSub.expected);

      let ratio = numSub.tolerance > 0 ? (numSub.tolerance - diff) / numSub.tolerance : 0;
      if (ratio < 0) ratio = 0;
      pointsEarned = Math.round(ratio * 100);

      const baseImpact = (numSub.axisImpact || {}) as RoleFitImpact;
      roleFitImpact = {};
      (Object.keys(baseImpact) as Array<keyof RoleFitImpact>).forEach((key) => {
        roleFitImpact[key] = (baseImpact[key] ?? 0) * ratio;
      });
    }

    // 3) BINARY-CHOICE scenario
    else if (sub.type === 'binary-choice') {
      const bcSub = sub as BinaryChoiceScenario;
      const chosenId: string = result as string;
      const chosenOption: BinaryChoiceOption | undefined =
        bcSub.options.find((o) => o.id === chosenId);

      if (chosenOption?.axisImpact) {
        const optImpact = chosenOption.axisImpact as RoleFitImpact;
        roleFitImpact = { ...optImpact };
        const positiveSum = (Object.values(roleFitImpact) as number[])
          .filter(v => v > 0)
          .reduce((a, b) => a + b, 0);
        pointsEarned = Math.min(100, Math.round(positiveSum * 33));
      }
    }

    // Write to Firestore logs
    await addDoc(collection(db, 'lobbies', lobbyId, 'logs'), {
      playerId: user.uid,
      role,
      scenarioId: scenario.id,
      result,
      axisImpact: roleFitImpact,
      pointsEarned,
      timestamp: serverTimestamp(),
    });

    onNext(pointsEarned);
  };

  return (
    <div className="space-y-4">
      {/* Role + task header */}
      <section className="bg-white/10 rounded-xl p-4 text-white space-y-1">
        <div className="text-xs uppercase tracking-widest text-white/60 font-medium">
          Your role: {sub.vocationType || role}
        </div>
        <h2 className="text-lg font-bold">{sub.title}</h2>
        <p className="text-sm text-white/90 italic whitespace-pre-line leading-relaxed">{sub.instruction}</p>
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
