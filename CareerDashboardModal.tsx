import React, { useState, useEffect } from 'react';
import {
  Award,
  Check,
  ChevronRight,
  Crown,
  Edit3,
  History,
  Medal,
  Trophy,
  User,
  X,
} from 'lucide-react';
import {
  CareerAchievementDefinition,
  CareerMatchHistoryItem,
  CareerStatBucket,
  LeaderboardEntry,
  LeaderboardSortBy,
  PlayerCareerData,
} from '../../types/handCricket';
import { sound } from '../../utils/sound';

interface CareerDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  career: PlayerCareerData | null;
  achievementsCatalog: CareerAchievementDefinition[];
  initialSection?:
    | 'stats'
    | 'records'
    | 'achievements'
    | 'history'
    | 'leaderboard'
    | 'profile';
  onUpdateProfile: (updates: {
    name: string;
    country: string;
    jerseyNumber: number;
    avatar: string;
  }) => Promise<void>;
}

const COUNTRIES = [
  { name: 'Bangladesh', flag: '🇧🇩' },
  { name: 'India', flag: '🇮🇳' },
  { name: 'Pakistan', flag: '🇵🇰' },
  { name: 'Sri Lanka', flag: '🇱🇰' },
  { name: 'Australia', flag: '🇦🇺' },
  { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name: 'South Africa', flag: '🇿🇦' },
  { name: 'New Zealand', flag: '🇳🇿' },
  { name: 'Afghanistan', flag: '🇦🇫' },
  { name: 'West Indies', flag: '🌴' },
];

const AVATARS = ['🏏', '⚡', '🔥', '🦁', '🐯', '👑', '🛡️', '🦅', '🌟', '🎯'];

