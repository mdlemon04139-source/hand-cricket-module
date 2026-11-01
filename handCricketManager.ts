import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  AIDifficulty,
  CareerAchievementDefinition,
  CareerInningsSummary,
  CareerMatchHistoryItem,
  CareerStage,
  CareerStatBucket,
  GestureVariationId,
  HandCricketClientState,
  HandCricketMatchState,
  HandNumber,
  LeaderboardEntry,
  LeaderboardSortBy,
  MatchCareerReward,
  MatchConfiguration,
  MatchFormat,
  MatchMode,
  MatchParticipant,
  PlayerCareerData,
  PlayerCareerProfile,
  TossCall,
  TossDecision,
} from '../types/handCricket';
import {
  getDefaultGestureForNumber,
  getRandomGestureForNumber,
  isValidGestureForNumber,
  parseHandSelection,
  resolveGestureNumericValue,
} from '../handcricket/data/gestureRegistry';
import { HandCricketEngine } from '../engine/handCricketEngine';
import { HandCricketAI } from '../engine/handCricketAI';
import { gameStatsManager } from './gameStatsManager';

const CAREER_DATA_FILE = path.resolve(process.cwd(), 'handcricket-data.json');

export const CAREER_ACHIEVEMENTS: CareerAchievementDefinition[] = [
  {
    id: 'first_match',
    titleBn: 'প্রথম পদক্ষেপ',
    titleEn: 'First Match',
    descriptionBn: 'প্রথম হ্যান্ড ক্রিকেট ম্যাচ সম্পন্ন করুন',
    descriptionEn: 'Complete your first Hand Cricket match',
    xpReward: 50,
    iconName: 'Play',
    milestoneCategory: 'matches',
  },
  {
    id: 'first_win',
    titleBn: 'প্রথম বিজয়',
    titleEn: 'First Win',
    descriptionBn: 'ক্যারিয়ারের প্রথম ম্যাচ জিতুন',
    descriptionEn: 'Win your first match in Career Mode',
    xpReward: 100,
    iconName: 'Trophy',
    milestoneCategory: 'wins',
  },
  {
    id: 'half_century',
    titleBn: 'অর্ধশতক বীর',
    titleEn: 'Half-Century Hero',
    descriptionBn: 'এক ম্যাচে ৫০ বা তার বেশি রান করুন',
    descriptionEn: 'Score 50 or more runs in a single match',
    xpReward: 150,
    iconName: 'Flame',
    milestoneCategory: 'runs',
  },
  {
    id: 'runs_100',
    titleBn: 'শতকের মাইলফলক',
    titleEn: '100 Career Runs',
    descriptionBn: 'ক্যারিয়ারে মোট ১০০ রান পূর্ণ করুন',
    descriptionEn: 'Accumulate 100 total runs in your career',
    xpReward: 150,
    iconName: 'Award',
    milestoneCategory: 'runs',
  },
  {
    id: 'runs_500',
    titleBn: 'রান মেশিন (৫০০)',
    titleEn: '500 Career Runs',
    descriptionBn: 'ক্যারিয়ারে মোট ৫০০ রান পূর্ণ করুন',
    descriptionEn: 'Accumulate 500 total runs in your career',
    xpReward: 300,
    iconName: 'Zap',
    milestoneCategory: 'runs',
  },
  {
    id: 'runs_1000',
    titleBn: 'হাজার রানের সম্রাট',
    titleEn: '1000 Career Runs',
    descriptionBn: 'ক্যারিয়ারে মোট ১০০০ রান পূর্ণ করুন',
    descriptionEn: 'Accumulate 1,000 total runs in your career',
    xpReward: 600,
    iconName: 'Crown',
    milestoneCategory: 'runs',
  },
  {
    id: 'hat_trick',
    titleBn: 'হ্যাটট্রিক শিকারি',
    titleEn: 'Hat-Trick Bowler',
    descriptionBn: 'বোলিংয়ে টানা ৩ বলে ৩টি উইকেট নিন',
    descriptionEn: 'Take 3 wickets in 3 consecutive balls',
    xpReward: 250,
    iconName: 'Target',
    milestoneCategory: 'wickets',
  },
  {
    id: 'wins_10',
    titleBn: 'দশম বিজয়',
    titleEn: '10 Career Wins',
    descriptionBn: 'ক্যারিয়ারে মোট ১০টি ম্যাচে জয়ী হোন',
    descriptionEn: 'Win 10 matches across your career',
    xpReward: 250,
    iconName: 'Medal',
    milestoneCategory: 'wins',
  },
  {
    id: 'matches_50',
    titleBn: 'অভিজ্ঞ ক্রিকেটার (৫০ ম্যাচ)',
    titleEn: '50 Matches Veteran',
    descriptionBn: 'ক্যারিয়ারে ৫০টি ম্যাচ সম্পন্ন করুন',
    descriptionEn: 'Complete 50 career matches',
    xpReward: 400,
    iconName: 'Shield',
    milestoneCategory: 'matches',
  },
  {
    id: 'test_winner',
    titleBn: 'টেস্ট চ্যাম্পিয়ন',
    titleEn: 'Test Match Winner',
    descriptionBn: '৪ ইনিংসের পূর্ণাঙ্গ টেস্ট ম্যাচে জয়ী হোন',
    descriptionEn: 'Win a 4-innings Test Match',
    xpReward: 350,
    iconName: 'Star',
    milestoneCategory: 'special',
  },
];

export const CAREER_STAGE_CONFIG: {
  minLevel: number;
  stage: CareerStage;
  stageBn: string;
}[] = [
  { minLevel: 35, stage: 'Legend', stageBn: 'কিংবদন্তি (Legend)' },
  { minLevel: 20, stage: 'Elite', stageBn: 'এলিট (Elite)' },
  { minLevel: 10, stage: 'Professional', stageBn: 'পেশাদার (Professional)' },
  { minLevel: 5, stage: 'Rising Player', stageBn: 'উদীয়মান খেলোয়াড় (Rising)' },
  { minLevel: 1, stage: 'Rookie', stageBn: 'নবীন (Rookie)' },
];

function createEmptyStatBucket(): CareerStatBucket {
  return {
    totalMatches: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    inningsBatted: 0,
    notOuts: 0,
    totalRuns: 0,
    ballsFaced: 0,
    highestScore: 0,
    fifties: 0,
    hundreds: 0,
    fours: 0,
    sixes: 0,
    totalWickets: 0,
    ballsBowled: 0,
    runsConceded: 0,
    bestBowlingWickets: 0,
    bestBowlingRuns: 0,
    consecutiveWins: 0,
    maxConsecutiveWins: 0,
    hatTricks: 0,
    testWins: 0,
    battingAverage: 0,
    strikeRate: 0,
    winRate: 0,
  };
}

export function computeLevelAndStage(xp: number): {
  level: number;
  stage: CareerStage;
  stageBn: string;
  currentLevelBaseXp: number;
  nextLevelXp: number;
} {
  // Progressive configurable XP threshold: 180 XP per level
  const xpPerLevel = 180;
  const level = Math.max(1, Math.floor(xp / xpPerLevel) + 1);
  const currentLevelBaseXp = (level - 1) * xpPerLevel;
  const nextLevelXp = level * xpPerLevel;

  const foundStage =
    CAREER_STAGE_CONFIG.find((c) => level >= c.minLevel) ||
    CAREER_STAGE_CONFIG[CAREER_STAGE_CONFIG.length - 1];

  return {
    level,
    stage: foundStage.stage,
    stageBn: foundStage.stageBn,
    currentLevelBaseXp,
    nextLevelXp,
  };
}

