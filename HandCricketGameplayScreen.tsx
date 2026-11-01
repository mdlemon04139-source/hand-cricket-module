import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  History,
  Lock,
  LogOut,
  X,
} from 'lucide-react';
import {
  GestureVariationId,
  HandCricketClientState,
  HandNumber,
} from '../../types/handCricket';
import {
  ALL_18_GESTURE_VARIATIONS,
  HAND_GESTURE_REGISTRY,
} from '../data/gestureRegistry';
import { HandGestureIllustration } from './HandGestureIllustration';
import { HandCricketEngine } from '../../engine/handCricketEngine';
import { sound } from '../../utils/sound';

interface HandCricketGameplayScreenProps {
  roomState: HandCricketClientState;
  onSubmitBall: (choice: {
    number: HandNumber;
    gestureId: GestureVariationId;
    ballId: string;
  }) => Promise<void>;
  onAdvanceBreak: () => Promise<void>;
  onLeaveMatch: () => void;
}

export const HandCricketGameplayScreen: React.FC<
  HandCricketGameplayScreenProps
> = ({ roomState, onSubmitBall, onAdvanceBreak, onLeaveMatch }) => {
  const prefersReducedMotion = useReducedMotion();

  const [previewGestureId, setPreviewGestureId] =
    useState<GestureVariationId>('6A');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);
  const [showFullHistoryModal, setShowFullHistoryModal] = useState(false);

  const [pumpingBallId, setPumpingBallId] = useState<string | null>(null);

  const currentInnings =
    roomState.innings[roomState.currentInningsIndex] || roomState.innings[0];

  useEffect(() => {
    setSubmitting(false);
  }, [roomState.currentBallId, roomState.phase]);

  const lastBallId = roomState.lastBallEvent?.ballId;
  useEffect(() => {
    if (roomState.phase === 'BALL_REVEAL' && lastBallId) {
      if (prefersReducedMotion) {
        setPumpingBallId(null);
        return;
      }
      setPumpingBallId(lastBallId);
      const timer = setTimeout(() => {
        setPumpingBallId((curr) => (curr === lastBallId ? null : curr));
      }, 760);
      return () => clearTimeout(timer);
    } else {
      setPumpingBallId(null);
    }
  }, [roomState.phase, lastBallId, prefersReducedMotion]);

  useEffect(() => {
    if (roomState.phase !== 'BALL_SELECTION' || !roomState.ballDeadline) {
      setRemainingSeconds(roomState.config.ballTimerSeconds);
      return;
    }

    const updateTimer = () => {
      const diffMs = Math.max(0, roomState.ballDeadline! - Date.now());
      setRemainingSeconds(Math.ceil(diffMs / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);
    return () => clearInterval(interval);
  }, [
    roomState.phase,
    roomState.ballDeadline,
    roomState.config.ballTimerSeconds,
    roomState.currentBallId,
  ]);

  if (!currentInnings) return null;

  const me =
    roomState.players.find((p) => p.playerId === roomState.myPlayerId) ||
    roomState.players[0];
  const opponent =
    roomState.players.find((p) => p.playerId !== roomState.myPlayerId) ||
    roomState.players[1] ||
    roomState.players[0];

  const isMeBatting = currentInnings.battingPlayerId === me.playerId;
  const batterPlayer = isMeBatting ? me : opponent;
  const bowlerPlayer = isMeBatting ? opponent : me;

  const isTestMatch = roomState.config.format === 'test_match';
  const lastBall = roomState.lastBallEvent;
  const isBallRevealPhase =
    roomState.phase === 'BALL_REVEAL' &&
    Boolean(lastBall) &&
    lastBall?.inningsNumber === currentInnings.inningsNumber;

  const isPumpingHands =
    isBallRevealPhase && pumpingBallId === lastBall?.ballId;
  const showRevealedGestures = isBallRevealPhase && !isPumpingHands;

  const displayedRuns =
    isPumpingHands && lastBall
      ? Math.max(0, currentInnings.runs - lastBall.runsScored)
      : currentInnings.runs;
  const displayedWickets =
    isPumpingHands && lastBall
      ? Math.max(0, currentInnings.wickets - (lastBall.isWicket ? 1 : 0))
      : currentInnings.wickets;
  const displayedBalls =
    isPumpingHands && lastBall
      ? Math.max(0, currentInnings.balls - 1)
      : currentInnings.balls;

  const runsNeeded =
    currentInnings.target !== null
      ? Math.max(0, currentInnings.target - displayedRuns)
      : null;
  const ballsRemaining =
    currentInnings.maxOvers !== null
      ? Math.max(0, currentInnings.maxOvers * 6 - displayedBalls)
      : null;

  const teamAId = roomState.innings[0]?.battingPlayerId || me.playerId;
  const teamBId = roomState.innings[1]?.battingPlayerId || opponent.playerId;
  const aggregates = HandCricketEngine.getAggregateScores(
    roomState.innings,
    teamAId,
    teamBId
  );
  const myAggregate =
    teamAId === me.playerId
      ? aggregates.teamAAggregate
      : aggregates.teamBAggregate;
  const oppAggregate =
    teamAId === opponent.playerId
      ? aggregates.teamAAggregate
      : aggregates.teamBAggregate;

  const canSelectNextBallFromReveal =
    roomState.config.mode === 'ai_single_player' &&
    roomState.phase === 'BALL_REVEAL' &&
    !isPumpingHands &&
    !currentInnings.isCompleted;

  const isInputReady =
    (roomState.phase === 'BALL_SELECTION' &&
      !roomState.mySubmittedSelection) ||
    canSelectNextBallFromReveal;

  const handleSelectGestureVariation = async (
    gestureId: GestureVariationId
  ) => {
    setPreviewGestureId(gestureId);
    if (!isInputReady || submitting) {
      return;
    }
    sound.playClick();
    setSubmitting(true);
    const def = HAND_GESTURE_REGISTRY[gestureId];
    const num = (def?.numericValue || 1) as HandNumber;
    try {
      await onSubmitBall({
        number: num,
        gestureId,
        ballId: roomState.currentBallId,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const myRevealedGesture: GestureVariationId | undefined =
    isBallRevealPhase && lastBall
      ? isMeBatting
        ? lastBall.batterGestureId
        : lastBall.bowlerGestureId
      : roomState.mySubmittedSelection?.gestureId;

  const oppRevealedGesture: GestureVariationId | undefined =
    isBallRevealPhase && lastBall
      ? isMeBatting
        ? lastBall.bowlerGestureId
        : lastBall.batterGestureId
      : undefined;

  const visibleHistoryBalls = isPumpingHands
    ? currentInnings.ballHistory.slice(0, -1)
    : currentInnings.ballHistory;

  const latestFirstBalls = [...visibleHistoryBalls].reverse();

  const getResultBannerMeta = () => {
    if (!showRevealedGestures || !lastBall) return null;
    if (lastBall.isWicket) {
      return {
        badge: 'WICKET',
        title: `Out! Both chose ${lastBall.batterGestureId}`,
        colorClass: 'bg-rose-500/20 border-rose-400 text-rose-200',
      };
    }
    const r = lastBall.runsScored;
    const subNote =
      lastBall.batterNumber === lastBall.bowlerNumber
        ? ` (${lastBall.batterGestureId} vs ${lastBall.bowlerGestureId})`
        : '';
    if (r === 6) {
      return {
        badge: 'SIX!',
        title: `+6 Runs${subNote}`,
        colorClass: 'bg-amber-500/20 border-amber-400 text-amber-200',
      };
    }
    if (r === 4) {
      return {
        badge: 'FOUR!',
        title: `+4 Runs${subNote}`,
        colorClass: 'bg-cyan-500/20 border-cyan-400 text-cyan-200',
      };
    }
    if (r === 3) {
      return {
        badge: 'TRIPLE',
        title: `+3 Runs${subNote}`,
        colorClass: 'bg-emerald-500/20 border-emerald-400 text-emerald-200',
      };
    }
    if (r === 2) {
      return {
        badge: 'DOUBLE',
        title: `+2 Runs${subNote}`,
        colorClass: 'bg-emerald-500/20 border-emerald-400 text-emerald-200',
      };
    }
    if (r === 1) {
      return {
        badge: 'SINGLE',
        title: `+1 Run${subNote}`,
        colorClass: 'bg-emerald-500/20 border-emerald-400 text-emerald-200',
      };
    }
    if (r === 0) {
      return {
        badge: 'DOT BALL',
        title: '0 Runs',
        colorClass: 'bg-slate-800 border-slate-600 text-slate-200',
      };
    }
    return {
      badge: `+${r} RUNS`,
      title: `+${r} Runs${subNote}`,
      colorClass: 'bg-emerald-500/20 border-emerald-400 text-emerald-200',
    };
  };

  const resultBanner = getResultBannerMeta();
  const activePreviewId =
    roomState.mySubmittedSelection?.gestureId || previewGestureId;
  const activePreviewDef = HAND_GESTURE_REGISTRY[activePreviewId];

  return (
    <div className="min-h-[100dvh] w-full bg-slate-950 select-none py-1.5 px-2 sm:px-4 flex flex-col justify-center overflow-x-hidden">
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-1.5 sm:gap-2">
        {/* =====================================================================
            1. COMPACT SCOREBOARD + ALWAYS-VISIBLE BALL HISTORY STRIP
           ===================================================================== */}
        <header className="shrink-0 w-full space-y-1">
          <div className="rounded-xl bg-slate-900 border border-slate-800 px-2.5 py-1.5 sm:px-3 sm:py-1.5 flex items-center justify-between gap-2 flex-wrap">
            {/* Left: Leave + BATTER NOW & Score */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onLeaveMatch();
                }}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors cursor-pointer shrink-0"
                title="Leave Match"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 min-w-0">
                <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 font-mono font-black text-[9px] uppercase tracking-wider shrink-0">
                  BATTER
                </span>
                <span className="text-xs shrink-0">{batterPlayer.avatar}</span>
                <span className="text-xs font-bold text-white truncate max-w-[85px] sm:max-w-[130px]">
                  {batterPlayer.name}
                  {batterPlayer.playerId === me.playerId ? ' (You)' : ''}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5 font-mono tabular-nums pl-0.5">
                <motion.span
                  key={`score-${displayedRuns}-${displayedWickets}`}
                  initial={
                    prefersReducedMotion
                      ? false
                      : { scale: 1.18, color: '#34d399' }
                  }
                  animate={{ scale: 1, color: '#ffffff' }}
                  transition={{ duration: 0.25 }}
                  className="text-base sm:text-lg font-black text-white leading-none"
                >
                  {displayedRuns}/{displayedWickets}
                </motion.span>
                <span className="text-[11px] text-slate-400">
                  ({HandCricketEngine.formatOvers(displayedBalls)}
                  {currentInnings.maxOvers !== null
                    ? `/${currentInnings.maxOvers}`
                    : ''}{' '}
                  Ov)
                </span>
              </div>
            </div>

            {/* Center: Innings & Target */}
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="font-semibold text-emerald-400">
                Innings {currentInnings.inningsNumber}/
                {roomState.config.totalInnings}
              </span>
              {currentInnings.target !== null ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-300">
                    Target{' '}
                    <strong className="font-mono">{currentInnings.target}</strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-300">
                    Need{' '}
                    <strong className="font-mono text-white">
                      {runsNeeded}
                    </strong>
                  </span>
                  {ballsRemaining !== null && (
                    <span className="hidden md:inline text-slate-400 font-mono">
                      ({ballsRemaining}b)
                    </span>
                  )}
                </>
              ) : isTestMatch ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-cyan-300 font-mono">
                    Agg: {myAggregate} - {oppAggregate}
                  </span>
                </>
              ) : null}
            </div>

            {/* Right: BOWLER Indicator & Timer */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-500/40">
                <span className="px-1.5 py-0.2 rounded bg-cyan-400 text-slate-950 font-mono font-black text-[9px] uppercase tracking-wider shrink-0">
                  BOWLER
                </span>
                <span className="text-xs shrink-0">{bowlerPlayer.avatar}</span>
                <span className="text-xs font-bold text-cyan-100 truncate max-w-[85px] sm:max-w-[120px]">
                  {bowlerPlayer.name}
                  {bowlerPlayer.playerId === me.playerId ? ' (You)' : ''}
                </span>
              </div>

              {roomState.phase === 'BALL_SELECTION' && roomState.ballDeadline && (
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border font-mono tabular-nums text-[11px] font-bold ${
                    remainingSeconds <= 2
                      ? 'bg-rose-950/70 border-rose-500/60 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-amber-300'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>{remainingSeconds}s</span>
                </div>
              )}
            </div>
          </div>

          {/* Always-Visible Ball History Strip (Latest First) */}
          <div className="rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0 flex-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 shrink-0">
                Ball History:
              </span>
              {latestFirstBalls.length === 0 ? (
                <span className="text-[11px] text-slate-500">
                  Waiting for first delivery
                </span>
              ) : (
                <div className="flex items-center gap-1">
                  {latestFirstBalls.slice(0, 12).map((b, idx) => (
                    <motion.span
                      key={b.ballId}
                      initial={
                        prefersReducedMotion || idx !== 0
                          ? false
                          : { scale: 0.5, opacity: 0 }
                      }
                      animate={{ scale: 1, opacity: 1 }}
                      className={`px-1.5 h-5 rounded border font-mono font-bold text-[10px] flex items-center justify-center tabular-nums shrink-0 ${
                        b.isWicket
                          ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                          : b.runsScored === 6
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : b.runsScored === 4
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-200'
                      }`}
                      title={`Over ${b.overDisplay}: Batter ${b.batterGestureId} (${b.batterNumber}) vs Bowler ${b.bowlerGestureId} (${b.bowlerNumber})`}
                    >
                      {b.isWicket ? 'W' : b.runsScored}
                    </motion.span>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setShowFullHistoryModal(true);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[10px] font-medium transition-colors cursor-pointer shrink-0"
            >
              <History className="w-3 h-3 text-amber-400" />
              <span>History ({visibleHistoryBalls.length})</span>
            </button>
          </div>
        </header>

        {/* =====================================================================
            2. COMPACT LIVE CRICKET PITCH + DUAL PLAYER HAND REVEAL ARENA
           ===================================================================== */}
        <main className="shrink-0 w-full">
          {roomState.phase !== 'INNINGS_BREAK' ? (
            <div className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2 sm:p-2.5 flex flex-col gap-1.5 relative overflow-hidden">
              {/* Top Compact Status / Outcome Row */}
              <div className="flex items-center justify-between gap-2 z-10 px-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {isPumpingHands ? (
                    <motion.div
                      initial={{ scale: 0.94, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/50 text-amber-300 font-bold text-[11px]"
                    >
                      Delivering ball...
                    </motion.div>
                  ) : resultBanner ? (
                    <motion.div
                      key={`outcome-${lastBall?.ballId}`}
                      initial={
                        prefersReducedMotion
                          ? false
                          : { scale: 0.88, opacity: 0, y: -3 }
                      }
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 360,
                        damping: 22,
                      }}
                      className={`px-2.5 py-0.5 rounded-md border font-bold text-[11px] flex items-center gap-1.5 ${resultBanner.colorClass}`}
                    >
                      <span className="px-1.5 py-0.2 rounded bg-slate-950/80 font-mono text-[10px] tracking-wider">
                        {resultBanner.badge}
                      </span>
                      <span>{resultBanner.title}</span>
                    </motion.div>
                  ) : (
                    <div className="px-2.5 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                      {roomState.mySubmittedSelection ? (
                        'Selection locked. Waiting for opponent...'
                      ) : (
                        <span>
                          You are{' '}
                          <strong
                            className={
                              isMeBatting ? 'text-emerald-400' : 'text-cyan-400'
                            }
                          >
                            {isMeBatting ? 'Batting' : 'Bowling'}
                          </strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {showRevealedGestures &&
                lastBall &&
                (lastBall.batterTimedOut || lastBall.bowlerTimedOut) ? (
                  <div className="text-[10px] text-amber-300 flex items-center gap-1 shrink-0">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Time expired (random assigned)</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                    Same Number + Same Variation = Wicket
                  </span>
                )}
              </div>

              {/* 2D/SVG LIVE CRICKET PITCH TRAJECTORY STRIP */}
              <div className="w-full h-11 sm:h-12 rounded-lg bg-slate-950 border border-slate-800 relative overflow-hidden shrink-0 flex items-center px-2.5">
                <svg
                  viewBox="0 0 600 64"
                  className="w-full h-full overflow-visible"
                  aria-label="Live Cricket Pitch Animation"
                >
                  <rect
                    x="90"
                    y="18"
                    width="420"
                    height="28"
                    rx="6"
                    fill="#a16207"
                    fillOpacity="0.32"
                    stroke="#ca8a04"
                    strokeOpacity="0.45"
                    strokeWidth="1.2"
                  />
                  <line
                    x1="125"
                    y1="18"
                    x2="125"
                    y2="46"
                    stroke="#fef08a"
                    strokeOpacity="0.6"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="475"
                    y1="18"
                    x2="475"
                    y2="46"
                    stroke="#fef08a"
                    strokeOpacity="0.6"
                    strokeWidth="1.5"
                  />

                  {/* Non-striker stumps */}
                  <g stroke="#fde047" strokeWidth="2" strokeLinecap="round">
                    <line x1="108" y1="22" x2="108" y2="42" />
                    <line x1="112" y1="22" x2="112" y2="42" />
                    <line x1="116" y1="22" x2="116" y2="42" />
                  </g>

                  {/* Bowler Silhouette */}
                  <motion.g
                    animate={
                      !prefersReducedMotion && isPumpingHands
                        ? { x: [0, 14, 6], rotate: [0, 18, 0] }
                        : { x: 0, rotate: 0 }
                    }
                    transition={{ duration: 0.65, ease: 'easeInOut' }}
                  >
                    <circle cx="82" cy="22" r="6" fill="#22d3ee" />
                    <path
                      d="M 82 28 L 82 44 M 82 32 L 94 22 M 82 44 L 75 54 M 82 44 L 89 54"
                      stroke="#22d3ee"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                  </motion.g>

                  {/* Striker Stumps */}
                  <g stroke="#fde047" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="486" y1="22" x2="486" y2="42" />
                    <motion.line
                      x1="490"
                      y1="22"
                      x2="490"
                      y2="42"
                      animate={
                        showRevealedGestures && lastBall?.isWicket
                          ? { x2: 504, y1: 16, stroke: '#fb7185' }
                          : { x2: 490, y1: 22, stroke: '#fde047' }
                      }
                    />
                    <motion.line
                      x1="494"
                      y1="22"
                      x2="494"
                      y2="42"
                      animate={
                        showRevealedGestures && lastBall?.isWicket
                          ? { x2: 512, y1: 26, stroke: '#fb7185' }
                          : { x2: 494, y1: 22, stroke: '#fde047' }
                      }
                    />
                  </g>

                  {/* Batter Silhouette & Bat Swing */}
                  <g>
                    <circle cx="465" cy="21" r="6" fill="#34d399" />
                    <path
                      d="M 465 27 L 465 43 M 465 43 L 459 54 M 465 43 L 472 54"
                      stroke="#34d399"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                    <motion.line
                      x1="465"
                      y1="32"
                      x2="452"
                      y2="44"
                      stroke="#f59e0b"
                      strokeWidth="4"
                      strokeLinecap="round"
                      animate={
                        !prefersReducedMotion &&
                        showRevealedGestures &&
                        lastBall
                          ? lastBall.isWicket
                            ? { x2: 458, y2: 24 }
                            : { x2: 436, y2: 18 }
                          : { x2: 452, y2: 44 }
                      }
                      transition={{ duration: 0.25 }}
                    />
                  </g>

                  {/* Shot Trajectory Arc */}
                  {showRevealedGestures &&
                    lastBall &&
                    !lastBall.isWicket &&
                    lastBall.runsScored > 0 && (
                      <motion.path
                        key={`traj-${lastBall.ballId}`}
                        d={
                          lastBall.runsScored === 6
                            ? 'M 455 32 Q 260 -18 28 12'
                            : lastBall.runsScored === 4
                            ? 'M 455 34 Q 260 52 32 46'
                            : 'M 455 32 Q 330 16 220 28'
                        }
                        fill="none"
                        stroke={
                          lastBall.runsScored === 6
                            ? '#fbbf24'
                            : lastBall.runsScored === 4
                            ? '#22d3ee'
                            : '#34d399'
                        }
                        strokeWidth="2.5"
                        strokeDasharray="5 4"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.9 }}
                        transition={{ duration: 0.45 }}
                      />
                    )}

                  {/* Animated Cricket Ball */}
                  {(isPumpingHands || showRevealedGestures) && (
                    <motion.circle
                      key={`ball-${lastBall?.ballId}-${
                        isPumpingHands ? 'bowl' : 'hit'
                      }`}
                      r="5.5"
                      fill={
                        showRevealedGestures && lastBall?.isWicket
                          ? '#f43f5e'
                          : showRevealedGestures && lastBall?.runsScored === 6
                          ? '#fbbf24'
                          : '#ffffff'
                      }
                      stroke="#dc2626"
                      strokeWidth="1.8"
                      initial={
                        isPumpingHands
                          ? { cx: 100, cy: 26 }
                          : { cx: 455, cy: 32 }
                      }
                      animate={
                        isPumpingHands
                          ? { cx: [100, 310, 455], cy: [26, 44, 32] }
                          : lastBall?.isWicket
                          ? { cx: 494, cy: 32 }
                          : lastBall?.runsScored === 6
                          ? { cx: 34, cy: 12 }
                          : lastBall?.runsScored === 4
                          ? { cx: 36, cy: 46 }
                          : { cx: 225, cy: 28 }
                      }
                      transition={{
                        duration: prefersReducedMotion
                          ? 0.05
                          : isPumpingHands
                          ? 0.72
                          : 0.42,
                        ease: 'easeOut',
                      }}
                    />
                  )}
                </svg>
              </div>

              {/* TWO COMPACT SIDE-BY-SIDE PLAYER HAND STAGES */}
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5 items-stretch z-10">
                {/* LEFT ZONE: YOUR STAGE */}
                <div className="rounded-xl bg-slate-950 border border-slate-800 px-2.5 py-1.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center text-[11px] shrink-0">
                        {me.avatar}
                      </span>
                      <p className="text-xs font-bold text-white truncate">
                        {me.name} (You)
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                          isMeBatting
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                        }`}
                      >
                        {isMeBatting ? 'Batting' : 'Bowling'}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-300">
                        {showRevealedGestures && myRevealedGesture
                          ? myRevealedGesture
                          : activePreviewId}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {isPumpingHands ? (
                        <span className="text-amber-300 font-medium">
                          Delivering...
                        </span>
                      ) : showRevealedGestures && myRevealedGesture ? (
                        <span className="text-emerald-300 font-medium">
                          {HAND_GESTURE_REGISTRY[myRevealedGesture]?.labelEn}
                        </span>
                      ) : roomState.mySubmittedSelection ? (
                        <span className="text-amber-400 font-semibold inline-flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Locked:{' '}
                          {roomState.mySubmittedSelection.gestureId}
                        </span>
                      ) : (
                        activePreviewDef?.fingerDescriptionEn
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center justify-center">
                    {isPumpingHands ? (
                      <HandGestureIllustration
                        key={`my-pump-${lastBall?.ballId}`}
                        isFist
                        pump={!prefersReducedMotion}
                        size="md"
                      />
                    ) : showRevealedGestures && myRevealedGesture ? (
                      <HandGestureIllustration
                        key={`my-reveal-${lastBall?.ballId}`}
                        gestureId={myRevealedGesture}
                        size="md"
                        shake={!prefersReducedMotion}
                        showBadge
                      />
                    ) : (
                      <HandGestureIllustration
                        gestureId={activePreviewId}
                        size="md"
                        showBadge
                      />
                    )}
                  </div>
                </div>

                {/* RIGHT ZONE: OPPONENT STAGE */}
                <div className="rounded-xl bg-slate-950 border border-slate-800 px-2.5 py-1.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center text-[11px] shrink-0">
                        {opponent.avatar}
                      </span>
                      <p className="text-xs font-bold text-white truncate">
                        {opponent.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                          !isMeBatting
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                        }`}
                      >
                        {!isMeBatting ? 'Batting' : 'Bowling'}
                      </span>
                      {showRevealedGestures && oppRevealedGesture ? (
                        <span className="text-[10px] font-mono font-bold text-cyan-300">
                          {oppRevealedGesture}
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-semibold inline-flex items-center gap-0.5 ${
                            roomState.opponentLocked
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          <Lock className="w-2.5 h-2.5" />
                          {roomState.opponentLocked ? 'Locked' : 'Ready'}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {isPumpingHands ? (
                        <span className="text-amber-300 font-medium">
                          Delivering...
                        </span>
                      ) : showRevealedGestures && oppRevealedGesture ? (
                        <span className="text-cyan-300 font-medium">
                          {HAND_GESTURE_REGISTRY[oppRevealedGesture]?.labelEn}
                        </span>
                      ) : roomState.opponentLocked ? (
                        <span className="text-emerald-400">Opponent ready</span>
                      ) : (
                        <span>Waiting...</span>
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center justify-center">
                    {isPumpingHands ? (
                      <HandGestureIllustration
                        key={`opp-pump-${lastBall?.ballId}`}
                        isFist
                        pump={!prefersReducedMotion}
                        mirrored
                        size="md"
                      />
                    ) : showRevealedGestures && oppRevealedGesture ? (
                      <HandGestureIllustration
                        key={`opp-reveal-${lastBall?.ballId}`}
                        gestureId={oppRevealedGesture}
                        size="md"
                        mirrored
                        shake={!prefersReducedMotion}
                        showBadge
                      />
                    ) : (
                      <HandGestureIllustration isFist mirrored size="md" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* INNINGS BREAK TRANSITION PANEL */
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2.5"
            >
              <h3 className="text-lg font-bold text-white">
                Innings {currentInnings.inningsNumber} Complete
              </h3>
              <p className="text-sm text-slate-300">
                {batterPlayer.name} scored{' '}
                <strong className="text-emerald-400 font-mono">
                  {currentInnings.runs}/{currentInnings.wickets}
                </strong>{' '}
                ({HandCricketEngine.formatOvers(currentInnings.balls)} overs).
              </p>
              {roomState.innings[roomState.currentInningsIndex + 1]?.target !==
                null && (
                <p className="text-sm text-amber-300 font-semibold">
                  Target:{' '}
                  <span className="font-mono">
                    {
                      roomState.innings[roomState.currentInningsIndex + 1]
                        ?.target
                    }{' '}
                    runs
                  </span>
                </p>
              )}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onAdvanceBreak();
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
                >
                  <span>Start Next Innings</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </main>

        {/* =====================================================================
            3. DIRECT 18-BUTTON HAND GESTURE SELECTION DECK (1A..6C)
           ===================================================================== */}
        <footer className="shrink-0 w-full">
          <div className="rounded-xl bg-slate-900 border border-slate-800 px-2.5 py-1.5 sm:px-3 sm:py-2 space-y-1">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-bold text-white">
                Select Your Shot
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                1A – 6C
              </span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-9 gap-1 sm:gap-1.5">
              {ALL_18_GESTURE_VARIATIONS.map((gid) => {
                const def = HAND_GESTURE_REGISTRY[gid];
                const isSelected =
                  roomState.phase === 'BALL_SELECTION' &&
                  roomState.mySubmittedSelection?.gestureId === gid;
                const isDisabled = !isInputReady || submitting;

                return (
                  <button
                    key={gid}
                    type="button"
                    disabled={isDisabled}
                    onMouseEnter={() => setPreviewGestureId(gid)}
                    onClick={() => handleSelectGestureVariation(gid)}
                    title={`${def.labelEn} — ${def.fingerDescriptionEn}`}
                    className={`group relative py-1 px-1 rounded-lg border flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-emerald-500/25 border-emerald-400 ring-1 ring-emerald-400'
                        : isDisabled
                        ? 'bg-slate-950/60 border-slate-800/60 opacity-50 cursor-not-allowed'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-600 hover:bg-slate-900 cursor-pointer active:scale-95'
                    }`}
                  >
                    <HandGestureIllustration gestureId={gid} size="xs" />
                    <span
                      className={`text-[10px] sm:text-[11px] font-mono font-bold leading-none mt-0.5 ${
                        isSelected
                          ? 'text-emerald-300'
                          : def.numericValue === 6
                          ? 'text-amber-300'
                          : def.numericValue === 4
                          ? 'text-cyan-300'
                          : 'text-white'
                      }`}
                    >
                      {gid}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </footer>
      </div>

      {/* =====================================================================
          4. BALL HISTORY MODAL
         ===================================================================== */}
      <AnimatePresence>
        {showFullHistoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowFullHistoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[80vh] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <History className="w-4 h-4 text-amber-400" />
                  <span>
                    Ball History (Innings {currentInnings.inningsNumber})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFullHistoryModal(false)}
                  className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1">
                {latestFirstBalls.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-8">
                    No balls bowled in this innings yet.
                  </p>
                ) : (
                  <table className="w-full text-left text-xs font-mono tabular-nums">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800 font-sans">
                        <th className="py-2">Over</th>
                        <th className="py-2">Batter</th>
                        <th className="py-2">Bowler</th>
                        <th className="py-2">Result</th>
                        <th className="py-2 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {latestFirstBalls.map((b) => (
                        <tr key={b.ballId} className="text-slate-200">
                          <td className="py-2 text-slate-400">
                            {b.overDisplay}
                          </td>
                          <td className="py-2">
                            <div className="flex items-center gap-1.5">
                              <HandGestureIllustration
                                gestureId={b.batterGestureId}
                                size="xs"
                              />
                              <span>
                                {b.batterNumber} ({b.batterGestureId})
                              </span>
                            </div>
                          </td>
                          <td className="py-2">
                            <div className="flex items-center gap-1.5">
                              <HandGestureIllustration
                                gestureId={b.bowlerGestureId}
                                size="xs"
                              />
                              <span>
                                {b.bowlerNumber} ({b.bowlerGestureId})
                              </span>
                            </div>
                          </td>
                          <td
                            className={`py-2 font-bold ${
                              b.isWicket ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {b.isWicket
                              ? 'Wicket'
                              : `+${b.runsScored} Run${
                                  b.runsScored === 1 ? '' : 's'
                                }`}
                          </td>
                          <td className="py-2 text-right font-bold">
                            {b.scoreAfter}/{b.wicketsAfter}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
