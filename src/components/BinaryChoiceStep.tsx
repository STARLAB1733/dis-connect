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
                flex items-start gap-3 cursor-pointer p-4 rounded-xl border-2
                transition-all duration-200 ease-in-out
                ${isSelected
                  ? 'border-[#FF6600] bg-white/10'
                  : 'border-white/20 bg-white/5 hover:border-white/40'}
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
              <span className={`w-4 h-4 mt-0.5 flex-shrink-0 rounded-full border-2 flex items-center justify-center
                ${isSelected ? 'border-[#FF6600] bg-[#FF6600]' : 'border-white/40'}`}>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
              <span className={`text-sm leading-relaxed ${isSelected ? 'text-white font-medium' : 'text-white/70'}`}>
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