interface ActiveCricketRoom {
  state: HandCricketMatchState;
  careerRewards: Record<string, MatchCareerReward>;
  tossAutoConfirmAt?: number;
  revealAdvanceAt?: number;
  subscribers: Map<string, Set<(clientState: HandCricketClientState) => void>>;
  lastHeartbeat: Record<string, number>;
}

interface PersistentCricketStore {
  careers: Record<string, PlayerCareerData>;
  updatedAt: number;
}

export class HandCricketManager {
  private rooms: Map<string, ActiveCricketRoom> = new Map();
  private codeToRoomId: Map<string, string> = new Map();
  private store: PersistentCricketStore = { careers: {}, updatedAt: Date.now() };
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private persistToDisk: boolean;

  constructor(persistToDisk = true) {
    this.persistToDisk = persistToDisk;
    if (this.persistToDisk) {
      this.loadStore();
    }
    this.seedInitialLeaderboardIfNeeded();
    this.tickInterval = setInterval(() => this.processServerTick(), 300);
    if (typeof this.tickInterval.unref === 'function') {
      this.tickInterval.unref();
    }
  }

  private loadStore(): void {
    if (!this.persistToDisk) return;
    try {
      if (fs.existsSync(CAREER_DATA_FILE)) {
        const raw = fs.readFileSync(CAREER_DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.careers === 'object') {
          this.store = parsed;
        }
      }
    } catch {
      // use in-memory store
    }
  }

  private saveStore(): void {
    this.store.updatedAt = Date.now();
    if (!this.persistToDisk) return;
    try {
      fs.writeFileSync(
        CAREER_DATA_FILE,
        JSON.stringify(this.store, null, 2),
        'utf-8'
      );
    } catch {
      // ignore write error
    }
  }

  private seedInitialLeaderboardIfNeeded(): void {
    const seedPlayers: Array<{
      id: string;
      name: string;
      country: string;
      jersey: number;
      avatar: string;
      xp: number;
      mpMatches: number;
      mpWins: number;
      mpLosses: number;
      mpRuns: number;
      mpBalls: number;
      mpHighest: number;
      mpWickets: number;
    }> = [
      {
        id: 'hc_mp_seed_shakib',
        name: 'Tanvir Hasan',
        country: 'Bangladesh',
        jersey: 75,
        avatar: '🏏',
        xp: 2450,
        mpMatches: 18,
        mpWins: 14,
        mpLosses: 4,
        mpRuns: 468,
        mpBalls: 132,
        mpHighest: 64,
        mpWickets: 29,
      },
      {
        id: 'hc_mp_seed_rahat',
        name: 'Arif Mahmud',
        country: 'Bangladesh',
        jersey: 18,
        avatar: '⚡',
        xp: 1920,
        mpMatches: 15,
        mpWins: 11,
        mpLosses: 4,
        mpRuns: 392,
        mpBalls: 115,
        mpHighest: 58,
        mpWickets: 22,
      },
      {
        id: 'hc_mp_seed_farhan',
        name: 'Farhan Chowdhury',
        country: 'Bangladesh',
        jersey: 28,
        avatar: '🔥',
        xp: 1340,
        mpMatches: 12,
        mpWins: 8,
        mpLosses: 4,
        mpRuns: 284,
        mpBalls: 94,
        mpHighest: 46,
        mpWickets: 17,
      },
      {
        id: 'hc_mp_seed_sami',
        name: 'Samiul Islam',
        country: 'Bangladesh',
        jersey: 10,
        avatar: '🛡️',
        xp: 890,
        mpMatches: 9,
        mpWins: 5,
        mpLosses: 4,
        mpRuns: 196,
        mpBalls: 68,
        mpHighest: 39,
        mpWickets: 12,
      },
    ];

    let changed = false;
    for (const sp of seedPlayers) {
      if (this.store.careers[sp.id] && this.store.careers[sp.id].profile.name !== sp.name) {
        this.store.careers[sp.id].profile.name = sp.name;
        changed = true;
      }
      if (!this.store.careers[sp.id]) {
        const lvl = computeLevelAndStage(sp.xp);
        const mpBucket: CareerStatBucket = {
          ...createEmptyStatBucket(),
          totalMatches: sp.mpMatches,
          wins: sp.mpWins,
          losses: sp.mpLosses,
          ties: 0,
          inningsBatted: sp.mpMatches,
          notOuts: 3,
          totalRuns: sp.mpRuns,
          ballsFaced: sp.mpBalls,
          highestScore: sp.mpHighest,
          fifties: sp.mpHighest >= 50 ? 2 : 0,
          fours: Math.floor(sp.mpRuns / 14),
          sixes: Math.floor(sp.mpRuns / 18),
          totalWickets: sp.mpWickets,
          ballsBowled: sp.mpBalls,
          runsConceded: Math.floor(sp.mpRuns * 0.85),
          bestBowlingWickets: 4,
          bestBowlingRuns: 12,
          consecutiveWins: 2,
          maxConsecutiveWins: 5,
          battingAverage: Number((sp.mpRuns / Math.max(1, sp.mpMatches - 3)).toFixed(2)),
          strikeRate: Number(((sp.mpRuns / sp.mpBalls) * 100).toFixed(1)),
          winRate: Number(((sp.mpWins / sp.mpMatches) * 100).toFixed(1)),
        };

        this.store.careers[sp.id] = {
          profile: {
            playerId: sp.id,
            name: sp.name,
            country: sp.country,
            jerseyNumber: sp.jersey,
            avatar: sp.avatar,
            createdAt: Date.now() - 86400000 * 7,
            updatedAt: Date.now() - 3600000,
          },
          xp: sp.xp,
          level: lvl.level,
          stage: lvl.stage,
          stageBn: lvl.stageBn,
          currentLevelBaseXp: lvl.currentLevelBaseXp,
          nextLevelXp: lvl.nextLevelXp,
          overall: { ...mpBucket },
          ai: createEmptyStatBucket(),
          multiplayer: { ...mpBucket },
          unlockedAchievements: {
            first_match: Date.now() - 86400000 * 6,
            first_win: Date.now() - 86400000 * 6,
            runs_100: Date.now() - 86400000 * 3,
          },
          history: [],
          processedMatchIds: [],
        };
        changed = true;
      }
    }
    if (changed) {
      this.saveStore();
    }
  }

  // --- CAREER PROFILE & STATS MANAGEMENT ---

  public getOrCreateCareer(
    playerId: string,
    defaults?: Partial<Omit<PlayerCareerProfile, 'playerId' | 'createdAt' | 'updatedAt'>>
  ): PlayerCareerData {
    const cleanId = playerId.trim();
    if (!cleanId) {
      throw new Error('Valid persistent playerId is required.');
    }

    const existing = this.store.careers[cleanId];
    if (existing) {
      if (existing.profile.name === 'ক্রিকেটার') {
        existing.profile.name = 'Player';
        this.saveStore();
      }
      return existing;
    }

    const now = Date.now();
    const profile: PlayerCareerProfile = {
      playerId: cleanId,
      name:
        defaults?.name?.trim() && defaults.name.trim() !== 'ক্রিকেটার'
          ? defaults.name.trim()
          : 'Player',
      country: defaults?.country?.trim() || 'Bangladesh',
      jerseyNumber:
        typeof defaults?.jerseyNumber === 'number'
          ? Math.max(0, Math.min(99, Math.floor(defaults.jerseyNumber)))
          : 75,
      avatar: defaults?.avatar || '🏏',
      createdAt: now,
      updatedAt: now,
    };

    const lvl = computeLevelAndStage(0);
    const career: PlayerCareerData = {
      profile,
      xp: 0,
      level: lvl.level,
      stage: lvl.stage,
      stageBn: lvl.stageBn,
      currentLevelBaseXp: lvl.currentLevelBaseXp,
      nextLevelXp: lvl.nextLevelXp,
      overall: createEmptyStatBucket(),
      ai: createEmptyStatBucket(),
      multiplayer: createEmptyStatBucket(),
      unlockedAchievements: {},
      history: [],
      processedMatchIds: [],
    };

    this.store.careers[cleanId] = career;
    this.saveStore();
    return career;
  }

