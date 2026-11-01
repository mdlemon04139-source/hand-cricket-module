export type HandNumber = 1 | 2 | 3 | 4 | 5 | 6;

export type GestureVariationId =
  | '1A'
  | '1B'
  | '1C'
  | '2A'
  | '2B'
  | '2C'
  | '3A'
  | '3B'
  | '3C'
  | '4A'
  | '4B'
  | '4C'
  | '5A'
  | '5B'
  | '5C'
  | '5_FALLBACK'
  | '6A'
  | '6B'
  | '6C';

export interface HandGestureDefinition {
  id: GestureVariationId;
  numericValue: HandNumber;
  labelBn: string;
  labelEn: string;
  fingerDescriptionBn: string;
  fingerDescriptionEn: string;
  isApprovedIllustration: boolean;
  isPrimaryForNumber: boolean;
}

export type MatchMode = 'ai_single_player' | 'multiplayer_room';
export type AIDifficulty = 'easy' | 'medium' | 'hard';
export type MatchFormat = 'limited_overs' | 'custom_match' | 'test_match';
export type LimitedOversPreset = 2 | 5 | 10 | 20;

export interface MatchConfiguration {
  mode: MatchMode;
  format: MatchFormat;
  overs: number | null; // null for test_match (unlimited overs)
  wicketsPerInnings: number; // 1-10 for limited/custom, fixed 10 for test_match
  totalInnings: 2 | 4; // 2 for limited/custom, 4 for test_match
  aiDifficulty?: AIDifficulty;
  ballTimerSeconds: number; // default 5 seconds
}

export type TossCall = 'HEADS' | 'TAILS';
export type TossDecision = 'BAT_FIRST' | 'BOWL_FIRST';

export interface TossState {
  callerId: string;
  call?: TossCall;
  coinResult?: TossCall;
  winnerId?: string;
  decision?: TossDecision;
  firstBattingPlayerId?: string;
  confirmedAt?: number;
}

export interface BallEvent {
  ballId: string;
  inningsNumber: 1 | 2 | 3 | 4;
  ballNumberInInnings: number;
  overNumber: number; // e.g., 0 for first over
  ballInOver: number; // 1..6
  overDisplay: string; // e.g., "0.1", "0.5", "1.0"
  batterId: string;
  bowlerId: string;
  batterNumber: HandNumber;
  bowlerNumber: HandNumber;
  batterGestureId: GestureVariationId;
  bowlerGestureId: GestureVariationId;
  isWicket: boolean;
  runsScored: number;
  scoreAfter: number;
  wicketsAfter: number;
  batterTimedOut: boolean;
  bowlerTimedOut: boolean;
  timestamp: number;
}

export type InningsCompletionReason =
  | 'OVERS_COMPLETED'
  | 'ALL_OUT'
  | 'TARGET_REACHED';

export interface InningsState {
  inningsNumber: 1 | 2 | 3 | 4;
  battingPlayerId: string;
  bowlingPlayerId: string;
  runs: number;
  wickets: number;
  balls: number;
  maxOvers: number | null;
  maxWickets: number;
  target: number | null;
  isCompleted: boolean;
  completionReason?: InningsCompletionReason;
  ballHistory: BallEvent[];
}

export type MatchPhase =
  | 'LOBBY'
  | 'TOSS_CALL'
  | 'TOSS_DECISION'
  | 'BALL_SELECTION'
  | 'BALL_REVEAL'
  | 'INNINGS_BREAK'
  | 'MATCH_COMPLETE';

export interface MatchParticipant {
  playerId: string;
  name: string;
  country: string;
  jerseyNumber: number;
  avatar: string;
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
  isReady: boolean;
  isOnline: boolean;
  seatIndex: 0 | 1;
}

export type MatchOutcomeType = 'WIN' | 'TIE';

export interface MatchResultSummary {
  outcome: MatchOutcomeType;
  winnerPlayerId: string | null; // null if TIE
  loserPlayerId: string | null; // null if TIE
  winnerName: string | null;
  marginTextBn: string;
  marginTextEn: string;
  teamAScoreAggregate: number;
  teamBScoreAggregate: number;
  completedAt: number;
}

export interface PendingBallSubmission {
  number: HandNumber;
  gestureId: GestureVariationId;
  submittedAt: number;
  timedOut: boolean;
}

