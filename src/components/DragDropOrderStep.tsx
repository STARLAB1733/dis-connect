'use client';

import React from 'react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type DragItem = { id: string; label: string };

interface DragDropOrderStepProps {
  items: DragItem[];
  onComplete: (orderedIds: string[]) => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function DragDropOrderStep({ items, onComplete }: DragDropOrderStepProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [order, setOrder] = React.useState<string[]>(() =>
    shuffleArray(items.map((i) => i.id))
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  };
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const oldIndex = order.indexOf(active.id as string);
      const newIndex = order.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        const next = Array.from(order);
        next.splice(oldIndex, 1);
        next.splice(newIndex, 0, active.id as string);
        setOrder(next);
      }
    }
    setActiveId(null);
  };

  return (
    <div className="flex flex-col h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map((id, idx) => (
            <SortableItem key={id} id={id} step={idx + 1} label={items.find(i => i.id === id)!.label} />
          ))}
        </SortableContext>
        <DragOverlay>
          {activeId && (
            <div className="p-3 bg-[#1e293b] border border-[#FF6600] rounded shadow cursor-move text-[#e2e8f0]">
              {items.find(i => i.id === activeId)!.label}
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <button
        onClick={() => {
          if (isSubmitting) return;
          setIsSubmitting(true);
          onComplete(order);
        }}
        disabled={isSubmitting}
        className="
          w-full mt-4 px-4 py-4
          bg-[#FF6600] hover:bg-[#e65a00]
          hover:cursor-pointer rounded-lg
          disabled:opacity-50 disabled:cursor-not-allowed
          border-2 border-[#FF6600]
          text-white font-semibold
          tracking-wider uppercase
          transition duration-200 text-lg
        "
      >
        Submit
      </button>
    </div>
  );
}

function SortableItem({ id, label, step }: { id: string; label: string, step: number }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className="p-3 min-h-[44px] flex items-center bg-[#1e293b] border border-[#334155] rounded shadow mb-2 cursor-move text-[#e2e8f0]"
    >
      <span className="font-semibold mr-2 text-[#FF6600]">Step {step}:</span>
      <span>{label}</span>
    </div>
  );
}
