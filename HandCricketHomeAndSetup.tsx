import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Edit3,
  Medal,
  Play,
  Trophy,
} from 'lucide-react';
import {
  AIDifficulty,
  LimitedOversPreset,
  MatchFormat,
  MatchMode,
  PlayerCareerData,
} from '../../types/handCricket';
import { HAND_CRICKET_LIMITS } from '../../engine/handCricketEngine';
import { sound } from '../../utils/sound';

interface HandCricketHomeAndSetupProps {
  career: PlayerCareerData | null;
  stats: { totalPlays: number; totalUniquePlayers: number };
  onBackToKhelghor: () => void;
  onOpenRules: () => void;
  onOpenCareer: (
    section?:
      | 'stats'
      | 'records'
      | 'achievements'
      | 'history'
      | 'leaderboard'
      | 'profile'
  ) => void;
  onCreateMatchOrRoom: (params: {
    mode: MatchMode;
    format: MatchFormat;
    overs: number | null;
    wicketsPerInnings: number;
    aiDifficulty: AIDifficulty;
  }) => Promise<void>;
  onJoinMultiplayerRoom: (roomCode: string) => Promise<void>;
  joinError?: string | null;
}

type SetupFlowScreen =
  | 'HOME'
  | 'MODE_SELECT'
  | 'AI_SETUP'
  | 'MP_CHOICE'
  | 'MP_CREATE'
  | 'MP_JOIN';

export const HandCricketHomeAndSetup: React.FC<
  HandCricketHomeAndSetupProps
