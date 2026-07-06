'use client';

import { useState } from 'react';
import { lookupGlossary } from '@/lib/glossaryTerms';

/**
 * Renders scenario text, turning [[term]] markers into tap-to-define chips.
 * Unknown terms render as plain text (brackets stripped) so a missing
 * glossary entry never breaks the display.
 *
 * Usage: <GlossaryText text={scenario.instruction} />
 */
export default function GlossaryText({ text }: { text: string }) {
  const [openTerm, setOpenTerm] = useState<number | null>(null);

  const parts = text.split(/(\[\[[^\]]+\]\])/g);

  return (
    <span>
      {parts.map((part, i) => {
        const match = part.match(/^\[\[([^\]]+)\]\]$/);
        if (!match) return <span key={i}>{part}</span>;

        const term = match[1];
        const definition = lookupGlossary(term);
        if (!definition) return <span key={i}>{term}</span>;

        const isOpen = openTerm === i;
        return (
          <span key={i} className="relative inline">
            <button
              type="button"
              onClick={() => setOpenTerm(isOpen ? null : i)}
              className="underline decoration-dotted decoration-cyan-400 underline-offset-2 text-cyan-300 cursor-help"
              aria-expanded={isOpen}
            >
              {term}
            </button>
            {isOpen && (
              <span
                className="absolute left-0 top-full z-20 mt-1 block w-56 rounded-lg border border-cyan-500/40 bg-slate-900 p-2 text-xs text-slate-200 shadow-lg"
                onClick={() => setOpenTerm(null)}
              >
                {definition}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
