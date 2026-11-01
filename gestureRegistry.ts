import {
  GestureVariationId,
  HandGestureDefinition,
  HandNumber,
} from '../../types/handCricket';

export const HAND_GESTURE_REGISTRY: Record<
  GestureVariationId,
  HandGestureDefinition
> = {
  '1A': {
    id: '1A',
    numericValue: 1,
    labelBn: '১ রান (তর্জনী)',
    labelEn: '1 Run (Index Finger)',
    fingerDescriptionBn: 'তর্জনী আঙুল উত্থাপিত',
    fingerDescriptionEn: 'Index finger extended straight up',
    isApprovedIllustration: true,
    isPrimaryForNumber: true,
  },
  '1B': {
    id: '1B',
    numericValue: 1,
    labelBn: '১ রান (মধ্যমা)',
    labelEn: '1 Run (Middle Finger)',
    fingerDescriptionBn: 'মধ্যমা আঙুল উত্থাপিত',
    fingerDescriptionEn: 'Middle finger extended straight up',
    isApprovedIllustration: true,
    isPrimaryForNumber: false,
  },
  '1C': {
    id: '1C',
    numericValue: 1,
    labelBn: '১ রান (অনামিকা)',
    labelEn: '1 Run (Ring Finger)',
    fingerDescriptionBn: 'অনামিকা আঙুল উত্থাপিত',
    fingerDescriptionEn: 'Ring finger extended straight up',
    isApprovedIllustration: true,
    isPrimaryForNumber: false,
  },
  '2A': {
    id: '2A',
    numericValue: 2,
    labelBn: '২ রান (তর্জনী + মধ্যমা)',
    labelEn: '2 Runs (Index + Middle)',
    fingerDescriptionBn: 'তর্জনী ও মধ্যমা আঙুল উত্থাপিত',
    fingerDescriptionEn: 'Index and Middle fingers extended (V-pose)',
    isApprovedIllustration: true,
    isPrimaryForNumber: true,
  },
  '2B': {
    id: '2B',
    numericValue: 2,
    labelBn: '২ রান (বৃদ্ধাঙ্গুলি + তর্জনী)',
    labelEn: '2 Runs (Thumb + Index)',
    fingerDescriptionBn: 'বৃদ্ধাঙ্গুলি ও তর্জনী আঙুল উত্থাপিত',
    fingerDescriptionEn: 'Thumb and Index fingers extended (L-pose)',
    isApprovedIllustration: true,
    isPrimaryForNumber: false,
  },
  '2C': {
    id: '2C',
    numericValue: 2,
    labelBn: '২ রান (মধ্যমা + অনামিকা)',
    labelEn: '2 Runs (Middle + Ring)',
    fingerDescriptionBn: 'মধ্যমা ও অনামিকা আঙুল উত্থাপিত',
    fingerDescriptionEn: 'Middle and Ring fingers extended together',
    isApprovedIllustration: true,
    isPrimaryForNumber: false,
  },
  '3A': {
    id: '3A',
    numericValue: 3,
    labelBn: '৩ রান (তর্জনী + মধ্যমা + অনামিকা)',
    labelEn: '3 Runs (Index + Middle + Ring)',
    fingerDescriptionBn: 'তর্জনী, মধ্যমা ও অনামিকা আঙুল উত্থাপিত',
    fingerDescriptionEn: 'Index, Middle, and Ring fingers extended',
    isApprovedIllustration: true,
    isPrimaryForNumber: true,
  },
  '3B': {
    id: '3B',
    numericValue: 3,
    labelBn: '৩ রান (মধ্যমা + অনামিকা + কনিষ্ঠা)',
    labelEn: '3 Runs (Middle + Ring + Little)',
    fingerDescriptionBn: 'মধ্যমা, অনামিকা ও কনিষ্ঠা আঙুল উত্থাপিত',
    fingerDescriptionEn: 'Middle, Ring, and Little fingers extended',
    isApprovedIllustration: true,
    isPrimaryForNumber: false,
  },
  '3C': {
    id: '3C',
    numericValue: 3,
    labelBn: '৩ রান (বৃদ্ধাঙ্গুলি + তর্জনী + মধ্যমা)',
    labelEn: '3 Runs (Thumb + Index + Middle)',
    fingerDescriptionBn: 'বৃদ্ধাঙ্গুলি, তর্জনী ও মধ্যমা উত্থাপিত',
    fingerDescriptionEn: 'Thumb, Index, and Middle fingers extended',
    isApprovedIllustration: true,
    isPrimaryForNumber: false,
  },
  '4A': {
    id: '4A',
    numericValue: 4,
    labelBn: '৪ রান (কনিষ্ঠা — বাউন্ডারি)',
    labelEn: '4 Runs (Little Finger — Boundary)',
    fingerDescriptionBn: 'কনিষ্ঠা আঙুল উত্থাপিত (ক্লাসিক চার)',
    fingerDescriptionEn: 'Little finger extended (classic boundary)',
    isApprovedIllustration: true,
    isPrimaryForNumber: true,
  },
  '4B': {
    id: '4B',
    numericValue: 4,
    labelBn: '৪ রান (চার আঙুল প্রসারিত)',
    labelEn: '4 Runs (Four Fingers Extended)',
    fingerDescriptionBn: 'বৃদ্ধাঙ্গুলি ভাঁজ করে চার আঙুল উত্থাপিত',
    fingerDescriptionEn: 'Index, Middle, Ring, and Little fingers extended',
    isApprovedIllustration: true,
    isPrimaryForNumber: false,
  },
  '4C': {
    id: '4C',
    numericValue: 4,
    labelBn: '৪ রান (কর্নার ফোর স্টাইল)',
    labelEn: '4 Runs (Thumb + Index + Little)',
    fingerDescriptionBn: 'বৃদ্ধাঙ্গুলি, তর্জনী, অনামিকা ও কনিষ্ঠা প্রসারিত',
    fingerDescriptionEn: 'Wide boundary spread pose (Thumb + Index + Ring + Little)',
    isApprovedIllustration: true,
    isPrimaryForNumber: false,
  },
  '5A': {
    id: '5A',
    numericValue: 5,
    labelBn: '৫ রান (খোলা পাঞ্জা — ৫ আঙুল)',
    labelEn: '5 Runs (Open Spread Palm)',
    fingerDescriptionBn: 'পাঁচটি আঙুল সম্পূর্ণ প্রসারিত খোলা হাত',
    fingerDescriptionEn: 'All five fingers wide open palm',
    isApprovedIllustration: true,
    isPrimaryForNumber: true,
  },
  '5B': {
    id: '5B',
    numericValue: 5,
    labelBn: '৫ রান (টানটান পাঁচ আঙুল)',
    labelEn: '5 Runs (Upright Tight Five)',
    fingerDescriptionBn: 'পাঁচটি আঙুল একসাথে সোজা টানটান',
    fingerDescriptionEn: 'All five fingers upright in tight formation',
    isApprovedIllustration: true,
    isPrimaryForNumber: false,
  },
  '5C': {
    id: '5C',
    numericValue: 5,
    labelBn: '৫ রান (স্পিন গ্রিপ পাঞ্জা)',
    labelEn: '5 Runs (Angled Spin-Grip Five)',
    fingerDescriptionBn: 'কৌণিক স্পিন গ্রিপ ভঙ্গিতে পাঁচ আঙুল',
    fingerDescriptionEn: 'Dynamic angled five-finger spin-grip pose',
    isApprovedIllustration: true,
    isPrimaryForNumber: false,
  },
  '5_FALLBACK': {
    id: '5_FALLBACK',
    numericValue: 5,
    labelBn: '৫ রান (সংখ্যাসূচক নির্বাচন)',
    labelEn: '5 Runs (Numeric Selection Fallback)',
    fingerDescriptionBn: '৫ সংখ্যার সংখ্যাসূচক প্রতীক',
    fingerDescriptionEn: 'Legacy numeric selection 5',
    isApprovedIllustration: false,
    isPrimaryForNumber: false,
  },
  '6A': {
    id: '6A',
    numericValue: 6,
    labelBn: '৬ রান (বৃদ্ধাঙ্গুলি — ছক্কা)',
    labelEn: '6 Runs (Classic Thumb Sixer)',
    fingerDescriptionBn: 'বৃদ্ধাঙ্গুলি উত্থাপিত (ক্লাসিক ছক্কা)',
    fingerDescriptionEn: 'Thumb extended outward (classic sixer)',
    isApprovedIllustration: true,
    isPrimaryForNumber: true,
  },
  '6B': {
    id: '6B',
    numericValue: 6,
    labelBn: '৬ রান (শাকা ছক্কা — থাম্ব + কনিষ্ঠা)',
    labelEn: '6 Runs (Shaka Six — Thumb + Little)',
    fingerDescriptionBn: 'বৃদ্ধাঙ্গুলি ও কনিষ্ঠা আঙুল প্রসারিত ছক্কা',
    fingerDescriptionEn: 'Thumb and Little finger extended (Shaka Sixer)',
    isApprovedIllustration: true,
    isPrimaryForNumber: false,
  },
  '6C': {
    id: '6C',
    numericValue: 6,
    labelBn: '৬ রান (পাওয়ার আপারকাট থাম্ব)',
    labelEn: '6 Runs (Power Uppercut Six)',
    fingerDescriptionBn: 'উঁচু কোণে শক্তিশালী বৃদ্ধাঙ্গুলি ছক্কা',
    fingerDescriptionEn: 'Angled high power-thumb sixer pose',
    isApprovedIllustration: true,
    isPrimaryForNumber: false,
  },
};

