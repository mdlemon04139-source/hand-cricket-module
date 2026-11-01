import {
  BallEvent,
  GestureVariationId,
  HandCricketMatchState,
  HandNumber,
  InningsState,
  MatchConfiguration,
  MatchFormat,
  MatchParticipant,
  MatchResultSummary,
  TossCall,
  TossDecision,
  TossState,
} from '../types/handCricket';
import {
  getDefaultGestureForNumber,
  parseHandSelection,
  resolveGestureNumericValue,
} from '../handcricket/data/gestureRegistry';

export const HAND_CRICKET_LIMITS = {
  MIN_CUSTOM_OVERS: 1,
  MAX_CUSTOM_OVERS: 50,
  MIN_WICKETS: 1,
  MAX_WICKETS: 10,
  TEST_MATCH_WICKETS: 10,
  TEST_MATCH_INNINGS: 4 as const,
  LIMITED_MATCH_INNINGS: 2 as const,
  LIMITED_OVERS_PRESETS: [2, 5, 10, 20] as const,
  DEFAULT_BALL_TIMER_SECONDS: 5,
};

export class HandCricketEngine {
  /**
   * Validates and normalizes match configuration according to format rules.
   */
  public static createMatchConfiguration(params: {
    mode: 'ai_single_player' | 'multiplayer_room';
    format: MatchFormat;
    overs?: number | null;
    wicketsPerInnings?: number;
    aiDifficulty?: 'easy' | 'medium' | 'hard';
    ballTimerSeconds?: number;
  }): MatchConfiguration {
    const { mode, format } = params;
    const ballTimerSeconds = params.ballTimerSeconds ?? HAND_CRICKET_LIMITS.DEFAULT_BALL_TIMER_SECONDS;

    if (format === 'test_match') {
      return {
        mode,
        format: 'test_match',
        overs: null, // No over limit in Test Match
        wicketsPerInnings: HAND_CRICKET_LIMITS.TEST_MATCH_WICKETS, // Strictly 10 wickets per innings
        totalInnings: HAND_CRICKET_LIMITS.TEST_MATCH_INNINGS, // Strictly 4 innings
        aiDifficulty: params.aiDifficulty,
        ballTimerSeconds,
      };
    }

    const rawWickets = params.wicketsPerInnings ?? 3;
    const wicketsPerInnings = Math.max(
      HAND_CRICKET_LIMITS.MIN_WICKETS,
      Math.min(HAND_CRICKET_LIMITS.MAX_WICKETS, Math.floor(rawWickets))
    );

    if (format === 'limited_overs') {
      const requestedOvers = params.overs ?? 2;
      const validPreset = (HAND_CRICKET_LIMITS.LIMITED_OVERS_PRESETS as readonly number[]).includes(
        requestedOvers
      )
        ? requestedOvers
        : 2;
      return {
        mode,
        format: 'limited_overs',
        overs: validPreset,
        wicketsPerInnings,
        totalInnings: HAND_CRICKET_LIMITS.LIMITED_MATCH_INNINGS,
        aiDifficulty: params.aiDifficulty,
        ballTimerSeconds,
      };
    }

    // custom_match
    const rawOvers = params.overs ?? 3;
    const overs = Math.max(
      HAND_CRICKET_LIMITS.MIN_CUSTOM_OVERS,
      Math.min(HAND_CRICKET_LIMITS.MAX_CUSTOM_OVERS, Math.floor(rawOvers))
    );

    return {
      mode,
      format: 'custom_match',
      overs,
      wicketsPerInnings,
      totalInnings: HAND_CRICKET_LIMITS.LIMITED_MATCH_INNINGS,
      aiDifficulty: params.aiDifficulty,
      ballTimerSeconds,
    };
  }

  /**
   * Formats legal ball count into standard cricket overs notation (e.g. 0.1 .. 0.5, 1.0)
   */
  public static formatOvers(balls: number): string {
    const completedOvers = Math.floor(balls / 6);
    const ballsInCurrentOver = balls % 6;
    return `${completedOvers}.${ballsInCurrentOver}`;
  }

  /**
   * Calculates Required Run Rate (runs per over) when a target exists and overs are limited.
   */
  public static calculateRequiredRunRate(innings: InningsState): number | null {
    if (innings.target === null || innings.maxOvers === null) {
      return null;
    }
    const runsNeeded = Math.max(0, innings.target - innings.runs);
    if (runsNeeded === 0) return 0;
    const ballsRemaining = innings.maxOvers * 6 - innings.balls;
    if (ballsRemaining <= 0) return null;
    return Number(((runsNeeded / ballsRemaining) * 6).toFixed(2));
  }

