'use client';

import React, { useEffect, useState } from 'react'
import Image from 'next/image'

export type RoleKey =
  | 'software-engineer'
  | 'data-scientist'
  | 'cloud-engineer';

interface RoleInfo {
  key: RoleKey;
  label: string;
  svgPath: string;
}

interface RoleCarouselProps {
  onConfirm: (role: RoleKey) => void;
  unavailableRoles?: RoleKey[];
}

/**
 * RoleCarousel now filters out any roles whose key is in `unavailableRoles`.
 * Also disables Confirm if the currently displayed role is in that unavailable list.
 */
export default function RoleCarousel({
  onConfirm,
  unavailableRoles = [],
}: RoleCarouselProps) {
    // Full master list of roles
    const ALL_ROLES: RoleInfo[] = [
        {
        key: 'software-engineer',
        label: 'Software Engineer',
        svgPath: '/roles/swe.svg',
        },
        {
        key: 'data-scientist',
        label: 'Data Science / AI Engineer',
        svgPath: '/roles/ds.svg',
        },
        {
        key: 'cloud-engineer',
        label: 'Cloud Engineer',
        svgPath: '/roles/ce.svg',
        },
    ];
    
    // Filter out roles that are already taken:
    const availableRoles: RoleInfo[] = ALL_ROLES.filter(
        (r) => !unavailableRoles.includes(r.key)
    );

    // Track which index (in availableRoles) is currently visible
    const [currentIdx, setCurrentIdx] = useState(0);

    // Synchronously clamp `currentIdx` to be within [0 .. availableRoles.length - 1]
    const safeIdx = currentIdx >= availableRoles.length
    ? 0
    : currentIdx;

    // Whenever unavailableRoles changes, clamp the index if needed
    useEffect(() => {
        if (currentIdx >= availableRoles.length) {
            setCurrentIdx(0);
        }
    }, [availableRoles.length, currentIdx]);

    // If everything is taken (edge case), we simply render nothing:
    if (availableRoles.length === 0) {
        return (
        <div className="text-center text-gray-400">
            All roles have been selected already.
        </div>
        );
    }
        
    // Helper to go to previous in circular fashion
    const prevRole = () => {
        if (availableRoles.length === 0) return;
        setCurrentIdx((prev) =>
            prev === 0 ? availableRoles.length - 1 : prev - 1
        );
    };

    // Helper to go to next in circular fashion
    const nextRole = () => {
        if (availableRoles.length === 0) return;
        setCurrentIdx((prev) =>
            prev === availableRoles.length - 1 ? 0 : prev + 1
        );
    };

    const currentRole = availableRoles[safeIdx];

    return (
        <div className="w-full flex flex-col items-center">
        <h3 className="text-xl text-[#FF6600] uppercase tracking-wider font-semibold">
            Pick Your Role
        </h3>

        <div className="relative w-full max-w-xs">
            {/* Left arrow */}
            <button
            onClick={prevRole}
            className="
                absolute left-0 top-1/2 transform -translate-y-1/2
                text-2xl text-gray-400 hover:text-gray-200
                px-2 py-1 bg-black/50 rounded-full
            "
            aria-label="Previous Role"
            >
            ‹
            </button>

            {/* Current role’s SVG + label */}
            <div className="flex flex-col items-center">
            <Image
                src={currentRole.svgPath}
                alt={currentRole.label}
                width={192}
                height={192}
                className="w-48 h-48 object-contain"
                priority
            />
            <span className="text-lg text-gray-200 font-medium">
                {currentRole.label}
            </span>
            </div>

            {/* Right arrow */}
            <button
            onClick={nextRole}
            className="
                absolute right-0 top-1/2 transform -translate-y-1/2
                text-2xl text-gray-400 hover:text-gray-200
                px-2 py-1 bg-black/50 rounded-full
            "
            aria-label="Next Role"
            >
            ›
            </button>
        </div>

        {/* Confirm button: only enabled if there is at least one available role */}
        <button
            onClick={() => onConfirm(currentRole.key)}
            className={`
            mt-6 px-6 py-2
            bg-[#FF6600] text-black
            uppercase tracking-wide font-semibold
            rounded-lg
            hover:bg-[#b34400]
            transition duration-200
            hover:cursor-pointer
            `}
        >
            Confirm
        </button>
        </div>
    );
    }
