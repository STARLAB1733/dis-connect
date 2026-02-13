'use client';

import React from 'react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
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
  const sensors = useSensors(useSensor(PointerSensor));
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [order, setOrder] = React.useState<string[]>(() =>
    shuffleArray(items.map((i) => i.id))
  );

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  };
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (active.id !== over?.id) {
      const oldIndex = order.indexOf(active.id as string);
      const newIndex = order.indexOf(over!.id as string);
      const next = Array.from(order);
      next.splice(oldIndex, 1);
      next.splice(newIndex, 0, active.id as string);
      setOrder(next);
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
            <div className="p-2 bg-white rounded shadow cursor-move">
              {items.find(i => i.id === activeId)!.label}
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <button
        onClick={() => onComplete(order)}
        className="
          mt-10
          px-4
          py-2
          bg-[#FF6600]
          hover:bg-[#b34400]
          hover:cursor-pointer
          rounded
          disabled:opacity-50
          disabled:cursor-not-allowed
          border
          border-black
          border-2
          text-black
          rounded-lg
          tracking-wider
          uppercase
          transition duration-200
          text-xl
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
      className="p-2 bg-white rounded shadow mb-2 cursor-move flex items-center text-gray-600"
    >
      <span className="font-semibold mr-2">Step {step}:</span>
      <span>{label}</span>
    </div>
  );
}
