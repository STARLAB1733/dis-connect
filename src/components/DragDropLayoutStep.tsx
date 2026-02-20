'use client';

import React from 'react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  TouchSensor,
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

// Extracted to module level — defining inside render would remount on every drag event
function Container({
  id,
  label,
  itemsList,
  itemLabels,
}: {
  id: string;
  label: string;
  itemsList: string[];
  itemLabels: Record<string, string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={
        `relative flex flex-col p-4 border-2 border-dashed rounded-lg ` +
        `transition-colors ease-in-out duration-200 ` +
        `${isOver ? 'bg-[#FF6600]/10 border-[#FF6600] shadow-lg' : 'bg-[#1e293b] border-[#334155] hover:border-[#FF6600]/50'} ` +
        `min-h-[120px] sm:min-h-[180px]`
      }
    >
      {label && <h4 className="font-semibold text-sm mb-2 text-[#94a3b8]">{label}</h4>}
      <SortableContext items={itemsList} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1 text-[#e2e8f0] font-semibold text-base">
          {itemsList.map(itemId => (
            <SortableItem key={itemId} id={itemId} label={itemLabels[itemId]} />
          ))}
        </div>
      </SortableContext>
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
      className="p-3 min-h-[44px] flex items-center bg-[#1e293b] border border-[#334155] rounded shadow cursor-move text-[#e2e8f0]"
    >
      {label}
    </div>
  );
}

export default function DragDropLayoutStep({
  items,
  dropZones,
  onComplete,
}: DragDropLayoutStepProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const itemLabels = React.useMemo(
    () => Object.fromEntries(items.map(i => [i.id, i.label])),
    [items]
  );

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
    if (!active || !over) { setActiveId(null); return; }

    const id = active.id as string;
    let dest = over.id as string;

    // If dest is not a known zone/palette key, resolve its parent zone
    if (!lists[dest]) {
      const parentZone = Object.keys(lists).find(key => lists[key].includes(dest));
      if (!parentZone) { setActiveId(null); return; }
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

  return (
    <div className="flex flex-col h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* === Inner grid: palette (col 1) + zones (col 2) — direct children only === */}
        <div className="drag-drop-layout-container">
          {/* === Palette === */}
          <div className="p-3 border-b border-[#334155] drag-drop-palette">
            <h4 className="font-semibold text-sm mb-2 text-[#94a3b8]">Available Items</h4>
            <SortableContext
              items={lists['palette']}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-wrap drag-drop-palette-items gap-2 text-[#e2e8f0] font-semibold text-sm">
                {lists['palette'].map(itemId => (
                  <SortableItem
                    key={itemId}
                    id={itemId}
                    label={itemLabels[itemId]}
                  />
                ))}
              </div>
            </SortableContext>
          </div>

          {/* === Drop Zones === */}
          <div className="flex-1 p-3 overflow-auto drag-drop-zones">
            {dropZones.length >= 4 ? (
              <>
                <div className="drag-drop-zone-full">
                  <Container
                    id={dropZones[0].id}
                    label="Area 1"
                    itemsList={lists[dropZones[0].id]}
                    itemLabels={itemLabels}
                  />
                </div>

                {[1, 2].map(i => {
                  const z = dropZones[i];
                  return (
                    <Container
                      key={z.id}
                      id={z.id}
                      label={'Area ' + (i + 1)}
                      itemsList={lists[z.id]}
                      itemLabels={itemLabels}
                    />
                  );
                })}

                <div className="drag-drop-zone-full">
                  <Container
                    id={dropZones[3].id}
                    label="Area 4"
                    itemsList={lists[dropZones[3].id]}
                    itemLabels={itemLabels}
                  />
                </div>
              </>
            ) : (
              dropZones.map((z, i) => (
                <Container
                  key={z.id}
                  id={z.id}
                  label={'Area ' + (i + 1)}
                  itemsList={lists[z.id]}
                  itemLabels={itemLabels}
                />
              ))
            )}
          </div>
        </div>{/* end drag-drop-layout-container */}

        <DragOverlay>
          {activeId && (
            <div className="p-2 bg-[#1e293b] border border-[#FF6600] rounded shadow opacity-80 cursor-move text-[#e2e8f0]">
              {itemLabels[activeId]}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* === Submit Button === */}
      <button
        onClick={() => {
          if (isSubmitting || lists['palette'].length > 0) return;
          setIsSubmitting(true);
          onComplete(lists);
        }}
        disabled={isSubmitting || lists['palette'].length > 0}
        className="w-full mt-4 px-4 py-4 bg-[#FF6600] hover:bg-[#e65a00] cursor-pointer rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[#FF6600] text-white font-semibold tracking-wider uppercase transition duration-200 text-lg"
      >
        Submit Layout
      </button>
    </div>
  );
}