  /**
   * Calculates Current Run Rate (runs per over).
   */
  public static calculateCurrentRunRate(runs: number, balls: number): number {
    if (balls <= 0) return 0;
    return Number(((runs / balls) * 6).toFixed(2));
  }

  /**
   * Resolves coin toss call deterministically or with server random coin flip.
   */
  public static resolveTossCall(
    callerId: string,
    opponentId: string,
    call: TossCall,
    forcedCoinResult?: TossCall
  ): TossState {
    const coinResult: TossCall =
      forcedCoinResult ?? (Math.random() < 0.5 ? 'HEADS' : 'TAILS');
    const winnerId = call === coinResult ? callerId : opponentId;
    return {
      callerId,
      call,
      coinResult,
      winnerId,
    };
  }

  /**
   * Applies toss winner's decision (BAT_FIRST or BOWL_FIRST) and creates the full innings schedule.
   * Prevents mutating toss state once already confirmed.
   */
  public static applyTossDecision(
    toss: TossState,
    playerIds: [string, string],
    decision: TossDecision,
    config: MatchConfiguration
  ): { toss: TossState; innings: InningsState[] } {
    if (toss.decision && toss.firstBattingPlayerId) {
      throw new Error('Toss decision has already been confirmed and locked.');
    }
    if (!toss.winnerId) {
      throw new Error('Cannot apply toss decision before toss winner is determined.');
    }

    const otherPlayerId = playerIds[0] === toss.winnerId ? playerIds[1] : playerIds[0];
    const teamAId = decision === 'BAT_FIRST' ? toss.winnerId : otherPlayerId;
    const teamBId = teamAId === playerIds[0] ? playerIds[1] : playerIds[0];

    const updatedToss: TossState = {
      ...toss,
      decision,
      firstBattingPlayerId: teamAId,
      confirmedAt: Date.now(),
    };

    const innings: InningsState[] = [];
    const totalInnings = config.format === 'test_match' ? 4 : 2;
    const maxOvers = config.format === 'test_match' ? null : config.overs;
    const maxWickets =
      config.format === 'test_match'
        ? HAND_CRICKET_LIMITS.TEST_MATCH_WICKETS
        : config.wicketsPerInnings;

    for (let i = 1; i <= totalInnings; i++) {
      const isTeamABatting = i % 2 === 1; // Innings 1 & 3: Team A bats; Innings 2 & 4: Team B bats
      innings.push({
        inningsNumber: i as 1 | 2 | 3 | 4,
        battingPlayerId: isTeamABatting ? teamAId : teamBId,
        bowlingPlayerId: isTeamABatting ? teamBId : teamAId,
        runs: 0,
        wickets: 0,
        balls: 0,
        maxOvers,
        maxWickets,
        target: null,
        isCompleted: false,
        ballHistory: [],
      });
    }

    return { toss: updatedToss, innings };
  }

  /**
   * Core Hand Cricket single-ball evaluation rule:
   * - Each selection consists of Number (1–6) and Gesture Variation (A, B, or C).
   * - Batter is OUT ONLY when BOTH components match:
   *     batter.number === bowler.number && batter.variation === bowler.variation
   *     (i.e. batter.selectionId === bowler.selectionId)
   * - Same number with different variation (e.g. 1A vs 1B) is NOT OUT and awards batter.number runs.
   * - Missing or malformed variation data never causes an automatic wicket.
   */
  public static evaluateBallChoices(
    batterChoice: HandNumber | GestureVariationId,
    bowlerChoice: HandNumber | GestureVariationId
  ): {
    batterNumber: HandNumber;
    bowlerNumber: HandNumber;
    batterGestureId: GestureVariationId;
    bowlerGestureId: GestureVariationId;
    isWicket: boolean;
    runsScored: number;
  } {
    const batterParsed = parseHandSelection(batterChoice);
    const bowlerParsed = parseHandSelection(bowlerChoice);

    const batterNumber = batterParsed.number;
    const bowlerNumber = bowlerParsed.number;
    const batterGestureId = batterParsed.selectionId;
    const bowlerGestureId = bowlerParsed.selectionId;

    // Missing or malformed data must never cause an automatic wicket
    const isWicket =
      batterParsed.isValid &&
      bowlerParsed.isValid &&
      batterNumber === bowlerNumber &&
      batterParsed.variation === bowlerParsed.variation &&
      batterGestureId === bowlerGestureId;

    const runsScored = isWicket ? 0 : batterNumber;

    return {
      batterNumber,
      bowlerNumber,
      batterGestureId,
      bowlerGestureId,
      isWicket,
      runsScored,
    };
  }