export const HAND_NUMBERS: HandNumber[] = [1, 2, 3, 4, 5, 6];

export const ALL_18_GESTURE_VARIATIONS: GestureVariationId[] = [
  '1A',
  '1B',
  '1C',
  '2A',
  '2B',
  '2C',
  '3A',
  '3B',
  '3C',
  '4A',
  '4B',
  '4C',
  '5A',
  '5B',
  '5C',
  '6A',
  '6B',
  '6C',
];

export const GESTURES_BY_NUMBER: Record<HandNumber, HandGestureDefinition[]> = {
  1: [
    HAND_GESTURE_REGISTRY['1A'],
    HAND_GESTURE_REGISTRY['1B'],
    HAND_GESTURE_REGISTRY['1C'],
  ],
  2: [
    HAND_GESTURE_REGISTRY['2A'],
    HAND_GESTURE_REGISTRY['2B'],
    HAND_GESTURE_REGISTRY['2C'],
  ],
  3: [
    HAND_GESTURE_REGISTRY['3A'],
    HAND_GESTURE_REGISTRY['3B'],
    HAND_GESTURE_REGISTRY['3C'],
  ],
  4: [
    HAND_GESTURE_REGISTRY['4A'],
    HAND_GESTURE_REGISTRY['4B'],
    HAND_GESTURE_REGISTRY['4C'],
  ],
  5: [
    HAND_GESTURE_REGISTRY['5A'],
    HAND_GESTURE_REGISTRY['5B'],
    HAND_GESTURE_REGISTRY['5C'],
  ],
  6: [
    HAND_GESTURE_REGISTRY['6A'],
    HAND_GESTURE_REGISTRY['6B'],
    HAND_GESTURE_REGISTRY['6C'],
  ],
};

