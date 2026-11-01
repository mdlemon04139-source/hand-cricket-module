import React from 'react';
import { motion } from 'motion/react';
import { GestureVariationId, HandNumber } from '../../types/handCricket';
import {
  getDefaultGestureForNumber,
  HAND_GESTURE_REGISTRY,
} from '../data/gestureRegistry';

interface HandGestureIllustrationProps {
  gestureId?: GestureVariationId;
  number?: HandNumber;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  mirrored?: boolean;
  shake?: boolean;
  pump?: boolean;
  isFist?: boolean;
  showBadge?: boolean;
  className?: string;
}

const SIZE_MAP: Record<NonNullable<HandGestureIllustrationProps['size']>, string> = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8 sm:w-9 sm:h-9',
  md: 'w-11 h-11 sm:w-12 sm:h-12',
  lg: 'w-14 h-14 sm:w-16 sm:h-16',
  xl: 'w-16 h-16 sm:w-20 sm:h-20',
  '2xl': 'w-20 h-20 sm:w-24 sm:h-24',
};

interface FingerState {
  thumbExtended: boolean;
  indexExtended: boolean;
  middleExtended: boolean;
  ringExtended: boolean;
  littleExtended: boolean;
  tiltDeg?: number;
  spreadMode?: 'normal' | 'tight' | 'wide';
  wristAccent?: string;
  powerArc?: boolean;
}

const FINGER_STATES: Record<
  Exclude<GestureVariationId, '5_FALLBACK'>,
  FingerState
> = {
  '1A': {
    thumbExtended: false,
    indexExtended: true,
    middleExtended: false,
    ringExtended: false,
    littleExtended: false,
    wristAccent: '#10b981',
  },
  '1B': {
    thumbExtended: false,
    indexExtended: false,
    middleExtended: true,
    ringExtended: false,
    littleExtended: false,
    wristAccent: '#06b6d4',
  },
  '1C': {
    thumbExtended: false,
    indexExtended: false,
    middleExtended: false,
    ringExtended: true,
    littleExtended: false,
    wristAccent: '#f59e0b',
  },
  '2A': {
    thumbExtended: false,
    indexExtended: true,
    middleExtended: true,
    ringExtended: false,
    littleExtended: false,
    spreadMode: 'wide',
    wristAccent: '#10b981',
  },
  '2B': {
    thumbExtended: true,
    indexExtended: true,
    middleExtended: false,
    ringExtended: false,
    littleExtended: false,
    wristAccent: '#06b6d4',
  },
  '2C': {
    thumbExtended: false,
    indexExtended: false,
    middleExtended: true,
    ringExtended: true,
    littleExtended: false,
    wristAccent: '#f59e0b',
  },
  '3A': {
    thumbExtended: false,
    indexExtended: true,
    middleExtended: true,
    ringExtended: true,
    littleExtended: false,
    wristAccent: '#10b981',
  },
  '3B': {
    thumbExtended: false,
    indexExtended: false,
    middleExtended: true,
    ringExtended: true,
    littleExtended: true,
    wristAccent: '#06b6d4',
  },
  '3C': {
    thumbExtended: true,
    indexExtended: true,
    middleExtended: true,
    ringExtended: false,
    littleExtended: false,
    wristAccent: '#f59e0b',
  },
  '4A': {
    thumbExtended: false,
    indexExtended: false,
    middleExtended: false,
    ringExtended: false,
    littleExtended: true,
    wristAccent: '#38bdf8',
  },
  '4B': {
    thumbExtended: false,
    indexExtended: true,
    middleExtended: true,
    ringExtended: true,
    littleExtended: true,
    spreadMode: 'normal',
    wristAccent: '#0ea5e9',
  },
  '4C': {
    thumbExtended: true,
    indexExtended: true,
    middleExtended: false,
    ringExtended: true,
    littleExtended: true,
    spreadMode: 'wide',
    wristAccent: '#0284c7',
  },
  '5A': {
    thumbExtended: true,
    indexExtended: true,
    middleExtended: true,
    ringExtended: true,
    littleExtended: true,
    spreadMode: 'wide',
    wristAccent: '#a855f7',
  },
  '5B': {
    thumbExtended: true,
    indexExtended: true,
    middleExtended: true,
    ringExtended: true,
    littleExtended: true,
    spreadMode: 'tight',
    tiltDeg: 5,
    wristAccent: '#ec4899',
  },
  '5C': {
    thumbExtended: true,
    indexExtended: true,
    middleExtended: true,
    ringExtended: true,
    littleExtended: true,
    spreadMode: 'normal',
    tiltDeg: -10,
    powerArc: true,
    wristAccent: '#8b5cf6',
  },
  '6A': {
    thumbExtended: true,
    indexExtended: false,
    middleExtended: false,
    ringExtended: false,
    littleExtended: false,
    wristAccent: '#f59e0b',
  },
  '6B': {
    thumbExtended: true,
    indexExtended: false,
    middleExtended: false,
    ringExtended: false,
    littleExtended: true,
    spreadMode: 'wide',
    wristAccent: '#eab308',
  },
  '6C': {
    thumbExtended: true,
    indexExtended: false,
    middleExtended: false,
    ringExtended: false,
    littleExtended: false,
    tiltDeg: 14,
    powerArc: true,
    wristAccent: '#ef4444',
  },
};