  /**
   * Calculates Fourth Innings target in Test Match:
   * Target = A1 + A2 - B1 + 1
   */
  public static calculateTestFourthInningsTarget(
    a1: number,
    b1: number,
    a2: number
  ): number {
    return a1 + a2 - b1 + 1;
  }

  /**
   * Calculates aggregate scores for Team A (first batting team) and Team B (second batting team).
   */
  public static getAggregateScores(
    innings: InningsState[],
    teamAId: string,
    teamBId: string
  ): {
    teamAAggregate: number;
    teamBAggregate: number;
    a1: number;
    b1: number;
    a2: number;
    b2: number;
  } {
    const a1 = innings[0]?.runs ?? 0;
    const b1 = innings[1]?.runs ?? 0;
    const a2 = innings[2]?.runs ?? 0;
    const b2 = innings[3]?.runs ?? 0;

    let teamAAggregate = 0;
    let teamBAggregate = 0;
    for (const inn of innings) {
      if (inn.battingPlayerId === teamAId) teamAAggregate += inn.runs;
      if (inn.battingPlayerId === teamBId) teamBAggregate += inn.runs;
    }

    return { teamAAggregate, teamBAggregate, a1, b1, a2, b2 };
  }

  /**
   * Processes a single ball deterministically on a match state.
   * Enforces idempotency via ballId so a ball can never be processed twice.
   */
  public static processBallOnMatch(
    match: HandCricketMatchState,
    params: {
      ballId: string;
      batterChoice: HandNumber | GestureVariationId;
      bowlerChoice: HandNumber | GestureVariationId;
      batterTimedOut?: boolean;
      bowlerTimedOut?: boolean;
      timestamp?: number;
    }
  ): {
    ballEvent: BallEvent;
    inningsCompleted: boolean;
    matchCompleted: boolean;
  } {
    const currentInnings = match.innings[match.currentInningsIndex];
    if (!currentInnings) {
      throw new Error('No active innings found.');
    }
    if (currentInnings.isCompleted) {
      throw new Error('Current innings is already completed.');
    }

    // Prevent duplicate ball processing
    const alreadyProcessed = currentInnings.ballHistory.some(
      (b) => b.ballId === params.ballId
    );
    if (alreadyProcessed) {
      throw new Error(`Duplicate ballId rejected: ${params.ballId}`);
    }

    const evalResult = this.evaluateBallChoices(
      params.batterChoice,
      params.bowlerChoice
    );

    currentInnings.balls += 1;
    if (evalResult.isWicket) {
      currentInnings.wickets += 1;
    } else {
      currentInnings.runs += evalResult.runsScored;
    }

    const overNumber = Math.floor((currentInnings.balls - 1) / 6);
    const ballInOver = ((currentInnings.balls - 1) % 6) + 1;
    const overDisplay = this.formatOvers(currentInnings.balls);

    const ballEvent: BallEvent = {
      ballId: params.ballId,
      inningsNumber: currentInnings.inningsNumber,
      ballNumberInInnings: currentInnings.balls,
      overNumber,
      ballInOver,
      overDisplay,
      batterId: currentInnings.battingPlayerId,
      bowlerId: currentInnings.bowlingPlayerId,
      batterNumber: evalResult.batterNumber,
      bowlerNumber: evalResult.bowlerNumber,
      batterGestureId: evalResult.batterGestureId,
      bowlerGestureId: evalResult.bowlerGestureId,
      isWicket: evalResult.isWicket,
      runsScored: evalResult.runsScored,
      scoreAfter: currentInnings.runs,
      wicketsAfter: currentInnings.wickets,
      batterTimedOut: Boolean(params.batterTimedOut),
      bowlerTimedOut: Boolean(params.bowlerTimedOut),
      timestamp: params.timestamp ?? Date.now(),
    };

    currentInnings.ballHistory.push(ballEvent);
    match.lastBallEvent = ballEvent;

    // Check innings completion conditions
    // 1. Target reached (applicable in 2nd innings of Limited/Custom, or 4th innings of Test Match)
    if (
      currentInnings.target !== null &&
      currentInnings.runs >= currentInnings.target
    ) {
      currentInnings.isCompleted = true;
      currentInnings.completionReason = 'TARGET_REACHED';
    }
    // 2. Wickets exhausted
    else if (currentInnings.wickets >= currentInnings.maxWickets) {
      currentInnings.isCompleted = true;
      currentInnings.completionReason = 'ALL_OUT';
    }
    // 3. Overs completed (only when maxOvers is not null)
    else if (
      currentInnings.maxOvers !== null &&
      currentInnings.balls >= currentInnings.maxOvers * 6
    ) {
      currentInnings.isCompleted = true;
      currentInnings.completionReason = 'OVERS_COMPLETED';
    }

    let matchCompleted = false;

    if (currentInnings.isCompleted) {
      const isFinalInnings =
        match.currentInningsIndex === match.innings.length - 1;

      if (match.config.format !== 'test_match') {
        // 2-Innings Match (Limited Overs / Custom Match)
        if (match.currentInningsIndex === 0) {
          // Set target for Innings 2
          match.innings[1].target = currentInnings.runs + 1;
        } else if (isFinalInnings) {
          matchCompleted = true;
          match.result = this.computeLimitedOversResult(match);
          match.completedAt = Date.now();
          match.phase = 'MATCH_COMPLETE';
        }
      } else {
        // 4-Innings Test Match
        if (match.currentInningsIndex === 2) {
          // End of 3rd innings (Team A 2nd Innings) -> Calculate 4th Innings target
          const a1 = match.innings[0].runs;
          const b1 = match.innings[1].runs;
          const a2 = match.innings[2].runs;
          const target = this.calculateTestFourthInningsTarget(a1, b1, a2);
          match.innings[3].target = target;

          // If target <= 0 (Team B's 1st innings already exceeds Team A's both innings combined)
          if (target <= 0) {
            match.innings[3].isCompleted = true;
            match.innings[3].completionReason = 'TARGET_REACHED';
            matchCompleted = true;
            match.result = this.computeTestMatchResult(match);
            match.completedAt = Date.now();
            match.phase = 'MATCH_COMPLETE';
          }
        } else if (isFinalInnings) {
          matchCompleted = true;
          match.result = this.computeTestMatchResult(match);
          match.completedAt = Date.now();
          match.phase = 'MATCH_COMPLETE';
        }
      }
    }

    return {
      ballEvent,
      inningsCompleted: currentInnings.isCompleted,
      matchCompleted,
    };
  }

