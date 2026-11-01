import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Award,
  Home,
  RefreshCw,
  ShieldAlert,
  Scale,
  Trophy,
} from 'lucide-react';
import { HandCricketClientState } from '../../types/handCricket';
import { HandCricketEngine } from '../../engine/handCricketEngine';
import { sound } from '../../utils/sound';

interface HandCricketResultScreenProps {
  roomState: HandCricketClientState;
  onPlayAgainNewMatch: () => void;
  onVoteRematch: () => void;
  onReturnHome: () => void;
  onOpenCareer: () => void;
}

const CELEBRATED_MATCHES = new Set<string>();

const CONFETTI_PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${4 + ((i * 97) % 92)}%`,
  delay: (i % 7) * 0.08,
  duration: 1.8 + (i % 5) * 0.25,
  drift: ((i % 2 === 0 ? 1 : -1) * (16 + (i * 11) % 36)),
  rotate: (i * 55) % 360,
  color:
    i % 3 === 0
      ? '#10b981'
      : i % 3 === 1
      ? '#f59e0b'
      : '#38bdf8',
}));

export const HandCricketResultScreen: React.FC<HandCricketResultScreenProps> = ({
  roomState,
  onVoteRematch,
  onReturnHome,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const { matchId, result, innings, players, myPlayerId, config, careerReward } =
    roomState;

  const isTie = result?.outcome === 'TIE';
  const didIWin = Boolean(result && !isTie && result.winnerPlayerId === myPlayerId);
  const hasVotedRematch = roomState.rematchVotes.includes(myPlayerId);

  const [showCelebrationParticles, setShowCelebrationParticles] = useState(
    () => didIWin && !prefersReducedMotion && !CELEBRATED_MATCHES.has(matchId)
  );

  useEffect(() => {
    if (!didIWin || prefersReducedMotion) {
      setShowCelebrationParticles(false);
      return;
    }
    if (CELEBRATED_MATCHES.has(matchId)) {
      setShowCelebrationParticles(false);
      return;
    }

    CELEBRATED_MATCHES.add(matchId);
    setShowCelebrationParticles(true);

    const timer = setTimeout(() => {
      setShowCelebrationParticles(false);
    }, 2600);

    return () => clearTimeout(timer);
  }, [didIWin, matchId, prefersReducedMotion]);

  if (!result) return null;

  const getConciseMarginText = (): string => {
    if (isTie) {
      return 'Both sides finished on equal scores.';
    }
    if (didIWin && result.winnerName) {
      return result.marginTextEn.replace(
        new RegExp(`^${result.winnerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i'),
        'You '
      );
    }
    return result.marginTextEn;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6 relative overflow-hidden">
      {/* Tasteful Victory Confetti Celebration (Runs once per match win and cleans up) */}
      {showCelebrationParticles && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
        >
          {CONFETTI_PARTICLES.map((p) => (
            <motion.span
              key={p.id}
              initial={{ y: -24, x: 0, opacity: 1, rotate: 0, scale: 1 }}
              animate={{
                y: '75vh',
                x: p.drift,
                opacity: [1, 1, 0],
                rotate: p.rotate + 240,
                scale: [1, 0.9, 0.7],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: 'easeOut',
              }}
              style={{
                left: p.left,
                backgroundColor: p.color,
              }}
              className="absolute top-0 w-2.5 h-2.5 rounded-sm"
            />
          ))}
        </div>
      )}

      {/* 1. Single Main Result Header (Victory / Defeat / Match Drawn) */}
      <motion.section
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={`relative p-6 sm:p-8 rounded-2xl border text-center space-y-2.5 overflow-hidden ${
          didIWin
            ? 'bg-slate-900 border-emerald-500/60 shadow-[0_0_45px_-12px_rgba(16,185,129,0.35)]'
            : isTie
            ? 'bg-slate-900 border-amber-500/50'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        {didIWin && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-36 bg-emerald-500/15 blur-3xl rounded-full"
          />
        )}

        <motion.div
          initial={prefersReducedMotion ? false : { scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.05, type: 'spring' }}
          className={`w-12 h-12 rounded-xl mx-auto flex items-center justify-center border ${
            didIWin
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
              : isTie
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
              : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}
        >
          {didIWin ? (
            <Trophy className="w-6 h-6" />
          ) : isTie ? (
            <Scale className="w-6 h-6" />
          ) : (
            <ShieldAlert className="w-6 h-6" />
          )}
        </motion.div>

        <h1
          className={`text-2xl sm:text-3xl font-black tracking-tight ${
            didIWin
              ? 'text-emerald-400'
              : isTie
              ? 'text-amber-400'
              : 'text-white'
          }`}
        >
          {didIWin ? 'VICTORY' : isTie ? 'MATCH DRAWN' : 'DEFEAT'}
        </h1>

        <p className="text-sm sm:text-base text-slate-200 font-medium">
          {getConciseMarginText()}
        </p>
      </motion.section>

      {/* 2. Final Score & Innings Summary */}
      <motion.section
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Final Score</h2>
          <span className="text-xs font-mono text-slate-400">
            {config.format === 'test_match'
              ? 'Test Match'
              : `${config.overs} Overs`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {innings.map((inn) => {
            const batter = players.find(
              (p) => p.playerId === inn.battingPlayerId
            );
            const isMyInnings = inn.battingPlayerId === myPlayerId;
            return (
              <div
                key={inn.inningsNumber}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs text-slate-400 block">
                    Innings {inn.inningsNumber}
                  </span>
                  <span className="text-sm font-bold text-white">
                    {batter?.name || 'Player'}
                    {isMyInnings ? ' (You)' : ''}
                  </span>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <span className="text-base sm:text-lg font-bold text-emerald-400 block leading-none">
                    {inn.runs}/{inn.wickets}
                  </span>
                  <span className="text-xs text-slate-400">
                    {HandCricketEngine.formatOvers(inn.balls)} ov
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* 3. Rewards Earned */}
      {careerReward && (
        <motion.section
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.16 }}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Rewards Earned</h2>
            <span className="text-sm font-mono font-bold text-amber-400 tabular-nums">
              +{careerReward.xpEarned} XP
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-slate-300">
            <span>
              Level {careerReward.newLevel} · {careerReward.stage}
            </span>
            <span className="tabular-nums">{careerReward.newXp} XP Total</span>
          </div>

          {careerReward.newlyUnlockedAchievements.length > 0 && (
            <div className="pt-2.5 border-t border-slate-800 space-y-1.5">
              {careerReward.newlyUnlockedAchievements.map((ach) => (
                <div
                  key={ach.id}
                  className="text-xs text-white bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    {ach.titleEn}
                  </span>
                  <span className="font-mono text-amber-400">
                    +{ach.xpReward} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      )}

      {/* 4. Actions: Play Again & Back to Home */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onVoteRematch();
          }}
          disabled={hasVotedRematch}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-sm transition-colors cursor-pointer ${
            hasVotedRematch
              ? 'bg-slate-800 text-emerald-300 border border-emerald-500/40'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>
            {config.mode === 'ai_single_player'
              ? 'Play Again'
              : hasVotedRematch
              ? `Rematch (${roomState.rematchVotes.length}/2)`
              : 'Play Again'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onReturnHome();
          }}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white font-bold text-sm transition-colors cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>
    </div>
  );
};