export const CareerDashboardModal: React.FC<CareerDashboardModalProps> = ({
  isOpen,
  onClose,
  career,
  achievementsCatalog,
  initialSection = 'stats',
  onUpdateProfile,
}) => {
  const [activeSection, setActiveSection] = useState<
    'stats' | 'records' | 'achievements' | 'history' | 'leaderboard' | 'profile'
  >(initialSection);

  const [statSourceTab, setStatSourceTab] = useState<
    'overall' | 'ai' | 'multiplayer'
  >('overall');

  const [leaderboardSort, setLeaderboardSort] =
    useState<LeaderboardSortBy>('wins');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const [inspectedMatch, setInspectedMatch] =
    useState<CareerMatchHistoryItem | null>(null);

  const [editName, setEditName] = useState('');
  const [editCountry, setEditCountry] = useState('Bangladesh');
  const [editJersey, setEditJersey] = useState(75);
  const [editAvatar, setEditAvatar] = useState('🏏');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection, isOpen]);

  useEffect(() => {
    if (career?.profile) {
      setEditName(career.profile.name);
      setEditCountry(career.profile.country);
      setEditJersey(career.profile.jerseyNumber);
      setEditAvatar(career.profile.avatar);
    }
  }, [career]);

  useEffect(() => {
    if (isOpen && activeSection === 'leaderboard') {
      setLoadingLeaderboard(true);
      fetch(`/api/handcricket/leaderboard?sortBy=${leaderboardSort}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.leaderboard) {
            setLeaderboard(data.leaderboard);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingLeaderboard(false));
    }
  }, [isOpen, activeSection, leaderboardSort]);

  if (!isOpen || !career) return null;

  const activeBucket: CareerStatBucket =
    statSourceTab === 'overall'
      ? career.overall
      : statSourceTab === 'ai'
      ? career.ai
      : career.multiplayer;

  const xpIntoLevel = Math.max(0, career.xp - career.currentLevelBaseXp);
  const xpRequiredForNext = Math.max(
    1,
    career.nextLevelXp - career.currentLevelBaseXp
  );
  const xpProgressPercent = Math.min(
    100,
    Math.round((xpIntoLevel / xpRequiredForNext) * 100)
  );

  const countryInfo =
    COUNTRIES.find((c) => c.name === career.profile.country) || COUNTRIES[0];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setSavingProfile(true);
    try {
      await onUpdateProfile({
        name: editName.trim(),
        country: editCountry,
        jerseyNumber: Number(editJersey) || 0,
        avatar: editAvatar,
      });
      setProfileSavedToast(true);
      setTimeout(() => setProfileSavedToast(false), 2200);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl shrink-0">
              <span>{career.profile.avatar}</span>
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-mono font-bold text-[10px]">
                #{career.profile.jerseyNumber}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white">
                  {career.profile.name}
                </h2>
                <span className="text-xs text-slate-400">
                  {countryInfo.flag} {countryInfo.name}
                </span>
                <button
                  onClick={() => {
                    sound.playClick();
                    setActiveSection('profile');
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 ml-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="mt-1 flex items-center gap-2 text-xs text-slate-300 font-mono">
                <span className="text-amber-400 font-bold">
                  Level {career.level}
                </span>
                <span>·</span>
                <span className="text-emerald-300 font-sans font-medium">
                  {career.stage}
                </span>
                <span>·</span>
                <span className="tabular-nums">{career.xp} XP</span>
              </div>

              <div className="mt-2 w-48 sm:w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${xpProgressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="absolute top-4 right-4 sm:static p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'stats', label: 'Statistics', icon: Trophy },
            { id: 'records', label: 'Records', icon: Crown },
            { id: 'achievements', label: 'Achievements', icon: Award },
            { id: 'history', label: 'Match History', icon: History },
            { id: 'leaderboard', label: 'Leaderboard', icon: Medal },
            { id: 'profile', label: 'Profile', icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  sound.playClick();
                  setActiveSection(tab.id as typeof activeSection);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* 1. STATISTICS */}
          {activeSection === 'stats' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <h3 className="text-base font-bold text-white">
                  Career Statistics
                </h3>

                <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl self-start">
                  {[
                    { id: 'overall', label: 'Overall' },
                    { id: 'ai', label: 'Single Player' },
                    { id: 'multiplayer', label: 'Multiplayer' },
                  ].map((src) => (
                    <button
                      key={src.id}
                      onClick={() => {
                        sound.playClick();
                        setStatSourceTab(src.id as typeof statSourceTab);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        statSourceTab === src.id
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {src.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block">Matches</span>
                  <span className="text-2xl font-mono font-bold text-white tabular-nums mt-1 block">
                    {activeBucket.totalMatches}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono mt-1 block tabular-nums">
                    W: {activeBucket.wins} · L: {activeBucket.losses} · T:{' '}
                    {activeBucket.ties}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block">
                    Total Runs
                  </span>
                  <span className="text-2xl font-mono font-bold text-emerald-400 tabular-nums mt-1 block">
                    {activeBucket.totalRuns}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono mt-1 block tabular-nums">
                    Best: {activeBucket.highestScore} · Balls:{' '}
                    {activeBucket.ballsFaced}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block">Wickets</span>
                  <span className="text-2xl font-mono font-bold text-amber-400 tabular-nums mt-1 block">
                    {activeBucket.totalWickets}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono mt-1 block tabular-nums">
                    Best: {activeBucket.bestBowlingWickets}/
                    {activeBucket.bestBowlingRuns}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block">Win Rate</span>
                  <span className="text-2xl font-mono font-bold text-cyan-400 tabular-nums mt-1 block">
                    {activeBucket.winRate}%
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono mt-1 block tabular-nums">
                    Streak: {activeBucket.consecutiveWins}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400">
                    Batting Average
                  </span>
                  <p className="text-lg font-mono font-bold text-white tabular-nums mt-0.5">
                    {activeBucket.battingAverage}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400">Strike Rate</span>
                  <p className="text-lg font-mono font-bold text-white tabular-nums mt-0.5">
                    {activeBucket.strikeRate}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400">
                    Boundaries (4s / 6s)
                  </span>
                  <p className="text-lg font-mono font-bold text-white tabular-nums mt-0.5">
                    {activeBucket.fours} / {activeBucket.sixes}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400">50s / 100s</span>
                  <p className="text-lg font-mono font-bold text-white tabular-nums mt-0.5">
                    {activeBucket.fifties} / {activeBucket.hundreds}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. RECORDS */}
          {activeSection === 'records' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Career Records</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    label: 'Highest Score',
                    val: `${career.overall.highestScore} Runs`,
                    sub: `Total Runs: ${career.overall.totalRuns}`,
                  },
                  {
                    label: 'Best Bowling',
                    val: `${career.overall.bestBowlingWickets}/${career.overall.bestBowlingRuns}`,
                    sub: `Hat-Tricks: ${career.overall.hatTricks}`,
                  },
                  {
                    label: 'Longest Win Streak',
                    val: `${career.overall.maxConsecutiveWins} Matches`,
                    sub: `Current Streak: ${career.overall.consecutiveWins}`,
                  },
                  {
                    label: 'Total Wickets',
                    val: `${career.overall.totalWickets}`,
                    sub: `Balls Bowled: ${career.overall.ballsBowled}`,
                  },
                  {
                    label: 'Total Boundaries',
                    val: `${career.overall.fours + career.overall.sixes}`,
                    sub: `${career.overall.fours} Fours · ${career.overall.sixes} Sixes`,
                  },
                  {
                    label: 'Overall Win Rate',
                    val: `${career.overall.winRate}%`,
                    sub: `Test Wins: ${career.overall.testWins}`,
                  },
                ].map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between"
                  >
                    <span className="text-xs text-slate-400">{rec.label}</span>
                    <span className="text-2xl font-mono font-bold text-amber-400 tabular-nums my-1.5">
                      {rec.val}
                    </span>
                    <span className="text-xs text-slate-500 font-mono tabular-nums">
                      {rec.sub}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. ACHIEVEMENTS */}
          {activeSection === 'achievements' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Achievements</h3>
                <span className="text-xs font-mono text-emerald-400 tabular-nums">
                  Unlocked: {Object.keys(career.unlockedAchievements).length} /{' '}
                  {achievementsCatalog.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {achievementsCatalog.map((ach) => {
                  const unlockedAt = career.unlockedAchievements[ach.id];
                  const isUnlocked = Boolean(unlockedAt);
                  return (
                    <div
                      key={ach.id}
                      className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        isUnlocked
                          ? 'bg-slate-950 border-emerald-500/50'
                          : 'bg-slate-950/60 border-slate-800 opacity-65'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-white block">
                          {ach.titleEn}
                        </span>
                        <p className="text-xs text-slate-400">
                          {ach.descriptionEn}
                        </p>
                        {isUnlocked && (
                          <p className="text-[11px] text-emerald-400 font-mono">
                            Unlocked{' '}
                            {new Date(unlockedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <span
                        className={`text-xs font-mono font-bold tabular-nums shrink-0 ${
                          isUnlocked ? 'text-amber-400' : 'text-slate-500'
                        }`}
                      >
                        +{ach.xpReward} XP
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. MATCH HISTORY */}
          {activeSection === 'history' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Match History</h3>

              {career.history.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <p className="text-sm text-slate-400">
                    No completed matches yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {career.history.map((item) => (
                    <div
                      key={item.matchId}
                      onClick={() => {
                        sound.playClick();
                        setInspectedMatch(
                          inspectedMatch?.matchId === item.matchId ? null : item
                        );
                      }}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                            <span
                              className={
                                item.playerResult === 'WIN'
                                  ? 'text-emerald-400 font-bold'
                                  : item.playerResult === 'TIE'
                                  ? 'text-amber-400 font-bold'
                                  : 'text-rose-400 font-bold'
                              }
                            >
                              {item.playerResult}
                            </span>
                            <span>·</span>
                            <span>
                              {item.format === 'test_match'
                                ? 'Test Match'
                                : `${item.oversConfig} Overs`}
                            </span>
                            <span>·</span>
                            <span>
                              {new Date(item.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-white">
                            vs {item.opponentName} —{' '}
                            <span className="text-slate-300 font-normal">
                              {item.marginTextEn}
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                          <div>
                            <span className="text-slate-400">Runs: </span>
                            <strong className="text-emerald-400">
                              {item.playerTotalRuns} ({item.playerBallsFaced}b)
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Wickets: </span>
                            <strong className="text-amber-400">
                              {item.playerWicketsTaken}
                            </strong>
                          </div>
                          <div className="text-cyan-400 font-bold">
                            +{item.xpEarned} XP
                          </div>
                          <ChevronRight
                            className={`w-4 h-4 text-slate-400 transition-transform ${
                              inspectedMatch?.matchId === item.matchId
                                ? 'rotate-90'
                                : ''
                            }`}
                          />
                        </div>
                      </div>

                      {inspectedMatch?.matchId === item.matchId && (
                        <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {item.inningsSummaries.map((inn) => (
                            <div
                              key={inn.inningsNumber}
                              className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono tabular-nums"
                            >
                              <span className="text-slate-300 font-sans">
                                Innings {inn.inningsNumber}:{' '}
                                {inn.battingPlayerName}
                              </span>
                              <span className="text-white font-bold">
                                {inn.runs}/{inn.wickets} ({inn.overDisplay} ov)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. LEADERBOARD */}
          {activeSection === 'leaderboard' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base font-bold text-white">
                  Multiplayer Leaderboard
                </h3>

                <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl self-start">
                  {[
                    { id: 'wins', label: 'Wins' },
                    { id: 'runs', label: 'Runs' },
                    { id: 'winRate', label: 'Win Rate' },
                    { id: 'xp', label: 'XP' },
                    { id: 'level', label: 'Level' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        sound.playClick();
                        setLeaderboardSort(s.id as LeaderboardSortBy);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        leaderboardSort === s.id
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {loadingLeaderboard ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  Loading leaderboard...
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs text-slate-400">
                        <th className="py-3 px-4">Rank</th>
                        <th className="py-3 px-4">Player</th>
                        <th className="py-3 px-4">Level</th>
                        <th className="py-3 px-4 text-right">Matches</th>
                        <th className="py-3 px-4 text-right">Wins</th>
                        <th className="py-3 px-4 text-right">Runs</th>
                        <th className="py-3 px-4 text-right">Win Rate</th>
                        <th className="py-3 px-4 text-right">XP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 text-xs sm:text-sm font-mono tabular-nums">
                      {leaderboard.map((entry) => {
                        const isMe = entry.playerId === career.profile.playerId;
                        return (
                          <tr
                            key={entry.playerId}
                            className={
                              isMe
                                ? 'bg-emerald-950/30 text-emerald-200'
                                : 'text-slate-200 hover:bg-slate-900/60'
                            }
                          >
                            <td className="py-3 px-4 font-bold text-amber-400">
                              #{entry.rank}
                            </td>
                            <td className="py-3 px-4 font-sans">
                              <div className="flex items-center gap-2">
                                <span>{entry.avatar}</span>
                                <span className="font-bold text-white">
                                  {entry.name}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">
                                  #{entry.jerseyNumber}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              Lv.{entry.level} · {entry.stage}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {entry.multiplayerMatches}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-400">
                              {entry.multiplayerWins}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {entry.multiplayerRuns}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {entry.multiplayerWinRate}%
                            </td>
                            <td className="py-3 px-4 text-right text-amber-300">
                              {entry.xp}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 6. PROFILE */}
          {activeSection === 'profile' && (
            <form onSubmit={handleSaveProfile} className="max-w-xl space-y-4">
              <h3 className="text-base font-bold text-white">Edit Profile</h3>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Player Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={28}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Country
                  </label>
                  <select
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Jersey Number (0–99)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={editJersey}
                    onChange={(e) =>
                      setEditJersey(
                        Math.max(0, Math.min(99, Number(e.target.value) || 0))
                      )
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Avatar
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setEditAvatar(av);
                      }}
                      className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center border transition-all cursor-pointer ${
                        editAvatar === av
                          ? 'bg-emerald-500/20 border-emerald-400 scale-105'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
                {profileSavedToast && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Saved
                  </span>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