  /**
   * Advances match from completed innings to the next innings.
   */
  public static advanceToNextInnings(match: HandCricketMatchState): void {
    const currentInnings = match.innings[match.currentInningsIndex];
    if (!currentInnings || !currentInnings.isCompleted) {
      throw new Error('Cannot advance before current innings is completed.');
    }
    if (match.currentInningsIndex >= match.innings.length - 1) {
      throw new Error('Already at final innings.');
    }
    match.currentInningsIndex += 1;
    match.pendingSubmissions = {};
    match.currentBallNumber += 1;
    match.currentBallId = `${match.matchId}_inn${match.currentInningsIndex + 1}_b1`;
    match.phase = 'BALL_SELECTION';
  }

  /**
   * Computes final result for Limited Overs / Custom 2-innings match.
   */
  public static computeLimitedOversResult(
    match: HandCricketMatchState
  ): MatchResultSummary {
    const inn1 = match.innings[0];
    const inn2 = match.innings[1];
    const teamA = match.players.find(
      (p) => p?.playerId === inn1.battingPlayerId
    ) as MatchParticipant | undefined;
    const teamB = match.players.find(
      (p) => p?.playerId === inn2.battingPlayerId
    ) as MatchParticipant | undefined;

    const teamAName = teamA?.name || 'Team A';
    const teamBName = teamB?.name || 'Team B';

    if (inn2.runs > inn1.runs) {
      const wicketsRemaining = Math.max(1, inn2.maxWickets - inn2.wickets);
      return {
        outcome: 'WIN',
        winnerPlayerId: inn2.battingPlayerId,
        loserPlayerId: inn1.battingPlayerId,
        winnerName: teamBName,
        marginTextBn: `${teamBName} ${wicketsRemaining} উইকেটে বিজয়ী!`,
        marginTextEn: `${teamBName} won by ${wicketsRemaining} wicket${
          wicketsRemaining > 1 ? 's' : ''
        }`,
        teamAScoreAggregate: inn1.runs,
        teamBScoreAggregate: inn2.runs,
        completedAt: Date.now(),
      };
    }

    if (inn1.runs > inn2.runs) {
      const runMargin = inn1.runs - inn2.runs;
      return {
        outcome: 'WIN',
        winnerPlayerId: inn1.battingPlayerId,
        loserPlayerId: inn2.battingPlayerId,
        winnerName: teamAName,
        marginTextBn: `${teamAName} ${runMargin} রানে বিজয়ী!`,
        marginTextEn: `${teamAName} won by ${runMargin} run${
          runMargin > 1 ? 's' : ''
        }`,
        teamAScoreAggregate: inn1.runs,
        teamBScoreAggregate: inn2.runs,
        completedAt: Date.now(),
      };
    }

    return {
      outcome: 'TIE',
      winnerPlayerId: null,
      loserPlayerId: null,
      winnerName: null,
      marginTextBn: 'ম্যাচ ড্র / টাই হয়েছে! (উভয় দলের রান সমান)',
      marginTextEn: 'Match Tied! Both teams scored equal runs.',
      teamAScoreAggregate: inn1.runs,
      teamBScoreAggregate: inn2.runs,
      completedAt: Date.now(),
    };
  }