export interface HandCricketMatchState {
  matchId: string;
  roomId: string;
  roomCode: string;
  hostId: string;
  config: MatchConfiguration;
  phase: MatchPhase;
  players: [MatchParticipant, MatchParticipant] | [MatchParticipant];
  toss: TossState;
  currentInningsIndex: number; // 0..1 or 0..3
  innings: InningsState[];
  currentBallNumber: number; // increments each ball across match
  currentBallId: string;
  ballDeadline?: number;
  pendingSubmissions: Record<string, PendingBallSubmission>;
  lastBallEvent?: BallEvent;
  result?: MatchResultSummary;
  rematchVotes: string[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface HandCricketClientState {
  matchId: string;
  roomId: string;
  roomCode: string;
  hostId: string;
  myPlayerId: string;
  config: MatchConfiguration;
  phase: MatchPhase;
  players: MatchParticipant[];
  toss: TossState;
  currentInningsIndex: number;
  innings: InningsState[];
  currentBallId: string;
  ballDeadline?: number;
  mySubmittedSelection?: {
    number: HandNumber;
    gestureId: GestureVariationId;
    timedOut: boolean;
  };
  opponentLocked: boolean;
  lastBallEvent?: BallEvent;
  result?: MatchResultSummary;
  rematchVotes: string[];
  careerReward?: MatchCareerReward;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

// --- CAREER MODE & LEADERBOARD TYPES ---

export type CareerStage =
  | 'Rookie'
  | 'Rising Player'
  | 'Professional'
  | 'Elite'
  | 'Legend';

export interface PlayerCareerProfile {
  playerId: string;
  name: string;
  country: string;
  jerseyNumber: number;
  avatar: string;
  createdAt: number;
  updatedAt: number;
}

export interface CareerStatBucket {
  totalMatches: number;
  wins: number;
  losses: number;
  ties: number;
  inningsBatted: number;
  notOuts: number;
  totalRuns: number;
  ballsFaced: number;
  highestScore: number;
  fifties: number;
  hundreds: number;
  fours: number;
  sixes: number;
  totalWickets: number;
  ballsBowled: number;
  runsConceded: number;
  bestBowlingWickets: number;
  bestBowlingRuns: number;
  consecutiveWins: number;
  maxConsecutiveWins: number;
  hatTricks: number;
  testWins: number;
  battingAverage: number;
  strikeRate: number;
  winRate: number;
}

export interface PlayerCareerData {
  profile: PlayerCareerProfile;
  xp: number;
  level: number;
  stage: CareerStage;
  stageBn: string;
  currentLevelBaseXp: number;
  nextLevelXp: number;
  overall: CareerStatBucket;
  ai: CareerStatBucket;
  multiplayer: CareerStatBucket;
  unlockedAchievements: Record<string, number>; // achievementId -> unlockedAt timestamp
  history: CareerMatchHistoryItem[];
  processedMatchIds: string[];
}

export interface CareerInningsSummary {
  inningsNumber: 1 | 2 | 3 | 4;
  battingPlayerId: string;
  battingPlayerName: string;
  runs: number;
  wickets: number;
  balls: number;
  overDisplay: string;
  target: number | null;
}

export interface CareerMatchHistoryItem {
  matchId: string;
  date: number;
  mode: MatchMode;
  format: MatchFormat;
  oversConfig: number | null;
  wicketsConfig: number;
  opponentId: string;
  opponentName: string;
  opponentAvatar: string;
  playerResult: 'WIN' | 'LOSS' | 'TIE';
  marginTextBn: string;
  marginTextEn: string;
  playerTotalRuns: number;
  playerBallsFaced: number;
  playerWicketsTaken: number;
  opponentTotalRuns: number;
  inningsSummaries: CareerInningsSummary[];
  xpEarned: number;
  achievementsUnlocked: string[];
}

export interface CareerAchievementDefinition {
  id: string;
  titleBn: string;
  titleEn: string;
  descriptionBn: string;
  descriptionEn: string;
  xpReward: number;
  iconName: string;
  milestoneCategory: 'matches' | 'runs' | 'wickets' | 'wins' | 'special';
}

export interface MatchCareerReward {
  matchId: string;
  xpEarned: number;
  previousXp: number;
  newXp: number;
  previousLevel: number;
  newLevel: number;
  stage: CareerStage;
  stageBn: string;
  newlyUnlockedAchievements: CareerAchievementDefinition[];
}

export type LeaderboardSortBy = 'wins' | 'runs' | 'winRate' | 'xp' | 'level';

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  country: string;
  jerseyNumber: number;
  avatar: string;
  level: number;
  stage: CareerStage;
  xp: number;
  multiplayerMatches: number;
  multiplayerWins: number;
  multiplayerRuns: number;
  multiplayerWickets: number;
  multiplayerWinRate: number;
  highestScore: number;
}
