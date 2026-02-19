'use client';

import React from 'react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type DragItem   = { id: string; label: string };
export type LayoutZone = { id: string; label: string };

interface DragDropLayoutStepProps {
  items: DragItem[];
  dropZones: LayoutZone[];
  onComplete: (mapping: Record<string,string[]>) => void;
}

/**
 * DragDropLayoutStep with nested Tailwind grids:
 * - First zone full width
 * - Second & third side-by-side
 * - Fourth zone full width
 * - Palette bar below
 */
export default function DragDropLayoutStep({
  items,
  dropZones,
  onComplete,
}: DragDropLayoutStepProps) {
  const sensors = useSensors(useSensor(PointerSensor));
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // one list per zone + palette
  const [lists, setLists] = React.useState<Record<string,string[]>>(() => {
    const init: Record<string,string[]> = {};
    dropZones.forEach(z => (init[z.id] = []));
    init['palette'] = items.map(i => i.id);
    return init;
  });

  const handleDragStart = (e: DragStartEvent) =>
    setActiveId(e.active.id as string);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!active || !over) return;

    const id = active.id as string;
    let dest = over.id as string;

    // If dest is not a known zone/palette key, resolve its parent zone
    if (!lists[dest]) {
      const parentZone = Object.keys(lists).find(key => lists[key].includes(dest));
      if (!parentZone) return;
      dest = parentZone;
    }

    const src = Object.keys(lists).find(key => lists[key].includes(id))!;
    if (src === dest) { setActiveId(null); return; }

    const next = { ...lists };
    next[src] = next[src].filter(x => x !== id);
    next[dest] = [...next[dest], id];
    setLists(next);
    setActiveId(null);
  };

  /**
   * Generic container: droppable + sortable
   */
  function Container({
    id,
    label,
    itemsList,
  }: {
    id: string;
    label: string;
    itemsList: string[];
  }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    const itemLabels = Object.fromEntries(items.map(i => [i.id, i.label]));

    return (
      <div
        ref={setNodeRef}
        className={
          `relative flex flex-col p-4 border-2 border-dashed rounded-lg ` +
          `transition-colors ease-in-out duration-200 ` +
          `${isOver ? 'bg-[#FF6600]/10 border-[#FF6600] shadow-lg' : 'bg-[#1e293b] border-[#334155] hover:border-[#FF6600]/50'} ` +
          `min-h-[180px]`
        }
      >
        {label && <h4 className="font-semibold text-sm mb-2 text-[#94a3b8]">{label}</h4>}
        <SortableContext items={itemsList} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col space-y-2 flex-1 overflow-auto text-[#e2e8f0] font-semibold text-md">
            {itemsList.map(itemId => (
              <SortableItem key={itemId} id={itemId} label={itemLabels[itemId]} />
            ))}
          </div>
        </SortableContext>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            {/* === Canvas + Palette row === */}
            <div className="flex flex-1 overflow-hidden">
                {/* === Drop-zone Canvas === */}
                <div className="flex-1 p-2 overflow-auto space-y-0.5">
                {/* Full-width first zone */}
                <Container
                    id={dropZones[0].id}
                    label={'Area 1'}
                    itemsList={lists[dropZones[0].id]}
                />

                {/* Two-column middle panels */}
                <div className="grid grid-cols-2 gap-0.5">
                    {[1,2].map(i => {
                    const z = dropZones[i];
                    return (
                        <Container
                        key={z.id}
                        id={z.id}
                        label={'Area ' + (i+1).toString()}
                        itemsList={lists[z.id]}
                        />
                    );
                    })}
                </div>

                {/* Full-width last zone */}
                <Container
                    id={dropZones[3].id}
                    label={'Area 4'}
                    itemsList={lists[dropZones[3].id]}
                />
                </div>

                {/* === Palette Bar === */}
                {/* === Palette Bar on the Right === */}
                <aside className="w-22 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Components</h4>
                    <SortableContext
                        items={lists['palette']}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="flex flex-col space-y-2 text-[#e2e8f0] font-semibold text-sm">
                        {lists['palette'].map(itemId => (
                            <SortableItem
                            key={itemId}
                            id={itemId}
                            label={items.find(i => i.id === itemId)!.label}
                            />
                        ))}
                        </div>
                    </SortableContext>
                </aside>
            
                <DragOverlay>
                    {activeId && (
                    <div className="p-2 bg-[#1e293b] border border-[#FF6600] rounded shadow opacity-80 cursor-move text-[#e2e8f0]">
                        {items.find(i => i.id === activeId)!.label}
                    </div>
                    )}
                </DragOverlay>
            </div>
        </DndContext>
        {/* === Submit Button === */}
        <button
        onClick={() => onComplete(lists)}
        disabled={lists['palette'].length > 0}
        className="
          mt-10
          px-4
          py-2
          bg-[#FF6600]
          hover:bg-[#e65a00]
          hover:cursor-pointer
          rounded-lg
          disabled:opacity-50
          disabled:cursor-not-allowed
          border-2
          border-[#FF6600]
          text-white
          font-semibold
          tracking-wider
          uppercase
          transition duration-200
          text-xl
          "
          >
            Submit Layout
        </button>
    </div>
  );
}

function SortableItem({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="p-2 bg-[#1e293b] border border-[#334155] rounded shadow cursor-move text-[#e2e8f0]"
    >
      {label}
    </div>
  );
}