export const HandGestureIllustration: React.FC<HandGestureIllustrationProps> = ({
  gestureId,
  number,
  size = 'md',
  mirrored = false,
  shake = false,
  pump = false,
  isFist = false,
  showBadge = false,
  className = '',
}) => {
  const resolvedId: GestureVariationId =
    gestureId || (number ? getDefaultGestureForNumber(number) : '1A');
  const def = HAND_GESTURE_REGISTRY[resolvedId] || HAND_GESTURE_REGISTRY['1A'];
  const uid = React.useId().replace(/:/g, '');

  // Explicit numeric fallback for legacy '5_FALLBACK' ONLY when not in closed-fist pumping state
  if (!isFist && (resolvedId === '5_FALLBACK' || !def.isApprovedIllustration)) {
    return (
      <motion.div
        animate={
          shake
            ? { scale: [0.76, 1.12, 1], y: [-8, 0] }
            : { scale: 1, y: 0 }
        }
        transition={{ duration: 0.32, ease: 'easeOut' }}
        className={`relative inline-flex items-center justify-center select-none ${SIZE_MAP[size]} ${className}`}
        title={def.labelEn}
      >
        <div className="w-full h-full rounded-xl bg-gradient-to-br from-amber-500/30 via-slate-900 to-slate-950 border-2 border-amber-400/80 shadow-[0_0_16px_rgba(245,158,11,0.25)] flex flex-col items-center justify-center relative overflow-hidden">
          <span className="font-mono font-black text-amber-300 leading-none text-[1.15em] sm:text-[1.35em] drop-shadow">
            5
          </span>
          <span className="text-[7px] font-mono uppercase tracking-wider text-amber-200/80 leading-tight">
            RUNS
          </span>
        </div>
        {showBadge && (
          <span className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-500 text-slate-950 font-mono font-black text-[10px] flex items-center justify-center shadow border border-slate-950">
            5
          </span>
        )}
      </motion.div>
    );
  }

  const state: FingerState = isFist
    ? {
        thumbExtended: false,
        indexExtended: false,
        middleExtended: false,
        ringExtended: false,
        littleExtended: false,
        wristAccent: '#64748b',
      }
    : FINGER_STATES[resolvedId as Exclude<GestureVariationId, '5_FALLBACK'>] ||
      FINGER_STATES['1A'];

  const poseTilt = state.tiltDeg || 0;
  const isTight = state.spreadMode === 'tight';
  const isWide = state.spreadMode === 'wide';

  return (
    <motion.div
      animate={
        pump
          ? {
              y: [0, -16, 4, -16, 4, -16, 0],
              rotate: mirrored
                ? [0, 12, -5, 12, -5, 12, 0]
                : [0, -12, 5, -12, 5, -12, 0],
              scale: [1, 1.04, 0.97, 1.04, 0.97, 1.06, 1],
            }
          : shake
          ? {
              scale: [0.76, 1.12, 1],
              y: [-8, 2, 0],
            }
          : { y: 0, rotate: 0, scale: 1 }
      }
      transition={
        pump
          ? { duration: 0.85, ease: 'easeInOut' }
          : { duration: 0.35, ease: 'easeOut' }
      }
      className={`relative inline-flex items-center justify-center select-none ${SIZE_MAP[size]} ${className}`}
      title={isFist ? 'Ready' : `${def.labelEn} (${def.fingerDescriptionEn})`}
    >
      <svg
        viewBox="0 0 200 220"
        className={`w-full h-full overflow-visible drop-shadow-[0_6px_12px_rgba(0,0,0,0.55)] ${
          mirrored ? '-scale-x-100' : ''
        }`}
        aria-label={def.labelEn}
        role="img"
      >
        <defs>
          {/* Semi-realistic warm palm skin tone gradient */}
          <linearGradient id={`palmGrad_${uid}`} x1="20%" y1="10%" x2="85%" y2="95%">
            <stop offset="0%" stopColor="#F5C7A3" />
            <stop offset="48%" stopColor="#E3A87E" />
            <stop offset="85%" stopColor="#C8875B" />
            <stop offset="100%" stopColor="#A96940" />
          </linearGradient>

          {/* Extended finger cylindrical lighting */}
          <linearGradient id={`fingerExt_${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D6956A" />
            <stop offset="35%" stopColor="#F7CEAD" />
            <stop offset="70%" stopColor="#E6AC82" />
            <stop offset="100%" stopColor="#B8764B" />
          </linearGradient>

          {/* Curled finger shadow gradient */}
          <linearGradient id={`fingerCurl_${uid}`} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#ECC09C" />
            <stop offset="55%" stopColor="#CF8E62" />
            <stop offset="100%" stopColor="#9C5D35" />
          </linearGradient>

          {/* Fingernail sheen */}
          <linearGradient id={`nailGrad_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FCE7D6" />
            <stop offset="100%" stopColor="#E5B696" />
          </linearGradient>
        </defs>

        <g transform={poseTilt ? `rotate(${poseTilt} 105 145)` : undefined}>
          {/* Dynamic Power/Spin Arc for C-variations (5C, 6C) */}
          {state.powerArc && !isFist && (
            <path
              d="M 24 62 Q 102 -6 178 62"
              stroke={state.wristAccent || '#f59e0b'}
              strokeWidth="4"
              strokeDasharray="6 4"
              fill="none"
              opacity="0.75"
            />
          )}

          {/* WRIST & SPORTSWEAR WRISTBAND */}
          <path
            d="M 76 186 L 72 214 Q 108 220 144 214 L 138 186 Z"
            fill={`url(#palmGrad_${uid})`}
            stroke="#7A4424"
            strokeWidth="2.5"
          />
          <rect
            x="72"
            y="194"
            width="68"
            height="14"
            rx="5"
            fill={state.wristAccent || '#10b981'}
            stroke="#0f172a"
            strokeWidth="2"
          />

        {/* EXTENDED FINGERS (Drawn behind upper palm mount for seamless anatomy) */}

        {/* 1. INDEX FINGER EXTENDED */}
        {state.indexExtended && (
          <g
            transform={
              isWide
                ? 'rotate(-9 76 108)'
                : isTight
                ? 'rotate(4 76 108)'
                : undefined
            }
          >
            <path
              d="M 65 108 L 58 34 Q 58 18 71 18 Q 84 18 85 34 L 89 108 Z"
              fill={`url(#fingerExt_${uid})`}
              stroke="#7A4424"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            {/* Phalangeal joint creases (palm-side) */}
            <path d="M 63 48 Q 72 51 82 48" stroke="#9E5E36" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M 64 75 Q 74 78 84 75" stroke="#9E5E36" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            {/* Finger pad highlight */}
            <ellipse cx="71.5" cy="31" rx="6.5" ry="8" fill="#FADAC1" opacity="0.45" />
          </g>
        )}

        {/* 2. MIDDLE FINGER EXTENDED */}
        {state.middleExtended && (
          <g
            transform={
              isWide
                ? 'rotate(-2 101 105)'
                : isTight
                ? 'rotate(1 101 105)'
                : undefined
            }
          >
            <path
              d="M 88 105 L 88 22 Q 88 6 101 6 Q 114 6 114 22 L 114 105 Z"
              fill={`url(#fingerExt_${uid})`}
              stroke="#7A4424"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            {/* Phalangeal joint creases */}
            <path d="M 91 40 Q 101 43 111 40" stroke="#9E5E36" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M 91 70 Q 101 73 111 70" stroke="#9E5E36" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            {/* Finger pad highlight */}
            <ellipse cx="101" cy="20" rx="6.5" ry="8.5" fill="#FADAC1" opacity="0.45" />
          </g>
        )}

        {/* 3. RING FINGER EXTENDED */}
        {state.ringExtended && (
          <g
            transform={
              isWide
                ? 'rotate(6 125 108)'
                : isTight
                ? 'rotate(-3 125 108)'
                : undefined
            }
          >
            <path
              d="M 113 108 L 116 32 Q 117 16 129 17 Q 141 18 140 34 L 136 110 Z"
              fill={`url(#fingerExt_${uid})`}
              stroke="#7A4424"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            {/* Phalangeal joint creases */}
            <path d="M 118 48 Q 128 51 137 49" stroke="#9E5E36" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M 116 76 Q 126 79 136 77" stroke="#9E5E36" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            {/* Finger pad highlight */}
            <ellipse cx="128" cy="30" rx="6" ry="8" fill="#FADAC1" opacity="0.45" />
          </g>
        )}

        {/* 4. LITTLE FINGER EXTENDED */}
        {state.littleExtended && (
          <g
            transform={
              isWide
                ? 'rotate(11 145 118)'
                : isTight
                ? 'rotate(-5 145 118)'
                : undefined
            }
          >
            <path
              d="M 135 116 L 143 52 Q 145 38 156 40 Q 167 42 164 56 L 155 122 Z"
              fill={`url(#fingerExt_${uid})`}
              stroke="#7A4424"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            {/* Phalangeal joint creases */}
            <path d="M 144 67 Q 152 70 160 69" stroke="#9E5E36" strokeWidth="1.7" fill="none" strokeLinecap="round" />
            <path d="M 140 91 Q 149 94 157 93" stroke="#9E5E36" strokeWidth="1.7" fill="none" strokeLinecap="round" />
            {/* Finger pad highlight */}
            <ellipse cx="154" cy="51" rx="5.2" ry="6.8" fill="#FADAC1" opacity="0.45" />
          </g>
        )}

        {/* MAIN PALM BODY (Facing Camera) */}
        <path
          d="M 62 104 Q 88 96 114 98 Q 140 100 156 115 Q 163 145 153 172 Q 145 191 128 193 L 84 193 Q 64 190 56 168 Q 50 144 62 104 Z"
          fill={`url(#palmGrad_${uid})`}
          stroke="#7A4424"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />

        {/* PALMAR CREASES (Heart Line, Head Line, Life Line, Thenar Eminence) */}
        {/* Heart line */}
        <path
          d="M 151 129 Q 118 123 84 118"
          stroke="#9A5932"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          opacity="0.75"
        />
        {/* Head line */}
        <path
          d="M 66 131 Q 104 134 138 145"
          stroke="#9A5932"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          opacity="0.75"
        />
        {/* Life line */}
        <path
          d="M 69 125 Q 92 146 92 184"
          stroke="#8F4E27"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          opacity="0.8"
        />
        {/* Subtle palm center contour */}
        <ellipse cx="112" cy="148" rx="22" ry="18" fill="#B57247" opacity="0.2" />

        {/* CURLED FINGERS (Drawn over upper palm when folded in) */}

        {/* 1. INDEX FINGER CURLED */}
        {!state.indexExtended && (
          <g>
            <rect
              x="62"
              y="88"
              width="25"
              height="48"
              rx="12"
              fill={`url(#fingerCurl_${uid})`}
              stroke="#7A4424"
              strokeWidth="2.5"
            />
            <path d="M 65 106 Q 74 109 84 106" stroke="#8C4D27" strokeWidth="1.6" fill="none" />
            {/* Fingernail visible at bottom of curled tip */}
            <path
              d="M 68 122 Q 74.5 119 81 122 L 80 131 Q 74.5 134 69 131 Z"
              fill={`url(#nailGrad_${uid})`}
              stroke="#8C4D27"
              strokeWidth="1.2"
            />
          </g>
        )}

        {/* 2. MIDDLE FINGER CURLED */}
        {!state.middleExtended && (
          <g>
            <rect
              x="88"
              y="84"
              width="26"
              height="52"
              rx="12.5"
              fill={`url(#fingerCurl_${uid})`}
              stroke="#7A4424"
              strokeWidth="2.5"
            />
            <path d="M 91 104 Q 101 107 111 104" stroke="#8C4D27" strokeWidth="1.6" fill="none" />
            <path
              d="M 94 121 Q 101 118 108 121 L 107 131 Q 101 134 95 131 Z"
              fill={`url(#nailGrad_${uid})`}
              stroke="#8C4D27"
              strokeWidth="1.2"
            />
          </g>
        )}

        {/* 3. RING FINGER CURLED */}
        {!state.ringExtended && (
          <g>
            <rect
              x="114"
              y="88"
              width="24"
              height="50"
              rx="11.5"
              fill={`url(#fingerCurl_${uid})`}
              stroke="#7A4424"
              strokeWidth="2.5"
            />
            <path d="M 117 107 Q 126 110 135 107" stroke="#8C4D27" strokeWidth="1.6" fill="none" />
            <path
              d="M 120 123 Q 126 120 132 123 L 131 132 Q 126 135 121 132 Z"
              fill={`url(#nailGrad_${uid})`}
              stroke="#8C4D27"
              strokeWidth="1.2"
            />
          </g>
        )}

        {/* 4. LITTLE FINGER CURLED */}
        {!state.littleExtended && (
          <g>
            <rect
              x="137"
              y="97"
              width="22"
              height="45"
              rx="10.5"
              fill={`url(#fingerCurl_${uid})`}
              stroke="#7A4424"
              strokeWidth="2.5"
            />
            <path d="M 140 114 Q 148 117 156 114" stroke="#8C4D27" strokeWidth="1.5" fill="none" />
            <path
              d="M 142 128 Q 148 125 154 128 L 153 136 Q 148 139 143 136 Z"
              fill={`url(#nailGrad_${uid})`}
              stroke="#8C4D27"
              strokeWidth="1.2"
            />
          </g>
        )}

        {/* 5. THUMB (EXTENDED OUTWARD vs FOLDED ACROSS PALM) */}
        {state.thumbExtended ? (
          <g
            transform={
              isWide
                ? 'rotate(-8 58 148)'
                : isTight
                ? 'rotate(7 58 148)'
                : undefined
            }
          >
            <path
              d="M 64 166 Q 48 156 32 136 Q 15 116 14 102 Q 13 88 26 86 Q 39 84 50 102 L 70 132 Q 77 148 64 166 Z"
              fill={`url(#fingerExt_${uid})`}
              stroke="#7A4424"
              strokeWidth="2.7"
              strokeLinejoin="round"
            />
            {/* Thumb joint crease */}
            <path d="M 35 118 Q 43 113 49 107" stroke="#9E5E36" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            {/* Thumb pad highlight */}
            <ellipse
              cx="27"
              cy="99"
              rx="6"
              ry="8"
              transform="rotate(-32 27 99)"
              fill="#FADAC1"
              opacity="0.45"
            />
          </g>
        ) : (
          <g>
            <path
              d="M 56 158 Q 52 136 68 125 L 102 122 Q 116 122 117 134 Q 118 146 103 148 L 76 155 Q 66 164 56 158 Z"
              fill={`url(#fingerCurl_${uid})`}
              stroke="#7A4424"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            {/* Thumb knuckle crease */}
            <path d="M 79 127 Q 81 137 78 147" stroke="#8C4D27" strokeWidth="1.7" fill="none" strokeLinecap="round" />
            {/* Thumbnail side profile */}
            <path
              d="M 102 126 Q 112 126 113 133 Q 112 140 102 140 Z"
              fill={`url(#nailGrad_${uid})`}
              stroke="#8C4D27"
              strokeWidth="1.2"
            />
          </g>
        )}
        </g>
      </svg>

      {showBadge && !isFist && (
        <span className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-500 text-slate-950 font-mono font-black text-[10px] flex items-center justify-center shadow border border-slate-950">
          {def.numericValue}
        </span>
      )}
    </motion.div>
  );
};