  /**
   * Computes final result for 4-innings Test Match.
   */
  public static computeTestMatchResult(
    match: HandCricketMatchState
  ): MatchResultSummary {
    const teamAId = match.innings[0].battingPlayerId;
    const teamBId = match.innings[1].battingPlayerId;

    const teamA = match.players.find((p) => p?.playerId === teamAId);
    const teamB = match.players.find((p) => p?.playerId === teamBId);
    const teamAName = teamA?.name || 'Team A';
    const teamBName = teamB?.name || 'Team B';

    const { teamAAggregate, teamBAggregate } = this.getAggregateScores(
      match.innings,
      teamAId,
      teamBId
    );
    const inn4 = match.innings[3];

    if (teamBAggregate > teamAAggregate) {
      const wicketsRemaining = Math.max(1, inn4.maxWickets - inn4.wickets);
      const isInningsVictory =
        inn4.balls === 0 && match.innings[1].runs > teamAAggregate;
      const runDiff = teamBAggregate - teamAAggregate;

      return {
        outcome: 'WIN',
        winnerPlayerId: teamBId,
        loserPlayerId: teamAId,
        winnerName: teamBName,
        marginTextBn: isInningsVictory
          ? `${teamBName} ১ ইনিংস ও ${runDiff} রানে বিজয়ী!`
          : `${teamBName} ${wicketsRemaining} উইকেটে টেস্ট বিজয়ী!`,
        marginTextEn: isInningsVictory
          ? `${teamBName} won by an innings and ${runDiff} runs`
          : `${teamBName} won the Test by ${wicketsRemaining} wicket${
              wicketsRemaining > 1 ? 's' : ''
            }`,
        teamAScoreAggregate: teamAAggregate,
        teamBScoreAggregate: teamBAggregate,
        completedAt: Date.now(),
      };
    }

    if (teamAAggregate > teamBAggregate) {
      const runMargin = teamAAggregate - teamBAggregate;
      return {
        outcome: 'WIN',
        winnerPlayerId: teamAId,
        loserPlayerId: teamBId,
        winnerName: teamAName,
        marginTextBn: `${teamAName} ${runMargin} রানে টেস্ট বিজয়ী!`,
        marginTextEn: `${teamAName} won the Test by ${runMargin} run${
          runMargin > 1 ? 's' : ''
        }`,
        teamAScoreAggregate: teamAAggregate,
        teamBScoreAggregate: teamBAggregate,
        completedAt: Date.now(),
      };
    }

    return {
      outcome: 'TIE',
      winnerPlayerId: null,
      loserPlayerId: null,
      winnerName: null,
      marginTextBn: 'ঐতিহাসিক টেস্ট টাই! উভয় দলের মোট রান সমান।',
      marginTextEn: 'Historic Test Match Tie! Equal aggregate scores.',
      teamAScoreAggregate: teamAAggregate,
      teamBScoreAggregate: teamBAggregate,
      completedAt: Date.now(),
    };
  }
}