  public updateCareerProfile(
    playerId: string,
    updates: {
      name?: string;
      country?: string;
      jerseyNumber?: number;
      avatar?: string;
    }
  ): PlayerCareerData {
    const career = this.getOrCreateCareer(playerId, updates);
    if (updates.name && updates.name.trim()) {
      career.profile.name = updates.name.trim().slice(0, 28);
    }
    if (updates.country && updates.country.trim()) {
      career.profile.country = updates.country.trim().slice(0, 28);
    }
    if (typeof updates.jerseyNumber === 'number' && !Number.isNaN(updates.jerseyNumber)) {
      career.profile.jerseyNumber = Math.max(
        0,
        Math.min(99, Math.floor(updates.jerseyNumber))
      );
    }
    if (updates.avatar && updates.avatar.trim()) {
      career.profile.avatar = updates.avatar.trim().slice(0, 8);
    }
    career.profile.updatedAt = Date.now();
    this.saveStore();
    return career;
  }

  /**
   * Records a finalized match into a player's Career statistics idempotently.
   * Ensures AI matches only update `ai` + `overall`, and Multiplayer matches only update `multiplayer` + `overall`.
   * Never awards XP or stats twice for the same matchId.
   */
  public recordCompletedMatchForPlayer(
    match: HandCricketMatchState,
    playerId: string
  ): MatchCareerReward | null {
    if (match.phase !== 'MATCH_COMPLETE' || !match.result) {
      return null;
    }

    const participant = match.players.find((p) => p?.playerId === playerId);
    if (!participant || participant.isAI) {
      return null;
    }

    const career = this.getOrCreateCareer(playerId, {
      name: participant.name,
      country: participant.country,
      jerseyNumber: participant.jerseyNumber,
      avatar: participant.avatar,
    });

    // Idempotency guard: if this match was already processed for this player, do not double-count
    if (career.processedMatchIds.includes(match.matchId)) {
      const lvl = computeLevelAndStage(career.xp);
      return {
        matchId: match.matchId,
        xpEarned: 0,
        previousXp: career.xp,
        newXp: career.xp,
        previousLevel: career.level,
        newLevel: lvl.level,
        stage: lvl.stage,
        stageBn: lvl.stageBn,
        newlyUnlockedAchievements: [],
      };
    }

    career.processedMatchIds.push(match.matchId);

    const opponent = match.players.find((p) => p?.playerId !== playerId) || {
      playerId: 'opponent',
      name: 'Opponent',
      avatar: '🏏',
    };

    // Aggregate batting and bowling performance for this player across all innings of the match
    let playerRuns = 0;
    let playerBallsFaced = 0;
    let playerInningsBatted = 0;
    let playerNotOuts = 0;
    let playerFours = 0;
    let playerSixes = 0;
    let playerWicketsTaken = 0;
    let playerBallsBowled = 0;
    let playerRunsConceded = 0;
    let achievedHatTrickInMatch = false;
    let opponentRuns = 0;

    for (const inn of match.innings) {
      if (inn.balls === 0 && !inn.isCompleted) continue;

      if (inn.battingPlayerId === playerId) {
        playerInningsBatted += 1;
        playerRuns += inn.runs;
        playerBallsFaced += inn.balls;
        if (inn.wickets < inn.maxWickets) {
          playerNotOuts += 1;
        }
        for (const b of inn.ballHistory) {
          if (!b.isWicket && b.runsScored === 4) playerFours += 1;
          if (!b.isWicket && b.runsScored === 6) playerSixes += 1;
        }
      } else if (inn.bowlingPlayerId === playerId) {
        opponentRuns += inn.runs;
        playerWicketsTaken += inn.wickets;
        playerBallsBowled += inn.balls;
        playerRunsConceded += inn.runs;

        // Check for Hat-Trick (3 consecutive wickets bowled by this player in this innings)
        let consecutiveWickets = 0;
        for (const b of inn.ballHistory) {
          if (b.isWicket) {
            consecutiveWickets += 1;
            if (consecutiveWickets >= 3) {
              achievedHatTrickInMatch = true;
            }
          } else {
            consecutiveWickets = 0;
          }
        }
      }
    }

    const playerResult: 'WIN' | 'LOSS' | 'TIE' =
      match.result.outcome === 'TIE'
        ? 'TIE'
        : match.result.winnerPlayerId === playerId
        ? 'WIN'
        : 'LOSS';

    const applyToBucket = (bucket: CareerStatBucket) => {
      bucket.totalMatches += 1;
      if (playerResult === 'WIN') {
        bucket.wins += 1;
        bucket.consecutiveWins += 1;
        if (bucket.consecutiveWins > bucket.maxConsecutiveWins) {
          bucket.maxConsecutiveWins = bucket.consecutiveWins;
        }
        if (match.config.format === 'test_match') {
          bucket.testWins += 1;
        }
      } else if (playerResult === 'LOSS') {
        bucket.losses += 1;
        bucket.consecutiveWins = 0;
      } else {
        bucket.ties += 1;
        bucket.consecutiveWins = 0;
      }

      bucket.inningsBatted += playerInningsBatted;
      bucket.notOuts += playerNotOuts;
      bucket.totalRuns += playerRuns;
      bucket.ballsFaced += playerBallsFaced;
      if (playerRuns > bucket.highestScore) {
        bucket.highestScore = playerRuns;
      }
      if (playerRuns >= 100) {
        bucket.hundreds += 1;
      } else if (playerRuns >= 50) {
        bucket.fifties += 1;
      }
      bucket.fours += playerFours;
      bucket.sixes += playerSixes;

      bucket.totalWickets += playerWicketsTaken;
      bucket.ballsBowled += playerBallsBowled;
      bucket.runsConceded += playerRunsConceded;
      if (achievedHatTrickInMatch) {
        bucket.hatTricks += 1;
      }

      // Best bowling performance update
      if (
        playerWicketsTaken > bucket.bestBowlingWickets ||
        (playerWicketsTaken === bucket.bestBowlingWickets &&
          playerWicketsTaken > 0 &&
          playerRunsConceded < bucket.bestBowlingRuns)
      ) {
        bucket.bestBowlingWickets = playerWicketsTaken;
        bucket.bestBowlingRuns = playerRunsConceded;
      }

      const dismissals = Math.max(1, bucket.inningsBatted - bucket.notOuts);
      bucket.battingAverage = Number((bucket.totalRuns / dismissals).toFixed(2));
      bucket.strikeRate =
        bucket.ballsFaced > 0
          ? Number(((bucket.totalRuns / bucket.ballsFaced) * 100).toFixed(1))
          : 0;
      bucket.winRate =
        bucket.totalMatches > 0
          ? Number(((bucket.wins / bucket.totalMatches) * 100).toFixed(1))
          : 0;
    };

    // Update overall bucket AND strictly the mode-specific bucket (AI vs Multiplayer)
    applyToBucket(career.overall);
    if (match.config.mode === 'ai_single_player') {
      applyToBucket(career.ai);
    } else {
      applyToBucket(career.multiplayer);
    }

    // Calculate base XP earned from verified match performance
    let xpEarned = 40; // Match completion base XP
    if (playerResult === 'WIN') xpEarned += 80;
    if (playerResult === 'TIE') xpEarned += 45;
    xpEarned += playerRuns * 2;
    xpEarned += playerWicketsTaken * 15;
    if (match.config.format === 'test_match') {
      xpEarned += 50; // Test match endurance bonus
    }
    if (match.config.mode === 'multiplayer_room') {
      xpEarned += 35; // Verified real-player competitive bonus
    }

    // Evaluate achievements from verified career metrics
    const newlyUnlocked: CareerAchievementDefinition[] = [];
    const now = Date.now();
    const unlockIfEligible = (id: string, condition: boolean) => {
      if (condition && !career.unlockedAchievements[id]) {
        career.unlockedAchievements[id] = now;
        const def = CAREER_ACHIEVEMENTS.find((a) => a.id === id);
        if (def) {
          newlyUnlocked.push(def);
          xpEarned += def.xpReward;
        }
      }
    };

    unlockIfEligible('first_match', career.overall.totalMatches >= 1);
    unlockIfEligible('first_win', career.overall.wins >= 1);
    unlockIfEligible('half_century', playerRuns >= 50);
    unlockIfEligible('runs_100', career.overall.totalRuns >= 100);
    unlockIfEligible('runs_500', career.overall.totalRuns >= 500);
    unlockIfEligible('runs_1000', career.overall.totalRuns >= 1000);
    unlockIfEligible('hat_trick', career.overall.hatTricks >= 1);
    unlockIfEligible('wins_10', career.overall.wins >= 10);
    unlockIfEligible('matches_50', career.overall.totalMatches >= 50);
    unlockIfEligible('test_winner', career.overall.testWins >= 1);

    const previousXp = career.xp;
    const previousLevel = career.level;
    career.xp += xpEarned;

    const newLvl = computeLevelAndStage(career.xp);
    career.level = newLvl.level;
    career.stage = newLvl.stage;
    career.stageBn = newLvl.stageBn;
    career.currentLevelBaseXp = newLvl.currentLevelBaseXp;
    career.nextLevelXp = newLvl.nextLevelXp;

    // Record match history summary
    const inningsSummaries: CareerInningsSummary[] = match.innings.map((inn) => {
      const batter = match.players.find((p) => p?.playerId === inn.battingPlayerId);
      return {
        inningsNumber: inn.inningsNumber,
        battingPlayerId: inn.battingPlayerId,
        battingPlayerName: batter?.name || 'Player',
        runs: inn.runs,
        wickets: inn.wickets,
        balls: inn.balls,
        overDisplay: HandCricketEngine.formatOvers(inn.balls),
        target: inn.target,
      };
    });

    const historyItem: CareerMatchHistoryItem = {
      matchId: match.matchId,
      date: match.completedAt || now,
      mode: match.config.mode,
      format: match.config.format,
      oversConfig: match.config.overs,
      wicketsConfig: match.config.wicketsPerInnings,
      opponentId: opponent.playerId,
      opponentName: opponent.name,
      opponentAvatar: opponent.avatar,
      playerResult,
      marginTextBn: match.result.marginTextBn,
      marginTextEn: match.result.marginTextEn,
      playerTotalRuns: playerRuns,
      playerBallsFaced,
      playerWicketsTaken,
      opponentTotalRuns: opponentRuns,
      inningsSummaries,
      xpEarned,
      achievementsUnlocked: newlyUnlocked.map((a) => a.id),
    };

    career.history.unshift(historyItem);
    if (career.history.length > 100) {
      career.history = career.history.slice(0, 100);
    }

    this.saveStore();

    return {
      matchId: match.matchId,
      xpEarned,
      previousXp,
      newXp: career.xp,
      previousLevel,
      newLevel: career.level,
      stage: career.stage,
      stageBn: career.stageBn,
      newlyUnlockedAchievements: newlyUnlocked,
    };
  }

