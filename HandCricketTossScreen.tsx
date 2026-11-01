import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Crown,
  Shield,
  Swords,
  Trophy,
} from 'lucide-react';
import {
  HandCricketClientState,
  TossCall,
  TossDecision,
} from '../../types/handCricket';
import { sound } from '../../utils/sound';

interface HandCricketTossScreenProps {
  roomState: HandCricketClientState;
  onCallToss: (call: TossCall) => Promise<void>;
  onConfirmDecision: (decision: TossDecision) => Promise<void>;
}

export const HandCricketTossScreen: React.FC<HandCricketTossScreenProps> = ({
  roomState,
  onCallToss,
  onConfirmDecision,
}) => {
  const [flipping, setFlipping] = useState(false);
  const [selectedCall, setSelectedCall] = useState<TossCall | null>(null);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const hasAutoConfirmedRef = useRef(false);

  const { toss, phase, myPlayerId, players } = roomState;
  const isMyCall = toss.callerId === myPlayerId;
  const isTossWinner = toss.winnerId === myPlayerId;
  const callerPlayer = players.find((p) => p.playerId === toss.callerId);
  const winnerPlayer = players.find((p) => p.playerId === toss.winnerId);
  const me = players.find((p) => p.playerId === myPlayerId) || players[0];
  const opponent = players.find((p) => p.playerId !== myPlayerId) || players[1];

  const isOpponentAutoWinner =
    !isTossWinner &&
    (Boolean(winnerPlayer?.isAI) ||
      Boolean(toss.winnerId?.startsWith('ai_')) ||
      roomState.config.mode === 'ai_single_player');

  const opponentChosenDecision: TossDecision = toss.decision || 'BAT_FIRST';

  const showResultStage = phase === 'TOSS_DECISION' && !flipping;

  const handleCall = async (call: TossCall) => {
    if (flipping) return;
    sound.playClick();
    setSelectedCall(call);
    setFlipping(true);
    hasAutoConfirmedRef.current = false;

    const tossPromise = onCallToss(call);
    await new Promise((resolve) => setTimeout(resolve, 1350));
    try {
      await tossPromise;
    } finally {
      setFlipping(false);
    }
  };

  const handleDecision = async (decision: TossDecision) => {
    if (submittingDecision) return;
    sound.playClick();
    setSubmittingDecision(true);
    try {
      await onConfirmDecision(decision);
    } finally {
      setSubmittingDecision(false);
    }
  };

  const onConfirmDecisionRef = useRef(onConfirmDecision);
  useEffect(() => {
    onConfirmDecisionRef.current = onConfirmDecision;
  }, [onConfirmDecision]);

  useEffect(() => {
    if (!showResultStage || !isOpponentAutoWinner || hasAutoConfirmedRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      if (!hasAutoConfirmedRef.current) {
        hasAutoConfirmedRef.current = true;
        onConfirmDecisionRef.current(opponentChosenDecision);
      }
    }, 1600);

    return () => {
      clearTimeout(timer);
    };
  }, [showResultStage, isOpponentAutoWinner, opponentChosenDecision]);

  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col justify-center items-center px-4 py-4 bg-slate-950 select-none">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-5">
        {/* Matchup Header (No AI labels) */}
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-base shrink-0">
              {me?.avatar || '🏏'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {me?.name || 'You'}
              </p>
              <span className="text-[10px] font-mono text-slate-400 block">
                #{me?.jerseyNumber ?? 75} · You
              </span>
            </div>
          </div>

          <span className="text-xs font-mono font-bold text-slate-500">VS</span>

          <div className="flex items-center gap-2.5 min-w-0 text-right">
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {opponent?.name || 'Opponent'}
              </p>
              <span className="text-[10px] font-mono text-slate-400 block">
                #{opponent?.jerseyNumber ?? 7} · Opponent
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-base shrink-0">
              {opponent?.avatar || '⚡'}
            </div>
          </div>
        </div>

        {/* Vertical Coin Toss Stage */}
        <div className="flex flex-col items-center justify-center py-2">
          <div
            className="relative h-28 w-28 flex items-center justify-center"
            style={{ perspective: '900px' }}
          >
            <motion.div
              key={
                flipping
                  ? 'flipping-coin'
                  : `landed-${toss.coinResult || 'idle'}`
              }
              animate={
                flipping
                  ? {
                      y: [0, -55, -75, -45, 0],
                      rotateX: [0, 360, 720, 1080, 1440, 1800],
                      rotateZ: 0,
                      scale: [1, 1.15, 1.22, 1.1, 1],
                    }
                  : showResultStage
                  ? {
                      y: [-12, 0],
                      rotateX: [180, 0],
                      rotateZ: 0,
                      scale: [1.06, 1],
                    }
                  : {
                      y: [0, -5, 0],
                      rotateX: [0, 12, 0],
                      rotateZ: 0,
                      scale: 1,
                    }
              }
              transition={
                flipping
                  ? {
                      duration: 1.32,
                      ease: [0.22, 0.68, 0.35, 1],
                    }
                  : showResultStage
                  ? {
                      duration: 0.35,
                      ease: 'easeOut',
                    }
                  : {
                      duration: 2.4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
              }
              style={{ transformStyle: 'preserve-3d' }}
              className="w-20 h-20 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 p-1 shadow-lg border-2 border-amber-200 flex items-center justify-center"
            >
              <div className="w-full h-full rounded-full border border-amber-900/50 bg-amber-400 flex flex-col items-center justify-center text-slate-950 select-none">
                {flipping ? (
                  <span className="font-mono font-black text-[10px] tracking-widest uppercase">
                    TOSS
                  </span>
                ) : showResultStage && toss.coinResult ? (
                  <>
                    <Crown className="w-4 h-4 text-slate-950" />
                    <span className="font-mono font-black text-xs tracking-wider uppercase">
                      {toss.coinResult}
                    </span>
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4 text-slate-950" />
                    <span className="font-mono font-black text-[10px] tracking-widest uppercase mt-0.5">
                      TOSS
                    </span>
                  </>
                )}
              </div>
            </motion.div>

            <motion.div
              animate={
                flipping
                  ? {
                      scaleX: [1, 0.45, 0.35, 0.6, 1.05],
                      opacity: [0.55, 0.2, 0.12, 0.25, 0.6],
                    }
                  : { scaleX: 1, opacity: 0.5 }
              }
              transition={{ duration: flipping ? 1.32 : 0.35 }}
              className="absolute bottom-0.5 w-14 h-2.5 rounded-full bg-black/70 blur-sm"
            />
          </div>

          {flipping && (
            <p className="text-xs font-medium text-amber-300 mt-1">
              Flipping coin ({selectedCall === 'HEADS' ? 'Heads' : 'Tails'})...
            </p>
          )}
        </div>

        {/* Phase 1: Call Heads or Tails */}
        {!showResultStage && !flipping && phase === 'TOSS_CALL' && (
          <div className="text-center space-y-4">
            <h2 className="text-lg font-bold text-white">Coin Toss</h2>

            {isMyCall ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleCall('HEADS')}
                  disabled={flipping}
                  className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
                >
                  Heads
                </button>
                <button
                  type="button"
                  onClick={() => handleCall('TAILS')}
                  disabled={flipping}
                  className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
                >
                  Tails
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Waiting for {callerPlayer?.name || 'opponent'} to call the
                toss...
              </p>
            )}
          </div>
        )}

        {/* Phase 2: Toss Winner & Decision */}
        <AnimatePresence mode="wait">
          {showResultStage && (
            <motion.div
              key="toss-winner-stage"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4 text-center"
            >
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                  <span>
                    Call:{' '}
                    <strong className="text-white font-mono">
                      {toss.call}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    Result:{' '}
                    <strong className="text-amber-400 font-mono">
                      {toss.coinResult}
                    </strong>
                  </span>
                </div>

                <h3
                  className={`text-base font-bold ${
                    isTossWinner ? 'text-emerald-400' : 'text-amber-300'
                  }`}
                >
                  {isTossWinner
                    ? 'You won the toss'
                    : `${
                        winnerPlayer?.name || opponent?.name || 'Opponent'
                      } won the toss`}
                </h3>
              </div>

              {isTossWinner ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleDecision('BAT_FIRST')}
                      disabled={submittingDecision}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
                    >
                      <Swords className="w-4 h-4" />
                      <span>Bat First</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDecision('BOWL_FIRST')}
                      disabled={submittingDecision}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Bowl First</span>
                    </button>
                  </div>
                </div>
              ) : isOpponentAutoWinner ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300">
                    <strong className="text-white">
                      {winnerPlayer?.name || opponent?.name || 'Opponent'}
                    </strong>{' '}
                    elected to{' '}
                    <strong className="text-emerald-400">
                      {opponentChosenDecision === 'BOWL_FIRST'
                        ? 'bowl'
                        : 'bat'}
                    </strong>{' '}
                    first.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      hasAutoConfirmedRef.current = true;
                      handleDecision(opponentChosenDecision);
                    }}
                    disabled={submittingDecision}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  {winnerPlayer?.name || 'Opponent'} is choosing to bat or
                  bowl...
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