export type GestureVariationLetter = 'A' | 'B' | 'C';

export interface ParsedHandSelection {
  selectionId: GestureVariationId;
  number: HandNumber;
  variation: GestureVariationLetter;
  isValid: boolean;
}

export function isValidSelectionId(value: unknown): value is GestureVariationId {
  if (typeof value !== 'string') return false;
  return (ALL_18_GESTURE_VARIATIONS as readonly string[]).includes(value) || value === '5_FALLBACK';
}

export function extractGestureVariationLetter(
  gestureId: GestureVariationId
): GestureVariationLetter {
  if (gestureId === '5_FALLBACK') return 'A';
  const letter = gestureId.slice(1);
  if (letter === 'A' || letter === 'B' || letter === 'C') {
    return letter;
  }
  return 'A';
}

/**
 * Validates and parses a player or AI hand selection into its authoritative components:
 * - selectionId (e.g., '1A'..'6C')
 * - number (1..6)
 * - variation ('A' | 'B' | 'C')
 * - isValid (boolean)
 * Never throws on malformed data; returns isValid: false if input is missing or invalid.
 */
export function parseHandSelection(
  input: unknown,
  expectedNumber?: unknown
): ParsedHandSelection {
  // Case 1: String GestureVariationId (e.g., '1A', '2B', '6C')
  if (typeof input === 'string') {
    const trimmed = input.trim() as GestureVariationId;
    if (isValidSelectionId(trimmed)) {
      const def = HAND_GESTURE_REGISTRY[trimmed];
      const canonicalId: GestureVariationId =
        trimmed === '5_FALLBACK' ? '5A' : trimmed;
      const num = def.numericValue;
      const variation = extractGestureVariationLetter(canonicalId);

      if (
        expectedNumber !== undefined &&
        (typeof expectedNumber !== 'number' || expectedNumber !== num)
      ) {
        return {
          selectionId: canonicalId,
          number: num,
          variation,
          isValid: false,
        };
      }

      return {
        selectionId: canonicalId,
        number: num,
        variation,
        isValid: true,
      };
    }
    return {
      selectionId: '1A',
      number: 1,
      variation: 'A',
      isValid: false,
    };
  }

  // Case 2: Legacy/numeric-only input (1..6) -> maps to primary 'A' variation (1A..6A)
  if (
    typeof input === 'number' &&
    Number.isInteger(input) &&
    input >= 1 &&
    input <= 6
  ) {
    const num = input as HandNumber;
    const defaultId = getDefaultGestureForNumber(num);
    return {
      selectionId: defaultId,
      number: num,
      variation: extractGestureVariationLetter(defaultId),
      isValid: true,
    };
  }

  // Invalid / malformed input
  return {
    selectionId: '1A',
    number: 1,
    variation: 'A',
    isValid: false,
  };
}