  /**
   * Returns Multiplayer Leaderboard strictly filtered to real-player multiplayer matches.
   * AI matches never contribute to multiplayer rankings.
   * Win Rate ranking enforces a minimum of 3 multiplayer matches to prevent 1-match 100% skew.
   */
  public getMultiplayerLeaderboard(
    sortBy: LeaderboardSortBy = 'wins',
    minMatchesForWinRate = 3
  ): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = [];

    for (const career of Object.values(this.store.careers)) {
      const mp = career.multiplayer;
      // Only include players who have played at least 1 real multiplayer match
      if (mp.totalMatches < 1) continue;

      entries.push({
        rank: 0,
        playerId: career.profile.playerId,
        name: career.profile.name,
        country: career.profile.country,
        jerseyNumber: career.profile.jerseyNumber,
        avatar: career.profile.avatar,
        level: career.level,
        stage: career.stage,
        xp: career.xp,
        multiplayerMatches: mp.totalMatches,
        multiplayerWins: mp.wins,
        multiplayerRuns: mp.totalRuns,
        multiplayerWickets: mp.totalWickets,
        multiplayerWinRate: mp.winRate,
        highestScore: mp.highestScore,
      });
    }

    entries.sort((a, b) => {
      if (sortBy === 'runs') {
        return b.multiplayerRuns - a.multiplayerRuns || b.multiplayerWins - a.multiplayerWins;
      }
      if (sortBy === 'winRate') {
        const aEligible = a.multiplayerMatches >= minMatchesForWinRate ? 1 : 0;
        const bEligible = b.multiplayerMatches >= minMatchesForWinRate ? 1 : 0;
        if (aEligible !== bEligible) return bEligible - aEligible;
        return (
          b.multiplayerWinRate - a.multiplayerWinRate ||
          b.multiplayerWins - a.multiplayerWins
        );
      }
      if (sortBy === 'xp') {
        return b.xp - a.xp || b.multiplayerWins - a.multiplayerWins;
      }
      if (sortBy === 'level') {
        return b.level - a.level || b.xp - a.xp;
      }
      // default 'wins'
      return (
        b.multiplayerWins - a.multiplayerWins ||
        b.multiplayerRuns - a.multiplayerRuns
      );
    });

