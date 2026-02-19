'use client';

import React, { useState } from 'react';

type Option = { id: string; label: string };

type BinaryChoiceStepProps = {
  options: Option[];
  onComplete: (choice: string) => void;
};

export default function BinaryChoiceStep({ options, onComplete }: BinaryChoiceStepProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col gap-3">
        {options.map(opt => {
          const isSelected = opt.id === selected;
          return (
            <label
              key={opt.id}
              className={`
                flex items-start cursor-pointer p-4 rounded-lg border-2
                transition-all duration-200 ease-in-out
                ${isSelected
                  ? 'border-[#FF6600] bg-[#FF6600]/10 shadow-inner'
                  : 'border-[#334155] bg-[#1e293b] hover:border-[#FF6600]/50 hover:shadow-sm'}
              `}
              onClick={() => setSelected(opt.id)}
            >
              <input
                type="radio"
                name="choice"
                value={opt.id}
                checked={isSelected}
                onChange={() => setSelected(opt.id)}
                className="sr-only"
              />
              <span className={`
                text-sm leading-relaxed
                ${isSelected ? 'text-[#FF6600] font-medium' : 'text-[#e2e8f0]'}
              `}>
                {opt.label}
              </span>
            </label>
          );
        })}
      </div>

      <button
        onClick={() => selected && onComplete(selected)}
        disabled={!selected}
        className="
          mt-10 px-4 py-2
          bg-[#FF6600] hover:bg-[#e65a00]
          hover:cursor-pointer rounded-lg
          disabled:opacity-50 disabled:cursor-not-allowed
          border-2 border-[#FF6600]
          text-white font-semibold
          tracking-wider uppercase
          transition duration-200 text-xl
        "
      >
        Submit
      </button>
    </div>
  );
}
