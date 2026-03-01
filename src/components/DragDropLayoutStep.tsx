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

// ── Zone container ────────────────────────────────────────────────────────────

function Container({
  id,
  label,
  itemsList,
  itemLabels,
  selectedId,
  onItemTap,
  onZoneTap,
}: {
  id: string;
  label: string;
  itemsList: string[];
  itemLabels: Record<string, string>;
  selectedId: string | null;
  onItemTap: (itemId: string) => void;
  onZoneTap: (zoneId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const isTargetable = selectedId !== null && !itemsList.includes(selectedId);

  return (
    <div
      ref={setNodeRef}
      onClick={() => onZoneTap(id)}
      className={
        `relative flex flex-col p-4 border-2 border-dashed rounded-lg ` +
        `transition-colors ease-in-out duration-200 ` +
        `${isOver || isTargetable
          ? 'bg-[#FF6600]/10 border-[#FF6600] shadow-lg'
          : 'bg-[#1e293b] border-[#334155] hover:border-[#FF6600]/50'} ` +
        `min-h-[100px] sm:min-h-[140px]`
      }
    >
      {label && <h4 className="font-semibold text-sm mb-2 text-[#94a3b8] pointer-events-none">{label}</h4>}
      {isTargetable && itemsList.length === 0 && (
        <p className="text-[10px] text-[#FF6600] text-center mt-2 pointer-events-none">Tap to place here</p>
      )}
      <SortableContext items={itemsList} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1 text-[#e2e8f0] font-semibold text-base">
          {itemsList.map(itemId => (
            <SortableItem
              key={itemId}
              id={itemId}
              label={itemLabels[itemId]}
              isSelected={selectedId === itemId}
              onTap={(e) => { e.stopPropagation(); onItemTap(itemId); }}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ── Draggable / tappable item ─────────────────────────────────────────────────

function SortableItem({
  id, label, isSelected, onTap,
}: {
  id: string;
  label: string;
  isSelected: boolean;
  onTap: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onTap}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`p-3 min-h-[48px] flex items-center border rounded shadow cursor-pointer text-[#e2e8f0] text-sm leading-snug transition-all ${
        isSelected
          ? 'bg-[#FF6600]/10 border-[#FF6600] ring-2 ring-[#FF6600]'
          : 'bg-[#1e293b] border-[#334155] hover:border-[#FF6600]/50'
      }`}
    >
      {label}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DragDropLayoutStep({
  items,
  dropZones,
  onComplete,
}: DragDropLayoutStepProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    })
  );
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
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

  // ── Drag handlers ────────────────────────────────────────────────────────
  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
    setSelectedId(null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!active || !over) { setActiveId(null); return; }

    const id = active.id as string;
    let dest = over.id as string;

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

  // ── Tap handlers ─────────────────────────────────────────────────────────
  const moveItem = (itemId: string, destZoneId: string) => {
    const src = Object.keys(lists).find(key => lists[key].includes(itemId));
    if (!src || src === destZoneId) return;
    const next = { ...lists };
    next[src] = next[src].filter(x => x !== itemId);
    next[destZoneId] = [...next[destZoneId], itemId];
    setLists(next);
  };

  const handleItemTap = (itemId: string) => {
    if (activeId !== null) return;
    if (selectedId === null) {
      setSelectedId(itemId);
    } else if (selectedId === itemId) {
      setSelectedId(null);
    } else {
      // Move selected item to wherever the tapped item lives
      const destZone = Object.keys(lists).find(key => lists[key].includes(itemId))!;
      moveItem(selectedId, destZone);
      setSelectedId(null);
    }
  };

  const handleZoneTap = (zoneId: string) => {
    if (activeId !== null || selectedId === null) return;
    moveItem(selectedId, zoneId);
    setSelectedId(null);
  };

  const handlePaletteTap = (e: React.MouseEvent) => {
    if (activeId !== null || selectedId === null) return;
    // Return selected item to palette
    const src = Object.keys(lists).find(key => lists[key].includes(selectedId));
    if (src && src !== 'palette') {
      e.stopPropagation();
      moveItem(selectedId, 'palette');
      setSelectedId(null);
    }
  };

  const hint = selectedId
    ? 'Tap a zone to place it · tap palette to return it'
    : 'Tap an item to select it · drag to place · all items must be assigned';

  return (
    <div className="flex flex-col h-full">
      {/* Hint */}
      <p className="text-[10px] sm:text-xs text-[#64748b] mb-2 text-center">{hint}</p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="drag-drop-layout-container">
          {/* Palette */}
          <div
            className={`p-3 border-b border-[#334155] drag-drop-palette transition-colors ${
              selectedId && lists['palette'].includes(selectedId) ? 'bg-[#FF6600]/5' : ''
            }`}
            onClick={handlePaletteTap}
          >
            <h4 className="font-semibold text-sm mb-2 text-[#94a3b8]">
              Available Items
              {selectedId && !lists['palette'].includes(selectedId) && (
                <span className="ml-2 text-[#FF6600] text-[10px] normal-case">tap here to return</span>
              )}
            </h4>
            <SortableContext items={lists['palette']} strategy={verticalListSortingStrategy}>
              <div className="flex flex-wrap drag-drop-palette-items gap-2 text-[#e2e8f0] font-semibold text-sm">
                {lists['palette'].map(itemId => (
                  <SortableItem
                    key={itemId}
                    id={itemId}
                    label={itemLabels[itemId]}
                    isSelected={selectedId === itemId}
                    onTap={(e) => { e.stopPropagation(); handleItemTap(itemId); }}
                  />
                ))}
              </div>
            </SortableContext>
          </div>

          {/* Drop Zones */}
          <div className="flex-1 p-3 overflow-auto drag-drop-zones">
            {dropZones.length >= 4 ? (
              <>
                <div className="drag-drop-zone-full">
                  <Container
                    id={dropZones[0].id}
                    label="Area 1"
                    itemsList={lists[dropZones[0].id]}
                    itemLabels={itemLabels}
                    selectedId={selectedId}
                    onItemTap={handleItemTap}
                    onZoneTap={handleZoneTap}
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
                      selectedId={selectedId}
                      onItemTap={handleItemTap}
                      onZoneTap={handleZoneTap}
                    />
                  );
                })}
                <div className="drag-drop-zone-full">
                  <Container
                    id={dropZones[3].id}
                    label="Area 4"
                    itemsList={lists[dropZones[3].id]}
                    itemLabels={itemLabels}
                    selectedId={selectedId}
                    onItemTap={handleItemTap}
                    onZoneTap={handleZoneTap}
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
                  selectedId={selectedId}
                  onItemTap={handleItemTap}
                  onZoneTap={handleZoneTap}
                />
              ))
            )}
          </div>
        </div>

        <DragOverlay>
          {activeId && (
            <div className="p-2 bg-[#1e293b] border border-[#FF6600] rounded shadow opacity-80 cursor-move text-[#e2e8f0] text-sm">
              {itemLabels[activeId]}
            </div>
          )}
        </DragOverlay>
      </DndContext>

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