    return entries.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }

  // --- ROOM & MATCH LIFECYCLE ---

  public createMatchOrRoom(params: {
    playerId: string;
    name?: string;
    country?: string;
    jerseyNumber?: number;
    avatar?: string;
    mode: MatchMode;
    format: MatchFormat;
    overs?: number | null;
    wicketsPerInnings?: number;
    aiDifficulty?: AIDifficulty;
  }): {
    roomId: string;
    roomCode: string;
    playerId: string;
    state: HandCricketClientState;
  } {
    const career = this.getOrCreateCareer(params.playerId, {
      name: params.name,
      country: params.country,
      jerseyNumber: params.jerseyNumber,
      avatar: params.avatar,
    });

    if (params.name || params.country || params.jerseyNumber !== undefined || params.avatar) {
      this.updateCareerProfile(params.playerId, {
        name: params.name,
        country: params.country,
        jerseyNumber: params.jerseyNumber,
        avatar: params.avatar,
      });
    }

    const config = HandCricketEngine.createMatchConfiguration({
      mode: params.mode,
      format: params.format,
      overs: params.overs,
      wicketsPerInnings: params.wicketsPerInnings,
      aiDifficulty: params.aiDifficulty || 'easy',
    });

    const now = Date.now();
    const roomId = `hc_room_${now}_${crypto.randomBytes(3).toString('hex')}`;
    const matchId = `hc_match_${now}_${crypto.randomBytes(3).toString('hex')}`;
    let roomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    while (this.codeToRoomId.has(roomCode)) {
      roomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    }

    const hostParticipant: MatchParticipant = {
      playerId: career.profile.playerId,
      name: career.profile.name,
      country: career.profile.country,
      jerseyNumber: career.profile.jerseyNumber,
      avatar: career.profile.avatar,
      isAI: false,
      isReady: true,
      isOnline: true,
      seatIndex: 0,
    };

    const players: [MatchParticipant] | [MatchParticipant, MatchParticipant] = [
      hostParticipant,
    ];

    let initialPhase: HandCricketMatchState['phase'] = 'LOBBY';
    let startedAt: number | undefined;

    if (params.mode === 'ai_single_player') {
      const diff = params.aiDifficulty || 'easy';
      const botNames: Record<AIDifficulty, string> = {
        easy: 'Rocky',
        medium: 'Alex',
        hard: 'Jordan',
      };
      const aiParticipant: MatchParticipant = {
        playerId: `ai_bot_${diff}`,
        name: botNames[diff],
        country: 'Bangladesh',
        jerseyNumber: diff === 'hard' ? 1 : diff === 'medium' ? 7 : 99,
        avatar: diff === 'hard' ? '🔥' : diff === 'medium' ? '⚡' : '🏏',
        isAI: true,
        aiDifficulty: diff,
        isReady: true,
        isOnline: true,
        seatIndex: 1,
      };
      players.push(aiParticipant);
      initialPhase = 'TOSS_CALL';
      startedAt = now;

      // Record verified match start in Global KhelGhor Game Stats (1 AI match = 1 play, 1 human unique player)
      gameStatsManager.recordMatchStart('handcricket', matchId, [
        career.profile.playerId,
      ]);
    }

    const matchState: HandCricketMatchState = {
      matchId,
      roomId,
      roomCode,
      hostId: career.profile.playerId,
      config,
      phase: initialPhase,
      players,
      toss: {
        callerId: career.profile.playerId,
      },
      currentInningsIndex: 0,
      innings: [],
      currentBallNumber: 1,
      currentBallId: `${matchId}_inn1_b1`,
      pendingSubmissions: {},
      rematchVotes: [],
      createdAt: now,
      startedAt,
    };

    const room: ActiveCricketRoom = {
      state: matchState,
      careerRewards: {},
      subscribers: new Map(),
      lastHeartbeat: { [career.profile.playerId]: now },
    };

    this.rooms.set(roomId, room);
    this.codeToRoomId.set(roomCode, roomId);

    return {
      roomId,
      roomCode,
      playerId: career.profile.playerId,
      state: this.getClientState(roomId, career.profile.playerId)!,
    };
  }

  public getRoom(roomIdOrCode: string): ActiveCricketRoom | undefined {
    const clean = roomIdOrCode.trim();
    const mappedId = this.codeToRoomId.get(clean.toUpperCase()) || clean;
    return this.rooms.get(mappedId);
  }

  /**
   * Joins an existing multiplayer room or reconnects safely if the player is already in the room.
   * Joining a waiting room does NOT increment global totalPlays.
   */
  public joinRoom(
    roomIdOrCode: string,
    params: {
      playerId: string;
      name?: string;
      country?: string;
      jerseyNumber?: number;
      avatar?: string;
    }
  ): {
    success: boolean;
    roomId?: string;
    playerId?: string;
    reconnected?: boolean;
    state?: HandCricketClientState;
    error?: string;
  } {
    const room = this.getRoom(roomIdOrCode);
    if (!room) {
      return {
        success: false,
        error: 'Invalid room code or room not found.',
      };
    }

    const career = this.getOrCreateCareer(params.playerId, {
      name: params.name,
      country: params.country,
      jerseyNumber: params.jerseyNumber,
      avatar: params.avatar,
    });

    if (params.name && params.name.trim()) {
      this.updateCareerProfile(params.playerId, { name: params.name });
    }

    // Check if this player is already a participant (Safe Reconnection)
    const existingParticipant = room.state.players.find(
      (p) => p?.playerId === career.profile.playerId
    );
    if (existingParticipant) {
      existingParticipant.isOnline = true;
      room.lastHeartbeat[career.profile.playerId] = Date.now();
      this.broadcastRoomState(room);
      return {
        success: true,
        roomId: room.state.roomId,
        playerId: career.profile.playerId,
        reconnected: true,
        state: this.getClientState(room.state.roomId, career.profile.playerId),
      };
    }

    if (room.state.phase !== 'LOBBY') {
      return {
        success: false,
        error: 'Match has already started in this room.',
      };
    }

    if (room.state.players.length >= 2) {
      return {
        success: false,
        error: 'Room is full (maximum 2 players).',
      };
    }

    const guestParticipant: MatchParticipant = {
      playerId: career.profile.playerId,
      name: career.profile.name,
      country: career.profile.country,
      jerseyNumber: career.profile.jerseyNumber,
      avatar: career.profile.avatar,
      isAI: false,
      isReady: true,
      isOnline: true,
      seatIndex: 1,
    };

    (room.state.players as MatchParticipant[]).push(guestParticipant);
    room.lastHeartbeat[career.profile.playerId] = Date.now();
    this.broadcastRoomState(room);

    return {
      success: true,
      roomId: room.state.roomId,
      playerId: career.profile.playerId,
      reconnected: false,
      state: this.getClientState(room.state.roomId, career.profile.playerId),
    };
  }

  public toggleReady(
    roomId: string,
    playerId: string
  ): { success: boolean; state?: HandCricketClientState; error?: string } {
    const room = this.getRoom(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.state.phase !== 'LOBBY') {
      return { success: false, error: 'Match already started' };
    }

    const p = room.state.players.find((pl) => pl?.playerId === playerId);
    if (!p) return { success: false, error: 'Player not in room' };

    p.isReady = !p.isReady;
    this.broadcastRoomState(room);
    return {
      success: true,
      state: this.getClientState(room.state.roomId, playerId),
    };
  }

  public updateLobbyConfig(
    roomId: string,
    requesterId: string,
    newConfig: {
      format: MatchFormat;
      overs?: number | null;
      wicketsPerInnings?: number;
    }
  ): { success: boolean; state?: HandCricketClientState; error?: string } {
    const room = this.getRoom(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.state.hostId !== requesterId) {
      return { success: false, error: 'Only host can change match settings' };
    }
    if (room.state.phase !== 'LOBBY') {
      return { success: false, error: 'Cannot change config after match start' };
    }

    room.state.config = HandCricketEngine.createMatchConfiguration({
      mode: room.state.config.mode,
      format: newConfig.format,
      overs: newConfig.overs,
      wicketsPerInnings: newConfig.wicketsPerInnings,
    });

    this.broadcastRoomState(room);
    return {
      success: true,
      state: this.getClientState(room.state.roomId, requesterId),
    };
  }

  /**
   * Starts a Multiplayer Match from the Waiting Room.
   * Increments Global KhelGhor Game Stats Total Plays by 1 and adds both human players to Unique Players.
   */
  public startMultiplayerMatch(
    roomId: string,
    requesterId: string
  ): { success: boolean; state?: HandCricketClientState; error?: string } {
    const room = this.getRoom(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.state.hostId !== requesterId) {
      return { success: false, error: 'Only the room host can start the match.' };
    }
    if (room.state.phase !== 'LOBBY') {
      return { success: false, error: 'Match has already started.' };
    }
    if (room.state.players.length < 2) {
      return {
        success: false,
        error: '2 players are required to start the match.',
      };
    }
    const allReady = room.state.players.every((p) => p?.isReady);
    if (!allReady) {
      return {
        success: false,
        error: 'Both players must be ready.',
      };
    }

    room.state.phase = 'TOSS_CALL';
    room.state.startedAt = Date.now();
    room.state.toss = {
      callerId: room.state.hostId,
    };

    // Record verified match start in Global KhelGhor Game Statistics (1 multiplayer match = 1 Total Play, both real players counted)
    const realPlayerIds = room.state.players
      .filter((p) => p && !p.isAI)
      .map((p) => p!.playerId);
    gameStatsManager.recordMatchStart(
      'handcricket',
      room.state.matchId,
      realPlayerIds
    );

    this.broadcastRoomState(room);
    return {
      success: true,
      state: this.getClientState(room.state.roomId, requesterId),
    };
  }

  /**
   * Server-authoritative coin toss flip.
   */
  public performTossCall(
    roomId: string,
    playerId: string,
    call: TossCall,
    forcedCoinResult?: TossCall
  ): { success: boolean; state?: HandCricketClientState; error?: string } {
    const room = this.getRoom(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.state.phase !== 'TOSS_CALL') {
      return { success: false, error: 'Toss has already been called' };
    }
    if (room.state.toss.callerId !== playerId) {
      return { success: false, error: 'Only the designated caller can call the toss' };
    }
    if (call !== 'HEADS' && call !== 'TAILS') {
      return { success: false, error: 'Invalid toss call' };
    }

    const p0 = room.state.players[0]!;
    const p1 = room.state.players[1]!;
    const opponentId = p0.playerId === playerId ? p1.playerId : p0.playerId;

    const coinResult: TossCall =
      forcedCoinResult ?? (crypto.randomInt(0, 2) === 0 ? 'HEADS' : 'TAILS');

    room.state.toss = HandCricketEngine.resolveTossCall(
      playerId,
      opponentId,
      call,
      coinResult
    );
    room.state.phase = 'TOSS_DECISION';

    // If AI won the toss, AI selects its decision immediately and schedules automatic server transition
    // after 2.2s so the human sees the coin flip, winner, and AI choice, and never gets stuck.
    const winnerParticipant = room.state.players.find(
      (p) => p?.playerId === room.state.toss.winnerId
    );
    if (winnerParticipant?.isAI) {
      const aiDecision = HandCricketAI.chooseTossDecision(
        winnerParticipant.aiDifficulty || 'medium'
      );
      room.state.toss.decision = aiDecision;
      room.tossAutoConfirmAt = Date.now() + 2200;
    }

    this.broadcastRoomState(room);

    return {
      success: true,
      state: this.getClientState(room.state.roomId, playerId),
    };
  }

  /**
   * Pre-locks the AI opponent's independent secret move at the start of BALL_SELECTION
   * so the human player immediately sees that the AI Captain has selected and locked its move.
   */
  private lockAIMoveIfNeeded(room: ActiveCricketRoom): void {
    const match = room.state;
    if (match.phase !== 'BALL_SELECTION') return;
    const currentInnings = match.innings[match.currentInningsIndex];
    if (!currentInnings || currentInnings.isCompleted) return;

    const aiPlayer = match.players.find((p) => p?.isAI);
    if (!aiPlayer) return;

    if (!match.pendingSubmissions[aiPlayer.playerId]) {
      const aiRole =
        currentInnings.battingPlayerId === aiPlayer.playerId
          ? 'BATTER'
          : 'BOWLER';
      const aiMove = HandCricketAI.selectMove({
        aiPlayerId: aiPlayer.playerId,
        role: aiRole,
        difficulty: aiPlayer.aiDifficulty || 'medium',
        currentInnings,
        allInnings: match.innings,
      });

      match.pendingSubmissions[aiPlayer.playerId] = {
        number: aiMove.number,
        gestureId: aiMove.gestureId,
        submittedAt: Date.now(),
        timedOut: false,
      };
    }
  }

  /**
   * Confirms the toss winner's choice (BAT_FIRST or BOWL_FIRST) and starts Innings 1.
   * Prevents either player from changing the result after confirmation.
   */
  public confirmTossDecision(
    roomId: string,
    playerId: string,
    decision?: TossDecision
  ): { success: boolean; state?: HandCricketClientState; error?: string } {
    const room = this.getRoom(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.state.phase !== 'TOSS_DECISION') {
      return {
        success: false,
        error: 'Toss decision is already locked or not in toss decision phase.',
      };
    }

    const winnerParticipant = room.state.players.find(
      (p) => p?.playerId === room.state.toss.winnerId
    );
    const isAiWinnerAcknowledgedByHost =
      Boolean(winnerParticipant?.isAI) && room.state.hostId === playerId;

    if (room.state.toss.winnerId !== playerId && !isAiWinnerAcknowledgedByHost) {
      return {
        success: false,
        error: 'Only the toss winner can choose to bat or bowl.',
      };
    }

    const effectiveDecision: TossDecision = winnerParticipant?.isAI
      ? room.state.toss.decision ||
        HandCricketAI.chooseTossDecision(
          winnerParticipant.aiDifficulty || 'medium'
        )
      : (decision as TossDecision);

    if (effectiveDecision !== 'BAT_FIRST' && effectiveDecision !== 'BOWL_FIRST') {
      return { success: false, error: 'Invalid toss decision' };
    }

    room.tossAutoConfirmAt = undefined;

    const p0 = room.state.players[0]!;
    const p1 = room.state.players[1]!;

    const { toss, innings } = HandCricketEngine.applyTossDecision(
      room.state.toss,
      [p0.playerId, p1.playerId],
      effectiveDecision,
      room.state.config
    );

    room.state.toss = toss;
    room.state.innings = innings;
    room.state.currentInningsIndex = 0;
    room.state.currentBallNumber = 1;
    room.state.currentBallId = `${room.state.matchId}_inn1_b1`;
    room.state.pendingSubmissions = {};
    room.state.phase = 'BALL_SELECTION';
    // Only enforce countdown deadline in live Multiplayer Room mode; in AI Single Player mode, wait for the human player.
    room.state.ballDeadline =
      room.state.config.mode === 'multiplayer_room'
        ? Date.now() + room.state.config.ballTimerSeconds * 1000
        : undefined;

    // Immediately lock AI Captain's move for Ball 1 so AI is ready as soon as the match screen opens
    this.lockAIMoveIfNeeded(room);

    this.broadcastRoomState(room);
    return {
      success: true,
      state: this.getClientState(room.state.roomId, playerId),
    };
  }

  /**
   * Submits a player's number/gesture choice for the active ball.
   * Locks the selection immediately and hides it from the opponent until both have submitted.
   */
  public submitBallChoice(
    roomId: string,
    playerId: string,
    choice: {
      number?: HandNumber;
      gestureId?: GestureVariationId;
      ballId?: string;
    }
  ): { success: boolean; state?: HandCricketClientState; error?: string } {
    const room = this.getRoom(roomId);
    if (!room) return { success: false, error: 'Room not found' };

    // If the player clicks the next number right after a ball reveal (before the server timer auto-advanced),
    // seamlessly advance to the next ball's BALL_SELECTION phase if the innings is still ongoing.
    const activeInnings =
      room.state.innings[room.state.currentInningsIndex];
    let autoAdvancedFromReveal = false;
    if (
      room.state.phase === 'BALL_REVEAL' &&
      activeInnings &&
      !activeInnings.isCompleted
    ) {
      this.advanceAfterRevealOrBreak(room.state.roomId);
      autoAdvancedFromReveal = true;
    }

    if (room.state.phase !== 'BALL_SELECTION') {
      return {
        success: false,
        error: 'Ball selection is not active right now.',
      };
    }

    // Validate participant ownership (never allow submitting for opponent)
    const participant = room.state.players.find((p) => p?.playerId === playerId);
    if (!participant) {
      return { success: false, error: 'Unauthorized player' };
    }

    // Validate ballId if provided to prevent duplicate or stale ball submissions (unless we just auto-advanced from BALL_REVEAL)
    if (
      !autoAdvancedFromReveal &&
      choice.ballId &&
      choice.ballId !== room.state.currentBallId
    ) {
      return {
        success: false,
        error: 'This delivery has already been completed.',
      };
    }

    // Prevent multiple submissions for the same ball by the same player
    if (room.state.pendingSubmissions[playerId]) {
      return {
        success: false,
        error: 'You have already locked your choice for this ball.',
      };
    }

    let number: HandNumber;
    let gestureId: GestureVariationId;

    if (choice.gestureId !== undefined && choice.gestureId !== null) {
      const parsed = parseHandSelection(choice.gestureId, choice.number);
      if (!parsed.isValid) {
        return {
          success: false,
          error:
            choice.number !== undefined
              ? 'Gesture variation does not match selected number.'
              : 'Invalid gesture selection.',
        };
      }
      number = parsed.number;
      gestureId = parsed.selectionId;
    } else if (choice.number !== undefined && choice.number !== null) {
      const parsed = parseHandSelection(choice.number);
      if (!parsed.isValid) {
        return {
          success: false,
          error: 'Invalid number selection (must be between 1 and 6).',
        };
      }
      number = parsed.number;
      gestureId = parsed.selectionId;
    } else {
      return { success: false, error: 'Must provide number or gestureId' };
    }

    room.state.pendingSubmissions[playerId] = {
      number,
      gestureId,
      submittedAt: Date.now(),
      timedOut: false,
    };

    // If playing against AI, generate AI's independent selection now
    const opponent = room.state.players.find((p) => p?.playerId !== playerId);
    if (opponent?.isAI && !room.state.pendingSubmissions[opponent.playerId]) {
      const currentInnings = room.state.innings[room.state.currentInningsIndex];
      const aiRole =
        currentInnings.battingPlayerId === opponent.playerId ? 'BATTER' : 'BOWLER';
      const aiMove = HandCricketAI.selectMove({
        aiPlayerId: opponent.playerId,
        role: aiRole,
        difficulty: opponent.aiDifficulty || 'medium',
        currentInnings,
        allInnings: room.state.innings,
      });

      room.state.pendingSubmissions[opponent.playerId] = {
        number: aiMove.number,
        gestureId: aiMove.gestureId,
        submittedAt: Date.now(),
        timedOut: false,
      };
    }

    // Check if both players have locked their selections
    const p0Id = room.state.players[0]?.playerId;
    const p1Id = room.state.players[1]?.playerId;

    if (
      p0Id &&
      p1Id &&
      room.state.pendingSubmissions[p0Id] &&
      room.state.pendingSubmissions[p1Id]
    ) {
      this.resolveCurrentBall(room);
    } else {
      this.broadcastRoomState(room);
    }

    return {
      success: true,
      state: this.getClientState(room.state.roomId, playerId),
    };
  }

  /**
   * Forces timeout resolution for any player who has not submitted before the timer expires.
   * Uses Node's crypto.randomInt(1, 7) to generate an unbiased server-side number 1-6.
   * Never automatically declares the timed-out player OUT.
   */
  public resolveBallTimeout(roomId: string): {
    success: boolean;
    ballResolved: boolean;
  } {
    const room = this.getRoom(roomId);
    if (!room || room.state.phase !== 'BALL_SELECTION') {
      return { success: false, ballResolved: false };
    }

    const now = Date.now();
    for (const p of room.state.players) {
      if (!p) continue;
      if (!room.state.pendingSubmissions[p.playerId]) {
        if (p.isAI) {
          const currentInnings =
            room.state.innings[room.state.currentInningsIndex];
          const aiRole =
            currentInnings.battingPlayerId === p.playerId ? 'BATTER' : 'BOWLER';
          const aiMove = HandCricketAI.selectMove({
            aiPlayerId: p.playerId,
            role: aiRole,
            difficulty: p.aiDifficulty || 'medium',
            currentInnings,
            allInnings: room.state.innings,
          });
          room.state.pendingSubmissions[p.playerId] = {
            number: aiMove.number,
            gestureId: aiMove.gestureId,
            submittedAt: now,
            timedOut: false,
          };
        } else {
          // Unbiased server-side random number 1..6 and valid A/B/C variation
          const randomNum = crypto.randomInt(1, 7) as HandNumber;
          room.state.pendingSubmissions[p.playerId] = {
            number: randomNum,
            gestureId: getRandomGestureForNumber(randomNum),
            submittedAt: now,
            timedOut: true,
          };
        }
      }
    }

    this.resolveCurrentBall(room);
    return { success: true, ballResolved: true };
  }

  private resolveCurrentBall(room: ActiveCricketRoom): void {
    const match = room.state;
    if (match.phase !== 'BALL_SELECTION') return;

    const currentInnings = match.innings[match.currentInningsIndex];
    if (!currentInnings) return;

    const batterSub = match.pendingSubmissions[currentInnings.battingPlayerId];
    const bowlerSub = match.pendingSubmissions[currentInnings.bowlingPlayerId];
    if (!batterSub || !bowlerSub) return;

    const { inningsCompleted, matchCompleted } =
      HandCricketEngine.processBallOnMatch(match, {
        ballId: match.currentBallId,
        batterChoice: batterSub.gestureId,
        bowlerChoice: bowlerSub.gestureId,
        batterTimedOut: batterSub.timedOut,
        bowlerTimedOut: bowlerSub.timedOut,
      });

    match.ballDeadline = undefined;

    if (matchCompleted) {
      match.phase = 'MATCH_COMPLETE';
      // Process Career rewards idempotently for all real human players in the match
      for (const p of match.players) {
        if (p && !p.isAI) {
          const reward = this.recordCompletedMatchForPlayer(match, p.playerId);
          if (reward) {
            room.careerRewards[p.playerId] = reward;
          }
        }
      }
      this.broadcastRoomState(room);
      return;
    }

    // Enter simultaneous reveal phase so both players see the 3-pump hand shake + gesture reveal
    match.phase = 'BALL_REVEAL';
    const revealDurationMs = inningsCompleted ? 2600 : 2100;
    room.revealAdvanceAt = Date.now() + revealDurationMs;
    this.broadcastRoomState(room);
  }

  /**
   * Advances from BALL_REVEAL or INNINGS_BREAK to the next ball or innings.
   */
  public advanceAfterRevealOrBreak(
    roomId: string,
    requesterId?: string
  ): { success: boolean; state?: HandCricketClientState } {
    const room = this.getRoom(roomId);
    if (!room) return { success: false };

    const match = room.state;
    const currentInnings = match.innings[match.currentInningsIndex];
    if (!currentInnings) return { success: false };

    if (match.phase === 'BALL_REVEAL') {
      room.revealAdvanceAt = undefined;
      if (currentInnings.isCompleted) {
        match.phase = 'INNINGS_BREAK';
        match.pendingSubmissions = {};
      } else {
        match.pendingSubmissions = {};
        match.currentBallNumber += 1;
        match.currentBallId = `${match.matchId}_inn${currentInnings.inningsNumber}_b${
          currentInnings.balls + 1
        }`;
        match.phase = 'BALL_SELECTION';
        match.ballDeadline =
          match.config.mode === 'multiplayer_room'
            ? Date.now() + match.config.ballTimerSeconds * 1000
            : undefined;
        this.lockAIMoveIfNeeded(room);
      }
      this.broadcastRoomState(room);
    } else if (match.phase === 'INNINGS_BREAK') {
      HandCricketEngine.advanceToNextInnings(match);
      match.ballDeadline =
        match.config.mode === 'multiplayer_room'
          ? Date.now() + match.config.ballTimerSeconds * 1000
          : undefined;
      this.lockAIMoveIfNeeded(room);
      this.broadcastRoomState(room);
    }

    return {
      success: true,
      state: requesterId
        ? this.getClientState(room.state.roomId, requesterId)
        : undefined,
    };
  }

  /**
   * Handles rematch voting and resets room for a fresh match when ready.
   */
  public voteRematch(
    roomId: string,
    playerId: string
  ): { success: boolean; state?: HandCricketClientState; error?: string } {
    const room = this.getRoom(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.state.phase !== 'MATCH_COMPLETE') {
      return { success: false, error: 'Match is not complete yet' };
    }

    const participant = room.state.players.find((p) => p?.playerId === playerId);
    if (!participant) return { success: false, error: 'Not in room' };

    if (!room.state.rematchVotes.includes(playerId)) {
      room.state.rematchVotes.push(playerId);
    }

    // If opponent is AI, AI automatically agrees to rematch
    const opponent = room.state.players.find((p) => p?.playerId !== playerId);
    if (opponent?.isAI && !room.state.rematchVotes.includes(opponent.playerId)) {
      room.state.rematchVotes.push(opponent.playerId);
    }

    if (room.state.rematchVotes.length >= 2) {
      const now = Date.now();
      const newMatchId = `hc_match_${now}_${crypto.randomBytes(3).toString('hex')}`;
      room.state.matchId = newMatchId;
      room.state.phase = 'TOSS_CALL';
      room.state.toss = {
        callerId: room.state.hostId,
      };
      room.state.currentInningsIndex = 0;
      room.state.innings = [];
      room.state.currentBallNumber = 1;
      room.state.currentBallId = `${newMatchId}_inn1_b1`;
      room.state.pendingSubmissions = {};
      room.state.lastBallEvent = undefined;
      room.state.result = undefined;
      room.state.rematchVotes = [];
      room.state.startedAt = now;
      room.state.completedAt = undefined;
      room.careerRewards = {};
      room.tossAutoConfirmAt = undefined;
      room.revealAdvanceAt = undefined;

      const realPlayerIds = room.state.players
        .filter((p) => p && !p.isAI)
        .map((p) => p!.playerId);
      gameStatsManager.recordMatchStart(
        'handcricket',
        newMatchId,
        realPlayerIds
      );
    }

    this.broadcastRoomState(room);
    return {
      success: true,
      state: this.getClientState(room.state.roomId, playerId),
    };
  }

  public leaveRoom(
    roomId: string,
    playerId: string
  ): { success: boolean } {
    const room = this.getRoom(roomId);
    if (!room) return { success: false };

    const p = room.state.players.find((pl) => pl?.playerId === playerId);
    if (p) {
      p.isOnline = false;
    }
    delete room.lastHeartbeat[playerId];
    this.broadcastRoomState(room);
    return { success: true };
  }

  private processServerTick(): void {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      const match = room.state;
      // 0. Check automatic AI toss decision confirmation so TOSS_DECISION never hangs when AI wins toss
      if (
        match.phase === 'TOSS_DECISION' &&
        room.tossAutoConfirmAt &&
        now >= room.tossAutoConfirmAt
      ) {
        room.tossAutoConfirmAt = undefined;
        const winner = match.players.find(
          (p) => p?.playerId === match.toss.winnerId
        );
        if (winner?.isAI) {
          this.confirmTossDecision(
            match.roomId,
            winner.playerId,
            match.toss.decision || 'BAT_FIRST'
          );
        }
      }
      // 1. Check ball selection countdown timeout (ONLY in live multiplayer_room; never auto-play human in AI mode)
      else if (
        match.config.mode === 'multiplayer_room' &&
        match.phase === 'BALL_SELECTION' &&
        match.ballDeadline &&
        now >= match.ballDeadline
      ) {
        this.resolveBallTimeout(match.roomId);
      }
      // 2. Check automatic transition from BALL_REVEAL to next ball or INNINGS_BREAK
      else if (
        match.phase === 'BALL_REVEAL' &&
        room.revealAdvanceAt &&
        now >= room.revealAdvanceAt
      ) {
        this.advanceAfterRevealOrBreak(match.roomId);
      }
    }
  }

  /**
   * Builds a sanitized client view for `playerId`.
   * CRITICAL ANTI-CHEAT: Never exposes opponent's pending selection while in BALL_SELECTION.
   */
  public getClientState(
    roomIdOrCode: string,
    playerId: string
  ): HandCricketClientState | undefined {
    const room = this.getRoom(roomIdOrCode);
    if (!room) return undefined;

    const match = room.state;
    const mySubmission = match.pendingSubmissions[playerId];
    const opponent = match.players.find((p) => p && p.playerId !== playerId);
    const opponentLocked = Boolean(
      opponent && match.pendingSubmissions[opponent.playerId]
    );

    return {
      matchId: match.matchId,
      roomId: match.roomId,
      roomCode: match.roomCode,
      hostId: match.hostId,
      myPlayerId: playerId,
      config: match.config,
      phase: match.phase,
      players: match.players.filter(Boolean) as MatchParticipant[],
      toss: match.toss,
      currentInningsIndex: match.currentInningsIndex,
      innings: match.innings,
      currentBallId: match.currentBallId,
      ballDeadline: match.ballDeadline,
      mySubmittedSelection: mySubmission
        ? {
            number: mySubmission.number,
            gestureId: mySubmission.gestureId,
            timedOut: mySubmission.timedOut,
          }
        : undefined,
      opponentLocked,
      lastBallEvent: match.lastBallEvent,
      result: match.result,
      rematchVotes: match.rematchVotes,
      careerReward: room.careerRewards[playerId],
      createdAt: match.createdAt,
      startedAt: match.startedAt,
      completedAt: match.completedAt,
    };
  }

  public setPlayerOnline(
    roomId: string,
    playerId: string,
    isOnline: boolean
  ): void {
    const room = this.getRoom(roomId);
    if (!room) return;
    const p = room.state.players.find((pl) => pl?.playerId === playerId);
    if (p) {
      p.isOnline = isOnline;
      if (isOnline) {
        room.lastHeartbeat[playerId] = Date.now();
      }
      this.broadcastRoomState(room);
    }
  }

  public getLiveActiveHumanPlayersCount(): number {
    const now = Date.now();
    const activeIds = new Set<string>();
    for (const room of this.rooms.values()) {
      for (const p of room.state.players) {
        if (p && !p.isAI && p.isOnline) {
          const hb = room.lastHeartbeat[p.playerId] || 0;
          if (now - hb < 60000) {
            activeIds.add(p.playerId);
          }
        }
      }
    }
    return activeIds.size;
  }

  public subscribe(
    roomId: string,
    playerId: string,
    callback: (state: HandCricketClientState) => void
  ): () => void {
    const room = this.getRoom(roomId);
    if (!room) return () => {};

    let playerSubs = room.subscribers.get(playerId);
    if (!playerSubs) {
      playerSubs = new Set();
      room.subscribers.set(playerId, playerSubs);
    }
    playerSubs.add(callback);

    return () => {
      const current = room.subscribers.get(playerId);
      if (current) {
        current.delete(callback);
        if (current.size === 0) {
          room.subscribers.delete(playerId);
        }
      }
    };
  }

  private broadcastRoomState(room: ActiveCricketRoom): void {
    for (const [playerId, callbacks] of room.subscribers.entries()) {
      const clientState = this.getClientState(room.state.roomId, playerId);
      if (clientState) {
        for (const cb of callbacks) {
          cb(clientState);
        }
      }
    }
  }
}

export const handCricketManager = new HandCricketManager();
