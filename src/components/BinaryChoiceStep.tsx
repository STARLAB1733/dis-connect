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
      <div className="grid grid-cols-2 gap-4">
        {options.map(opt => {
          const isSelected = opt.id === selected;
          return (
            <label
              key={opt.id}
              className={`
                flex 
                items-center 
                justify-center 
                cursor-pointer 
                p-4 
                rounded-lg 
                border-2 
                transition-all 
                duration-200 
                ease-in-out
                h-16
                ${isSelected 
                  ? 'border-[#FF6600] bg-[#FFF3E0] shadow-inner' 
                  : 'border-gray-300 bg-white hover:border-[#FF6600] hover:shadow-sm'}
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
              <div className="flex items-center justify-center">
                <span className={`
                  text-center 
                  text-sm
                  font-medium 
                  ${isSelected ? 'text-[#FF6600]' : 'text-gray-800'}
                `}>
                  {opt.label}
                </span>
              </div>
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
