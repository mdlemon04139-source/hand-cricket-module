import React from 'react';
import { BookOpen, X } from 'lucide-react';
import { HandGestureIllustration } from './HandGestureIllustration';
import {
  ALL_18_GESTURE_VARIATIONS,
  HAND_GESTURE_REGISTRY,
} from '../data/gestureRegistry';
import { sound } from '../../utils/sound';

interface HandCricketRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HandCricketRulesModal: React.FC<HandCricketRulesModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Rules</h2>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-sm text-slate-300 leading-relaxed">
          {/* 1. Core Rules */}
          <section className="space-y-2">
            <h3 className="text-base font-bold text-white">Core Rules</h3>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300">
              <li>
                On every ball, both the batter and bowler simultaneously choose
                a hand gesture representing a number (<strong>1 to 6</strong>)
                and variation (<strong>A, B, or C</strong>).
              </li>
              <li>
                <strong>Wicket:</strong> If both players choose the exact same
                number and gesture variation (for example,{' '}
                <strong>1A vs 1A</strong> or <strong>6C vs 6C</strong>), the
                batter is out.
              </li>
              <li>
                <strong>Runs:</strong> If the selections do not match—including
                same number with a different variation (such as{' '}
                <strong>1A vs 1B</strong>)—the batter survives and scores their
                selected number.
              </li>
              <li>
                <strong>Shot Timer:</strong> In multiplayer matches, each player
                has 5 seconds to lock a shot before a random selection is
                assigned.
              </li>
            </ul>
          </section>

          {/* 2. Match Formats */}
          <section className="space-y-2">
            <h3 className="text-base font-bold text-white">Match Formats</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-white mb-1">Limited Overs</h4>
                <p className="text-xs text-slate-400">
                  2, 5, 10, or 20 overs per innings. The chasing player wins
                  immediately upon reaching the target score.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-white mb-1">Custom Match</h4>
                <p className="text-xs text-slate-400">
                  Configure custom overs (1–50) and wickets per innings (1–10).
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-white mb-1">Test Match</h4>
                <p className="text-xs text-slate-400">
                  4 innings, 10 wickets per innings, unlimited overs. Fourth
                  innings target = (A1 + A2 - B1 + 1).
                </p>
              </div>
            </div>
          </section>

          {/* 3. Hand Gestures (1A – 6C) */}
          <section className="space-y-3">
            <h3 className="text-base font-bold text-white">
              Hand Gestures (1A – 6C)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
              {ALL_18_GESTURE_VARIATIONS.map((gid) => {
                const def = HAND_GESTURE_REGISTRY[gid];
                return (
                  <div
                    key={gid}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center gap-1.5"
                  >
                    <HandGestureIllustration
                      gestureId={gid}
                      size="sm"
                      showBadge
                    />
                    <div>
                      <p className="text-xs font-mono font-bold text-emerald-400">
                        {gid} ({def.numericValue})
                      </p>
                      <p className="text-[10px] text-slate-400 leading-snug">
                        {def.fingerDescriptionEn}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