> = ({
  career,
  onBackToKhelghor,
  onOpenRules,
  onOpenCareer,
  onCreateMatchOrRoom,
  onJoinMultiplayerRoom,
  joinError,
}) => {
  const [flowScreen, setFlowScreen] = useState<SetupFlowScreen>('HOME');

  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('easy');
  const [matchFormat, setMatchFormat] =
    useState<MatchFormat>('limited_overs');
  const [limitedOversPreset, setLimitedOversPreset] =
    useState<LimitedOversPreset>(2);
  const [customOvers, setCustomOvers] = useState<number>(5);
  const [wicketsPerInnings, setWicketsPerInnings] = useState<number>(3);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleLaunchMatchOrRoom = async (mode: MatchMode) => {
    if (creating) return;
    sound.playClick();
    setCreating(true);
    try {
      const effectiveOvers =
        matchFormat === 'test_match'
          ? null
          : matchFormat === 'limited_overs'
          ? limitedOversPreset
          : Math.max(
              HAND_CRICKET_LIMITS.MIN_CUSTOM_OVERS,
              Math.min(HAND_CRICKET_LIMITS.MAX_CUSTOM_OVERS, customOvers)
            );
      const effectiveWickets =
        matchFormat === 'test_match'
          ? HAND_CRICKET_LIMITS.TEST_MATCH_WICKETS
          : Math.max(
              HAND_CRICKET_LIMITS.MIN_WICKETS,
              Math.min(HAND_CRICKET_LIMITS.MAX_WICKETS, wicketsPerInnings)
            );

      await onCreateMatchOrRoom({
        mode,
        format: matchFormat,
        overs: effectiveOvers,
        wicketsPerInnings: effectiveWickets,
        aiDifficulty,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim() || joining) return;
    sound.playClick();
    setJoining(true);
    try {
      await onJoinMultiplayerRoom(roomCodeInput.trim().toUpperCase());
    } finally {
      setJoining(false);
    }
  };

  const renderMatchFormatSettings = () => (
    <div className="space-y-5">
      {/* Match Format */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-200">
          Match Format
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          {(
            [
              { id: 'limited_overs', label: 'Limited Overs' },
              { id: 'custom_match', label: 'Custom Match' },
              { id: 'test_match', label: 'Test Match' },
            ] as const
          ).map((fmt) => (
            <button
              key={fmt.id}
              type="button"
              onClick={() => {
                sound.playClick();
                setMatchFormat(fmt.id);
              }}
              className={`py-2.5 px-4 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                matchFormat === fmt.id
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              {fmt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Format-Specific Settings (Only relevant settings shown) */}
      {matchFormat === 'limited_overs' && (
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-200">
            Overs
          </label>
          <div className="grid grid-cols-4 gap-2.5">
            {HAND_CRICKET_LIMITS.LIMITED_OVERS_PRESETS.map(
              (ov: LimitedOversPreset) => (
                <button
                  key={ov}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setLimitedOversPreset(ov);
                  }}
                  className={`py-2.5 px-3 rounded-xl font-mono text-sm font-semibold border transition-colors cursor-pointer ${
                    limitedOversPreset === ov
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {ov} Overs
                </button>
              )
            )}
          </div>
        </div>
      )}

      {matchFormat === 'custom_match' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-200">
              Overs (1–50)
            </label>
            <input
              type="number"
              min={HAND_CRICKET_LIMITS.MIN_CUSTOM_OVERS}
              max={HAND_CRICKET_LIMITS.MAX_CUSTOM_OVERS}
              value={customOvers}
              onChange={(e) =>
                setCustomOvers(
                  Math.max(1, Math.min(50, Number(e.target.value) || 1))
                )
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-200">
              Wickets (1–10)
            </label>
            <input
              type="number"
              min={HAND_CRICKET_LIMITS.MIN_WICKETS}
              max={HAND_CRICKET_LIMITS.MAX_WICKETS}
              value={wicketsPerInnings}
              onChange={(e) =>
                setWicketsPerInnings(
                  Math.max(1, Math.min(10, Number(e.target.value) || 1))
                )
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      )}

      {matchFormat === 'test_match' && (
        <div className="py-3 px-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300">
          <span>4 Innings</span>
          <span>·</span>
          <span>10 Wickets per Innings</span>
          <span>·</span>
          <span>Unlimited Overs</span>
        </div>
      )}
    </div>
  );

  const handleBackStep = () => {
    sound.playClick();
    if (flowScreen === 'MP_CREATE' || flowScreen === 'MP_JOIN') {
      setFlowScreen('MP_CHOICE');
    } else if (flowScreen === 'AI_SETUP' || flowScreen === 'MP_CHOICE') {
      setFlowScreen('MODE_SELECT');
    } else if (flowScreen === 'MODE_SELECT') {
      setFlowScreen('HOME');
    } else {
      onBackToKhelghor();
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackStep}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Hand Cricket
          </h1>
        </div>
      </header>

      {/* =====================================================================
          1. HOME PAGE — MINIMAL GAME MENU
         ===================================================================== */}
      {flowScreen === 'HOME' && (
        <div className="space-y-6">
          {/* 1. Player Profile */}
          <section className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="relative w-13 h-13 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shrink-0">
                  <span>{career?.profile.avatar || '🏏'}</span>
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-mono font-bold text-[10px]">
                    #{career?.profile.jerseyNumber ?? 75}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      {career?.profile.name || 'Player'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        onOpenCareer('profile');
                      }}
                      className="text-xs text-slate-400 hover:text-emerald-400 inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>{career?.profile.country || 'Bangladesh'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-400 font-medium">
                      {career?.stage || 'Rookie'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm font-mono tabular-nums">
                <div>
                  <span className="text-xs text-slate-400 block">Level</span>
                  <span className="font-bold text-white">
                    {career?.level ?? 1}
                  </span>
                </div>
                <div className="h-7 w-px bg-slate-800" />
                <div>
                  <span className="text-xs text-slate-400 block">XP</span>
                  <span className="font-bold text-emerald-400">
                    {career?.xp ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 grid grid-cols-3 gap-4 text-sm font-mono tabular-nums">
              <div>
                <span className="text-xs text-slate-400 font-sans block">
                  Matches
                </span>
                <span className="text-base sm:text-lg font-bold text-white">
                  {career?.overall.totalMatches ?? 0}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-sans block">
                  Wins / Losses
                </span>
                <span className="text-base sm:text-lg font-bold">
                  <span className="text-emerald-400">
                    {career?.overall.wins ?? 0}W
                  </span>
                  <span className="text-slate-600 mx-1">/</span>
                  <span className="text-rose-400">
                    {career?.overall.losses ?? 0}L
                  </span>
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-sans block">
                  Rank
                </span>
                <span className="text-base sm:text-lg font-sans font-bold text-amber-400">
                  {career?.stage || 'Rookie'}
                </span>
              </div>
            </div>
          </section>

          {/* 5. Start Game (Prominent Primary Action) */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setFlowScreen('MODE_SELECT');
            }}
            className="w-full py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Game</span>
          </button>

          {/* 2. Career Mode, 3. Leaderboard, 4. Rules */}
          <nav className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenCareer('stats');
              }}
              className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span>Career Mode</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenCareer('leaderboard');
              }}
              className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Medal className="w-4 h-4 text-amber-400" />
              <span>Leaderboard</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenRules();
              }}
              className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Rules</span>
            </button>
          </nav>
        </div>
      )}

      {/* =====================================================================
          2. GAME MODE SELECTION ("Select Game")
         ===================================================================== */}
      {flowScreen === 'MODE_SELECT' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          <h2 className="text-lg font-bold text-white">Select Game</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setFlowScreen('AI_SETUP');
              }}
              className="py-8 px-6 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500 text-center transition-all cursor-pointer"
            >
              <span className="text-lg font-bold text-white block">
                Play vs AI
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setFlowScreen('MP_CHOICE');
              }}
              className="py-8 px-6 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500 text-center transition-all cursor-pointer"
            >
              <span className="text-lg font-bold text-white block">
                Multiplayer
              </span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          3. AI MATCH SETUP CLEANUP
         ===================================================================== */}
      {flowScreen === 'AI_SETUP' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          {/* Difficulty */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-200">
              Difficulty
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(
                [
                  { id: 'easy', label: 'Easy' },
                  { id: 'medium', label: 'Medium' },
                  { id: 'hard', label: 'Hard' },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setAiDifficulty(d.id);
                  }}
                  className={`py-2.5 px-4 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                    aiDifficulty === d.id
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Match Format & Relevant Settings */}
          {renderMatchFormatSettings()}

          {/* Start Match */}
          <button
            type="button"
            disabled={creating}
            onClick={() => handleLaunchMatchOrRoom('ai_single_player')}
            className="w-full py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-bold text-base transition-all cursor-pointer"
          >
            {creating ? 'Starting...' : 'Start Match'}
          </button>
        </div>
      )}

      {/* =====================================================================
          4. MULTIPLAYER SETUP CLEANUP
         ===================================================================== */}
      {flowScreen === 'MP_CHOICE' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          <h2 className="text-lg font-bold text-white">Multiplayer</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setFlowScreen('MP_CREATE');
              }}
              className="py-8 px-6 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500 text-center transition-all cursor-pointer"
            >
              <span className="text-lg font-bold text-white block">
                Create Room
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setFlowScreen('MP_JOIN');
              }}
              className="py-8 px-6 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500 text-center transition-all cursor-pointer"
            >
              <span className="text-lg font-bold text-white block">
                Join Room
              </span>
            </button>
          </div>
        </div>
      )}

      {flowScreen === 'MP_CREATE' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <h2 className="text-lg font-bold text-white">Create Room</h2>

          {renderMatchFormatSettings()}

          <button
            type="button"
            disabled={creating}
            onClick={() => handleLaunchMatchOrRoom('multiplayer_room')}
            className="w-full py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-bold text-base transition-all cursor-pointer"
          >
            {creating ? 'Creating Room...' : 'Create Room'}
          </button>
        </div>
      )}

      {flowScreen === 'MP_JOIN' && (
        <form
          onSubmit={handleJoinSubmit}
          className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 max-w-md mx-auto"
        >
          <h2 className="text-lg font-bold text-white">Join Room</h2>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-200">
              Room Code
            </label>
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              maxLength={12}
              placeholder="Enter 6-character code"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 text-white font-mono font-bold tracking-widest text-center uppercase text-base focus:outline-none"
            />
          </div>

          {joinError && (
            <p className="text-xs text-rose-400 text-center">{joinError}</p>
          )}

          <button
            type="submit"
            disabled={!roomCodeInput.trim() || joining}
            className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-base transition-colors cursor-pointer"
          >
            {joining ? 'Joining...' : 'Join Room'}
          </button>
        </form>
      )}
    </div>
  );
};