export function resolveGestureNumericValue(
  gestureOrNumber: GestureVariationId | HandNumber
): HandNumber {
  if (typeof gestureOrNumber === 'number') {
    if (
      Number.isInteger(gestureOrNumber) &&
      gestureOrNumber >= 1 &&
      gestureOrNumber <= 6
    ) {
      return gestureOrNumber as HandNumber;
    }
    throw new Error(`Invalid hand cricket number: ${gestureOrNumber}`);
  }
  const def = HAND_GESTURE_REGISTRY[gestureOrNumber];
  if (!def) {
    throw new Error(`Unknown gesture variation ID: ${gestureOrNumber}`);
  }
  return def.numericValue;
}

export function getDefaultGestureForNumber(
  num: HandNumber
): GestureVariationId {
  const list = GESTURES_BY_NUMBER[num];
  const primary = list.find((g) => g.isPrimaryForNumber) || list[0];
  return primary.id;
}

export function getRandomGestureForNumber(num: HandNumber): GestureVariationId {
  const list = GESTURES_BY_NUMBER[num];
  const idx = Math.floor(Math.random() * list.length);
  return list[idx].id;
}

export function isValidGestureForNumber(
  gestureId: GestureVariationId,
  num: HandNumber
): boolean {
  if (!isValidSelectionId(gestureId)) return false;
  const def = HAND_GESTURE_REGISTRY[gestureId];
  return Boolean(def && def.numericValue === num);
}

