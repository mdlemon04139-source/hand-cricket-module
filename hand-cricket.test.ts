import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { HandCricketEngine } from '../src/engine/handCricketEngine';
import { HandCricketAI } from '../src/engine/handCricketAI';
import {
  ALL_18_GESTURE_VARIATIONS,
  HAND_GESTURE_REGISTRY,
  GESTURES_BY_NUMBER,
  resolveGestureNumericValue,
} from '../src/handcricket/data/gestureRegistry';
import { HandCricketManager } from '../src/server/handCricketManager';
import { gameStatsManager } from '../src/server/gameStatsManager';
import { HandCricketMatchState } from '../src/types/handCricket';

console.log('Running KhelGhor Hand Cricket Automated Test Suite...');

// ============================================================================
// 1. GESTURE REGISTRY & VARIATION MAPPING TESTS
// ============================================================================
console.log('1. Verifying Gesture Registry & All 18 Variation Mappings (1A..6C)...');

assert.strictEqual(ALL_18_GESTURE_VARIATIONS.length, 18, 'Exactly 18 gesture variations exist in ALL_18_GESTURE_VARIATIONS');
assert.strictEqual(resolveGestureNumericValue('1A'), 1, '1A maps to 1');
assert.strictEqual(resolveGestureNumericValue('1B'), 1, '1B maps to 1');
assert.strictEqual(resolveGestureNumericValue('1C'), 1, '1C maps to 1');
assert.strictEqual(resolveGestureNumericValue('2A'), 2, '2A maps to 2');
assert.strictEqual(resolveGestureNumericValue('2B'), 2, '2B maps to 2');
assert.strictEqual(resolveGestureNumericValue('2C'), 2, '2C maps to 2');
assert.strictEqual(resolveGestureNumericValue('3A'), 3, '3A maps to 3');
assert.strictEqual(resolveGestureNumericValue('3B'), 3, '3B maps to 3');
assert.strictEqual(resolveGestureNumericValue('3C'), 3, '3C maps to 3');
assert.strictEqual(resolveGestureNumericValue('4A'), 4, '4A maps to 4');
assert.strictEqual(resolveGestureNumericValue('4B'), 4, '4B maps to 4');
assert.strictEqual(resolveGestureNumericValue('4C'), 4, '4C maps to 4');
assert.strictEqual(resolveGestureNumericValue('5A'), 5, '5A maps to 5');
assert.strictEqual(resolveGestureNumericValue('5B'), 5, '5B maps to 5');
assert.strictEqual(resolveGestureNumericValue('5C'), 5, '5C maps to 5');
assert.strictEqual(resolveGestureNumericValue('5_FALLBACK'), 5, '5_FALLBACK maps to 5');
assert.strictEqual(resolveGestureNumericValue('6A'), 6, '6A maps to 6');
assert.strictEqual(resolveGestureNumericValue('6B'), 6, '6B maps to 6');
assert.strictEqual(resolveGestureNumericValue('6C'), 6, '6C maps to 6');

for (const n of [1, 2, 3, 4, 5, 6] as const) {
  assert.strictEqual(
    GESTURES_BY_NUMBER[n].length,
    3,
    `Number ${n} has 3 distinct gesture variations (${n}A, ${n}B, ${n}C)`
  );
  for (const v of GESTURES_BY_NUMBER[n]) {
    assert.strictEqual(v.isApprovedIllustration, true, `${v.id} uses custom SVG hand illustration`);
  }
}

// ============================================================================
// 2. GAME ENGINE CORE RULES & WICKET DETECTION (NUMBER + VARIATION) TESTS
// ============================================================================
console.log('2. Verifying Core Hand Cricket Engine Rules & Wicket Detection (Number + Variation)...');

// 2.1 Required Wicket Logic Test Matrix (Section 7 & Section 1)
const requiredWicketMatrix: Array<{
  batter: '1A' | '1B' | '1C' | '2A' | '2B' | '3C' | '4A' | '4B' | '4C' | '5B' | '6A' | '6B' | '6C';
  bowler: '1A' | '1B' | '1C' | '2A' | '2B' | '3C' | '4A' | '4B' | '4C' | '5B' | '6A' | '6B' | '6C';
  expectedWicket: boolean;
  expectedRuns: number;
}> = [
  // Required 9 test cases from Section 7:
  { batter: '1A', bowler: '1A', expectedWicket: true, expectedRuns: 0 },
  { batter: '1A', bowler: '1B', expectedWicket: false, expectedRuns: 1 },
  { batter: '1A', bowler: '1C', expectedWicket: false, expectedRuns: 1 },
  { batter: '2B', bowler: '2A', expectedWicket: false, expectedRuns: 2 },
  { batter: '3C', bowler: '3C', expectedWicket: true, expectedRuns: 0 },
  { batter: '4A', bowler: '4B', expectedWicket: false, expectedRuns: 4 },
  { batter: '5B', bowler: '5B', expectedWicket: true, expectedRuns: 0 },
  { batter: '6A', bowler: '6C', expectedWicket: false, expectedRuns: 6 },
  { batter: '6C', bowler: '6C', expectedWicket: true, expectedRuns: 0 },
  // Additional examples from Section 1:
  { batter: '1B', bowler: '1C', expectedWicket: false, expectedRuns: 1 },
  { batter: '2A', bowler: '2A', expectedWicket: true, expectedRuns: 0 },
  { batter: '4A', bowler: '4A', expectedWicket: true, expectedRuns: 0 },
  { batter: '4C', bowler: '4B', expectedWicket: false, expectedRuns: 4 },
  { batter: '6A', bowler: '6B', expectedWicket: false, expectedRuns: 6 },
];

for (const tc of requiredWicketMatrix) {
  const res = HandCricketEngine.evaluateBallChoices(tc.batter, tc.bowler);
  assert.strictEqual(
    res.isWicket,
    tc.expectedWicket,
    `Batter ${tc.batter} vs Bowler ${tc.bowler} -> expected isWicket=${tc.expectedWicket}`
  );
  assert.strictEqual(
    res.runsScored,
    tc.expectedRuns,
    `Batter ${tc.batter} vs Bowler ${tc.bowler} -> expected runsScored=${tc.expectedRuns}`
  );
  assert.strictEqual(res.batterGestureId, tc.batter);
  assert.strictEqual(res.bowlerGestureId, tc.bowler);
}

// 2.2 Different numbers with same variation letter (e.g. 4A vs 2A) -> NOT OUT, scores batter number
const diffNumSameVar = HandCricketEngine.evaluateBallChoices('4A', '2A');
assert.strictEqual(diffNumSameVar.isWicket, false, '4A vs 2A (same variation A, different number) is NOT OUT');
assert.strictEqual(diffNumSameVar.runsScored, 4, 'Batter scores 4 runs');

// 2.3 Legacy fallback & malformed input safety (missing/malformed variation never causes automatic wicket)
const diffEvalLegacy = HandCricketEngine.evaluateBallChoices('5_FALLBACK', '6A');
assert.strictEqual(diffEvalLegacy.isWicket, false, '5_FALLBACK vs 6A is not a wicket');
assert.strictEqual(diffEvalLegacy.runsScored, 5, 'Batter scores 5 runs');

const malformedEval = HandCricketEngine.evaluateBallChoices(
  'INVALID_GESTURE' as any,
  'INVALID_GESTURE' as any
);
assert.strictEqual(
  malformedEval.isWicket,
  false,
  'Malformed gesture data must never cause an automatic wicket'
);

// 2.4 Overs increment correctly
assert.strictEqual(HandCricketEngine.formatOvers(0), '0.0');
assert.strictEqual(HandCricketEngine.formatOvers(1), '0.1');
assert.strictEqual(HandCricketEngine.formatOvers(5), '0.5');
assert.strictEqual(HandCricketEngine.formatOvers(6), '1.0');
assert.strictEqual(HandCricketEngine.formatOvers(7), '1.1');
assert.strictEqual(HandCricketEngine.formatOvers(12), '2.0');

// 2.4 & 2.5 Wickets increment & Innings ends when overs finish (1 over = 6 balls)
{
  const config = HandCricketEngine.createMatchConfiguration({
    mode: 'ai_single_player',
    format: 'custom_match',
    overs: 1,
    wicketsPerInnings: 2,
  });

  const toss = HandCricketEngine.resolveTossCall('pA', 'pB', 'HEADS', 'HEADS');
  const { toss: lockedToss, innings } = HandCricketEngine.applyTossDecision(
    toss,
    ['pA', 'pB'],
    'BAT_FIRST',
    config
  );

  const match: HandCricketMatchState = {
    matchId: 'test_m_overs',
    roomId: 'r_overs',
    roomCode: 'OVERS1',
    hostId: 'pA',
    config,
    phase: 'BALL_SELECTION',
    players: [
      { playerId: 'pA', name: 'Player A', country: 'BD', jerseyNumber: 7, avatar: '🏏', isAI: false, isReady: true, isOnline: true, seatIndex: 0 },
      { playerId: 'pB', name: 'Player B', country: 'BD', jerseyNumber: 9, avatar: '⚡', isAI: false, isReady: true, isOnline: true, seatIndex: 1 },
    ],
    toss: lockedToss,
    currentInningsIndex: 0,
    innings,
    currentBallNumber: 1,
    currentBallId: 'b1',
    pendingSubmissions: {},
    rematchVotes: [],
    createdAt: Date.now(),
  };

  // Bowl 5 scoring balls + 1 wicket ball = 6 balls (1.0 over)
  for (let i = 1; i <= 5; i++) {
    const res = HandCricketEngine.processBallOnMatch(match, {
      ballId: `b_${i}`,
      batterChoice: 4,
      bowlerChoice: 2,
    });
    assert.strictEqual(res.inningsCompleted, false, `Ball ${i} should not complete 1-over innings`);
  }

  const sixthBall = HandCricketEngine.processBallOnMatch(match, {
    ballId: 'b_6',
    batterChoice: 3,
    bowlerChoice: 3, // Wicket on 6th ball (1 wicket out of 2, but 6 balls = 1.0 over completed)
  });

  assert.strictEqual(match.innings[0].runs, 20, '5 fours = 20 runs');
  assert.strictEqual(match.innings[0].wickets, 1, 'Wickets incremented to 1');
  assert.strictEqual(match.innings[0].balls, 6, '6 balls bowled');
  assert.strictEqual(sixthBall.inningsCompleted, true, 'Innings ends when 1 over (6 balls) finishes');
  assert.strictEqual(match.innings[0].completionReason, 'OVERS_COMPLETED');

  // Advance to 2nd innings and test Chasing Team immediate win when Target (21) is reached
  HandCricketEngine.advanceToNextInnings(match);
  assert.strictEqual(match.currentInningsIndex, 1, 'Advanced to 2nd innings');
  assert.strictEqual(match.innings[1].target, 21, '2nd innings target is 20 + 1 = 21');

  // Score 6, 6, 6, 4 = 22 runs in 4 balls -> immediate win on 4th ball!
  HandCricketEngine.processBallOnMatch(match, { ballId: 'i2_b1', batterChoice: 6, bowlerChoice: 1 });
  HandCricketEngine.processBallOnMatch(match, { ballId: 'i2_b2', batterChoice: 6, bowlerChoice: 2 });
  HandCricketEngine.processBallOnMatch(match, { ballId: 'i2_b3', batterChoice: 6, bowlerChoice: 3 });
  const winBall = HandCricketEngine.processBallOnMatch(match, {
    ballId: 'i2_b4',
    batterChoice: 4,
    bowlerChoice: 1,
  });

  assert.strictEqual(winBall.inningsCompleted, true, '2nd innings ends immediately when target reached');
  assert.strictEqual(winBall.matchCompleted, true, 'Match completes immediately when target reached');
  assert.strictEqual(match.innings[1].completionReason, 'TARGET_REACHED');
  assert.strictEqual(match.result?.winnerPlayerId, 'pB', 'Chasing team pB wins');
}

// 2.6 & 2.8 Innings ends when wickets exhausted (ALL_OUT) & Equal scores produce a TIE
{
  const config = HandCricketEngine.createMatchConfiguration({
    mode: 'multiplayer_room',
    format: 'limited_overs',
    overs: 2,
    wicketsPerInnings: 2,
  });
  const toss = HandCricketEngine.resolveTossCall('pA', 'pB', 'TAILS', 'TAILS');
  const { toss: lockedToss, innings } = HandCricketEngine.applyTossDecision(
    toss,
    ['pA', 'pB'],
    'BAT_FIRST',
    config
  );
  const match: HandCricketMatchState = {
    matchId: 'test_m_tie',
    roomId: 'r_tie',
    roomCode: 'TIE123',
    hostId: 'pA',
    config,
    phase: 'BALL_SELECTION',
    players: [
      { playerId: 'pA', name: 'Player A', country: 'BD', jerseyNumber: 7, avatar: '🏏', isAI: false, isReady: true, isOnline: true, seatIndex: 0 },
      { playerId: 'pB', name: 'Player B', country: 'BD', jerseyNumber: 9, avatar: '⚡', isAI: false, isReady: true, isOnline: true, seatIndex: 1 },
    ],
    toss: lockedToss,
    currentInningsIndex: 0,
    innings,
    currentBallNumber: 1,
    currentBallId: 'b1',
    pendingSubmissions: {},
    rematchVotes: [],
    createdAt: Date.now(),
  };

  // Innings 1: pA scores 6, then loses 2 wickets -> ALL_OUT for 6
  HandCricketEngine.processBallOnMatch(match, { ballId: '1_1', batterChoice: 6, bowlerChoice: 2 });
  HandCricketEngine.processBallOnMatch(match, { ballId: '1_2', batterChoice: 5, bowlerChoice: 5 });
  const allOut1 = HandCricketEngine.processBallOnMatch(match, { ballId: '1_3', batterChoice: 2, bowlerChoice: 2 });
  assert.strictEqual(allOut1.inningsCompleted, true, 'Innings 1 ends when 2 wickets exhausted');
  assert.strictEqual(match.innings[0].completionReason, 'ALL_OUT');
  assert.strictEqual(match.innings[0].runs, 6);

  // Innings 2: pB also scores 6, then loses 2 wickets -> ALL_OUT for 6 -> TIE
  HandCricketEngine.advanceToNextInnings(match);
  HandCricketEngine.processBallOnMatch(match, { ballId: '2_1', batterChoice: 6, bowlerChoice: 1 });
  HandCricketEngine.processBallOnMatch(match, { ballId: '2_2', batterChoice: 4, bowlerChoice: 4 });
  const allOut2 = HandCricketEngine.processBallOnMatch(match, { ballId: '2_3', batterChoice: 1, bowlerChoice: 1 });
  assert.strictEqual(allOut2.matchCompleted, true, 'Match ends after 2nd innings all out');
  assert.strictEqual(match.result?.outcome, 'TIE', 'Equal scores (6 vs 6) produce a TIE');
}

// ============================================================================
// 3. TEST MATCH (4-INNINGS) RULES & SCENARIOS
// ============================================================================
console.log('3. Verifying Test Match (4 Innings, 10 Wickets, Unlimited Overs, Aggregate Target)...');

function createTestMatchFixture(): HandCricketMatchState {
  const config = HandCricketEngine.createMatchConfiguration({
    mode: 'multiplayer_room',
    format: 'test_match',
  });
  // Verify Test Match constraints:
  assert.strictEqual(config.totalInnings, 4, 'Test match has 4 innings');
  assert.strictEqual(config.wicketsPerInnings, 10, 'Test match has 10 wickets per innings');
  assert.strictEqual(config.overs, null, 'Test match has no over limit');

  const toss = HandCricketEngine.resolveTossCall('teamA', 'teamB', 'HEADS', 'HEADS');
  const { toss: lockedToss, innings } = HandCricketEngine.applyTossDecision(
    toss,
    ['teamA', 'teamB'],
    'BAT_FIRST',
    config
  );

  // Verify batting order: A (1st), B (1st), A (2nd), B (2nd)
  assert.strictEqual(innings[0].battingPlayerId, 'teamA', 'Innings 1: Team A 1st Innings');
  assert.strictEqual(innings[1].battingPlayerId, 'teamB', 'Innings 2: Team B 1st Innings');
  assert.strictEqual(innings[2].battingPlayerId, 'teamA', 'Innings 3: Team A 2nd Innings');
  assert.strictEqual(innings[3].battingPlayerId, 'teamB', 'Innings 4: Team B 2nd Innings');

  return {
    matchId: `test_match_${Date.now()}_${Math.random()}`,
    roomId: 'r_test',
    roomCode: 'TEST99',
    hostId: 'teamA',
    config,
    phase: 'BALL_SELECTION',
    players: [
      { playerId: 'teamA', name: 'Team A', country: 'BD', jerseyNumber: 1, avatar: '🏏', isAI: false, isReady: true, isOnline: true, seatIndex: 0 },
      { playerId: 'teamB', name: 'Team B', country: 'BD', jerseyNumber: 2, avatar: '🔥', isAI: false, isReady: true, isOnline: true, seatIndex: 1 },
    ],
    toss: lockedToss,
    currentInningsIndex: 0,
    innings,
    currentBallNumber: 1,
    currentBallId: 'tb1',
    pendingSubmissions: {},
    rematchVotes: [],
    createdAt: Date.now(),
  };
}

function playInningsToScoreAndAllOut(match: HandCricketMatchState, desiredSixes: number, extraRuns = 0) {
  const innNum = match.currentInningsIndex + 1;
  let ballSeq = 1;
  for (let i = 0; i < desiredSixes; i++) {
    HandCricketEngine.processBallOnMatch(match, {
      ballId: `inn${innNum}_six_${ballSeq++}`,
      batterChoice: 6,
      bowlerChoice: 1,
    });
  }
  if (extraRuns > 0 && extraRuns <= 6) {
    HandCricketEngine.processBallOnMatch(match, {
      ballId: `inn${innNum}_ext_${ballSeq++}`,
      batterChoice: extraRuns as 1 | 2 | 3 | 4 | 5 | 6,
      bowlerChoice: extraRuns === 1 ? 2 : 1,
    });
  }
  // Lose all 10 wickets
  for (let w = 0; w < 10; w++) {
    HandCricketEngine.processBallOnMatch(match, {
      ballId: `inn${innNum}_w_${ballSeq++}`,
      batterChoice: 3,
      bowlerChoice: 3,
    });
  }
}

// 3.1 Test Match Target Calculation & Immediate Victory in 4th Innings
// Prompt Example: A1 = 42, B1 = 35, A2 = 28 -> Target = 42 + 28 - 35 + 1 = 36
{
  const testMatch = createTestMatchFixture();

  // Innings 1 (Team A): 7 sixes = 42 runs (also > 6 balls so proves no 1-over limit; let's bowl 17 balls total)
  playInningsToScoreAndAllOut(testMatch, 7, 0); // 42/10 in 17 balls (2.5 overs)
  assert.strictEqual(testMatch.innings[0].runs, 42);
  assert.strictEqual(testMatch.innings[0].wickets, 10);
  assert.strictEqual(testMatch.innings[0].isCompleted, true);

  // Innings 2 (Team B): 5 sixes + 5 = 35 runs
  HandCricketEngine.advanceToNextInnings(testMatch);
  playInningsToScoreAndAllOut(testMatch, 5, 5); // 35/10
  assert.strictEqual(testMatch.innings[1].runs, 35);

  // Innings 3 (Team A 2nd): 4 sixes + 4 = 28 runs
  HandCricketEngine.advanceToNextInnings(testMatch);
  playInningsToScoreAndAllOut(testMatch, 4, 4); // 28/10
  assert.strictEqual(testMatch.innings[2].runs, 28);

  // Advance to 4th Innings (Team B 2nd)
  HandCricketEngine.advanceToNextInnings(testMatch);
  assert.strictEqual(testMatch.currentInningsIndex, 3, 'Now in 4th innings');
  assert.strictEqual(
    testMatch.innings[3].target,
    36,
    'Fourth-innings target is A1(42) + A2(28) - B1(35) + 1 = 36'
  );

  // Team B scores 6 sixes = 36 runs without losing all 10 wickets -> immediate victory!
  for (let b = 1; b <= 5; b++) {
    const step = HandCricketEngine.processBallOnMatch(testMatch, {
      ballId: `inn4_chase_${b}`,
      batterChoice: 6,
      bowlerChoice: 2,
    });
    assert.strictEqual(step.matchCompleted, false);
  }
  const winningBall = HandCricketEngine.processBallOnMatch(testMatch, {
    ballId: 'inn4_chase_6',
    batterChoice: 6,
    bowlerChoice: 1,
  });
  assert.strictEqual(winningBall.matchCompleted, true, 'Test match ends immediately when 4th innings target is reached');
  assert.strictEqual(testMatch.result?.winnerPlayerId, 'teamB', 'Team B wins by chasing target 36');
  assert.strictEqual(testMatch.result?.teamAScoreAggregate, 70, 'Team A aggregate = 42 + 28 = 70');
  assert.strictEqual(testMatch.result?.teamBScoreAggregate, 71, 'Team B aggregate = 35 + 36 = 71');
}

// 3.2 All 10 wickets lost before target in 4th innings -> Defeat (Team A wins)
{
  const testMatch = createTestMatchFixture();
  playInningsToScoreAndAllOut(testMatch, 5, 0); // A1 = 30
  HandCricketEngine.advanceToNextInnings(testMatch);
  playInningsToScoreAndAllOut(testMatch, 3, 0); // B1 = 18
  HandCricketEngine.advanceToNextInnings(testMatch);
  playInningsToScoreAndAllOut(testMatch, 4, 0); // A2 = 24 (Team A agg = 54)
  HandCricketEngine.advanceToNextInnings(testMatch);
  // Target for B2 = 54 - 18 + 1 = 37
  assert.strictEqual(testMatch.innings[3].target, 37);

  // Team B scores only 24 (B agg = 42) and loses all 10 wickets
  playInningsToScoreAndAllOut(testMatch, 4, 0);
  assert.strictEqual(testMatch.phase, 'MATCH_COMPLETE');
  assert.strictEqual(testMatch.result?.winnerPlayerId, 'teamA', 'Team A wins when Team B is all out before target');
  assert.strictEqual(testMatch.result?.teamAScoreAggregate, 54);
  assert.strictEqual(testMatch.result?.teamBScoreAggregate, 42);
}

// 3.3 Equal aggregate scores in Test Match -> TIE
{
  const testMatch = createTestMatchFixture();
  playInningsToScoreAndAllOut(testMatch, 4, 0); // A1 = 24
  HandCricketEngine.advanceToNextInnings(testMatch);
  playInningsToScoreAndAllOut(testMatch, 3, 0); // B1 = 18
  HandCricketEngine.advanceToNextInnings(testMatch);
  playInningsToScoreAndAllOut(testMatch, 2, 0); // A2 = 12 (A agg = 36)
  HandCricketEngine.advanceToNextInnings(testMatch);
  // B needs 36 - 18 + 1 = 19 to win; if B scores 18 (3 sixes) and is all out -> B agg = 36 -> TIE!
  playInningsToScoreAndAllOut(testMatch, 3, 0);
  assert.strictEqual(testMatch.result?.outcome, 'TIE', 'Equal aggregate scores (36 vs 36) produce a Test Match TIE');
}

// ============================================================================
// 4. MULTIPLAYER & ANTI-CHEAT TESTS
// ============================================================================
console.log('4. Verifying Multiplayer Synchronization, Anti-Cheat, Timeout & Safe Reconnection...');

const gameStatsFilePath = path.resolve(process.cwd(), 'game-stats.json');
const originalGameStatsRaw = fs.existsSync(gameStatsFilePath)
  ? fs.readFileSync(gameStatsFilePath, 'utf-8')
  : null;

const manager = new HandCricketManager(false); // In-memory test manager
const baselineGlobalStats = gameStatsManager.getAllStats().handcricket;
const basePlays = baselineGlobalStats.totalPlays;
const baseUnique = baselineGlobalStats.totalUniquePlayers;

const p1Id = `guest_mp_test_p1_${Date.now()}`;
const p2Id = `guest_mp_test_p2_${Date.now()}`;

// 4.1 Room creation and joining do NOT increment Global KhelGhor totalPlays
const createdRoom = manager.createMatchOrRoom({
  playerId: p1Id,
  name: 'Player One',
  country: 'Bangladesh',
  jerseyNumber: 10,
  avatar: '🏏',
  mode: 'multiplayer_room',
  format: 'custom_match',
  overs: 1,
  wicketsPerInnings: 1,
});

assert.strictEqual(
  gameStatsManager.getAllStats().handcricket.totalPlays,
  basePlays,
  'Creating a multiplayer waiting room does NOT increment totalPlays'
);

const joinedRoom = manager.joinRoom(createdRoom.roomCode, {
  playerId: p2Id,
  name: 'Player Two',
  country: 'Bangladesh',
  jerseyNumber: 20,
  avatar: '⚡',
});
assert.strictEqual(joinedRoom.success, true, 'Player 2 joins room via roomCode');
assert.strictEqual(
  gameStatsManager.getAllStats().handcricket.totalPlays,
  basePlays,
  'Joining a waiting room does NOT increment totalPlays'
);

// 4.2 Starting the multiplayer match increments totalPlays by 1 and adds 2 unique players
const startedMatch = manager.startMultiplayerMatch(createdRoom.roomId, p1Id);
assert.strictEqual(startedMatch.success, true, 'Host starts multiplayer match');

const afterStartGlobalStats = gameStatsManager.getAllStats().handcricket;
assert.strictEqual(
  afterStartGlobalStats.totalPlays,
  basePlays + 1,
  'Starting 1 multiplayer match increments totalPlays by 1'
);
assert.strictEqual(
  afterStartGlobalStats.totalUniquePlayers,
  baseUnique + 2,
  'Two new multiplayer participants count as 2 unique players'
);

// 4.3 Toss locks after confirmation
const tossCallRes = manager.performTossCall(createdRoom.roomId, p1Id, 'HEADS', 'HEADS');
assert.strictEqual(tossCallRes.success, true);
assert.strictEqual(tossCallRes.state?.toss.winnerId, p1Id);

// Non-winner cannot make toss decision
const illegalTossDec = manager.confirmTossDecision(createdRoom.roomId, p2Id, 'BAT_FIRST');
assert.strictEqual(illegalTossDec.success, false, 'Non-winner cannot choose Bat/Bowl');

// Winner confirms BAT_FIRST
const validTossDec = manager.confirmTossDecision(createdRoom.roomId, p1Id, 'BAT_FIRST');
assert.strictEqual(validTossDec.success, true);

// Toss winner cannot change decision after confirmation
const duplicateTossDec = manager.confirmTossDecision(createdRoom.roomId, p1Id, 'BOWL_FIRST');
assert.strictEqual(duplicateTossDec.success, false, 'Toss decision is locked after confirmation');

// 4.4 Anti-Cheat: Opponent selection remains hidden before simultaneous reveal
const ball1Id = validTossDec.state!.currentBallId;
const p1Sub = manager.submitBallChoice(createdRoom.roomId, p1Id, {
  number: 6,
  gestureId: '6A',
  ballId: ball1Id,
});
assert.strictEqual(p1Sub.success, true);

// Check p2's client state BEFORE p2 submits:
const p2ViewBeforeReveal = manager.getClientState(createdRoom.roomId, p2Id)!;
assert.strictEqual(p2ViewBeforeReveal.phase, 'BALL_SELECTION', 'Still in BALL_SELECTION');
assert.strictEqual(p2ViewBeforeReveal.opponentLocked, true, 'p2 sees that p1 has locked selection');
assert.strictEqual(p2ViewBeforeReveal.mySubmittedSelection, undefined, 'p2 has not submitted yet');
assert.strictEqual(p2ViewBeforeReveal.lastBallEvent, undefined, 'p1 choice is completely hidden from p2 before reveal');

// 4.5 Anti-Cheat: Player 1 cannot submit a second time for the same ball or submit on behalf of unauthorized ID
const duplicateP1Sub = manager.submitBallChoice(createdRoom.roomId, p1Id, {
  number: 4,
  gestureId: '4A',
  ballId: ball1Id,
});
assert.strictEqual(duplicateP1Sub.success, false, 'A player cannot submit twice for the same ball');

const unauthorizedSub = manager.submitBallChoice(createdRoom.roomId, 'hacker_id', {
  number: 6,
  ballId: ball1Id,
});
assert.strictEqual(unauthorizedSub.success, false, 'Unauthorized player cannot submit in room');

// 4.6 Simultaneous Reveal when Player 2 submits (including Same Number + Different Variation = NOT OUT)
const invalidGestureSub = manager.submitBallChoice(createdRoom.roomId, p2Id, {
  gestureId: '9Z' as any,
  ballId: ball1Id,
});
assert.strictEqual(invalidGestureSub.success, false, 'Invalid gesture variation ID is rejected');

const mismatchedSub = manager.submitBallChoice(createdRoom.roomId, p2Id, {
  number: 2,
  gestureId: '6A',
  ballId: ball1Id,
});
assert.strictEqual(mismatchedSub.success, false, 'Mismatched number and gestureId is rejected');

// Player 1 submitted 6A; Player 2 submits 6C (same number 6, different variation A vs C -> NOT OUT, 6 runs!)
const p2Sub = manager.submitBallChoice(createdRoom.roomId, p2Id, {
  number: 6,
  gestureId: '6C',
  ballId: ball1Id,
});
assert.strictEqual(p2Sub.success, true);
const p1ViewAtReveal = manager.getClientState(createdRoom.roomId, p1Id)!;
const p2ViewAtReveal = manager.getClientState(createdRoom.roomId, p2Id)!;
assert.strictEqual(p1ViewAtReveal.phase, 'BALL_REVEAL', 'Both players transition to BALL_REVEAL simultaneously');
assert.strictEqual(p2ViewAtReveal.phase, 'BALL_REVEAL');
assert.strictEqual(p1ViewAtReveal.lastBallEvent?.batterGestureId, '6A');
assert.strictEqual(p1ViewAtReveal.lastBallEvent?.bowlerGestureId, '6C');
assert.strictEqual(p1ViewAtReveal.lastBallEvent?.isWicket, false, '6A vs 6C in multiplayer is NOT OUT');
assert.strictEqual(p2ViewAtReveal.lastBallEvent?.isWicket, false, 'Both clients see identical NOT OUT result');
assert.strictEqual(p1ViewAtReveal.lastBallEvent?.runsScored, 6, 'Batter scores 6 runs on 6A vs 6C');

// 4.7 Stale ballId cannot be processed twice
manager.advanceAfterRevealOrBreak(createdRoom.roomId, p1Id);
const staleBallAttempt = manager.submitBallChoice(createdRoom.roomId, p1Id, {
  number: 4,
  ballId: ball1Id, // old ballId!
});
assert.strictEqual(staleBallAttempt.success, false, 'Stale ballId is rejected so a ball is never processed twice');

// 4.8 Timeout generates a server-side random number (1..6) and does NOT auto-declare OUT
const timeoutRes = manager.resolveBallTimeout(createdRoom.roomId);
assert.strictEqual(timeoutRes.ballResolved, true, 'Timeout resolves ball with server-generated random numbers 1..6');
const afterTimeoutState = manager.getClientState(createdRoom.roomId, p1Id)!;
assert.ok(
  afterTimeoutState.lastBallEvent!.batterNumber >= 1 &&
    afterTimeoutState.lastBallEvent!.batterNumber <= 6,
  'Timed-out batter gets random 1..6'
);
assert.strictEqual(afterTimeoutState.lastBallEvent?.batterTimedOut, true, 'Batter marked timedOut: true');
assert.strictEqual(afterTimeoutState.lastBallEvent?.bowlerTimedOut, true, 'Bowler marked timedOut: true');

// 4.9 Safe Disconnection & Reconnection without duplicating balls or inflating Global Plays
manager.leaveRoom(createdRoom.roomId, p2Id);
assert.strictEqual(
  manager.getClientState(createdRoom.roomId, p1Id)?.players.find((p) => p.playerId === p2Id)?.isOnline,
  false,
  'Disconnected player marked offline'
);

const reconnectRes = manager.joinRoom(createdRoom.roomCode, { playerId: p2Id });
assert.strictEqual(reconnectRes.success, true, 'Disconnected player reconnects safely');
assert.strictEqual(reconnectRes.reconnected, true, 'Flagged as safe reconnection');
assert.strictEqual(
  gameStatsManager.getAllStats().handcricket.totalPlays,
  basePlays + 1,
  'Reconnection does NOT increment Global KhelGhor totalPlays'
);

// ============================================================================
// 5. CAREER MODE, SEPARATE STAT BUCKETS & MULTIPLAYER LEADERBOARD TESTS
// ============================================================================
console.log('5. Verifying Career Mode (AI vs Multiplayer vs Overall), Achievements & Leaderboard...');

const careerPlayerId = `guest_career_hero_${Date.now()}`;
const aiRoom = manager.createMatchOrRoom({
  playerId: careerPlayerId,
  name: 'Career Hero',
  country: 'Bangladesh',
  jerseyNumber: 75,
  avatar: '👑',
  mode: 'ai_single_player',
  format: 'custom_match',
  overs: 5,
  wicketsPerInnings: 3,
  aiDifficulty: 'medium',
});

// Verify AI match incremented Global KhelGhor totalPlays by 1 and added only 1 human unique player (AI bot excluded)
const statsAfterAiStart = gameStatsManager.getAllStats().handcricket;
assert.strictEqual(statsAfterAiStart.totalPlays, basePlays + 2, 'AI match increments totalPlays by 1');
assert.strictEqual(
  statsAfterAiStart.totalUniquePlayers,
  baseUnique + 3,
  'Only the human player is added to Unique Players (AI bot is excluded)'
);

// Complete an AI match where careerPlayerId scores 54 runs (9 sixes) and takes a Hat-Trick (3 consecutive wickets)
const aiRoomInternal = manager.getRoom(aiRoom.roomId)!;
const aiMatch = aiRoomInternal.state;
const aiToss = HandCricketEngine.resolveTossCall(careerPlayerId, 'ai_bot_medium', 'HEADS', 'HEADS');
const { toss: aiLockedToss, innings: aiInnings } = HandCricketEngine.applyTossDecision(
  aiToss,
  [careerPlayerId, 'ai_bot_medium'],
  'BAT_FIRST',
  aiMatch.config
);
aiMatch.toss = aiLockedToss;
aiMatch.innings = aiInnings;
aiMatch.phase = 'BALL_SELECTION';

// Innings 1: Human scores 9 sixes (54 runs), then 3 wickets to end innings
for (let i = 1; i <= 9; i++) {
  HandCricketEngine.processBallOnMatch(aiMatch, {
    ballId: `ai_i1_s_${i}`,
    batterChoice: 6,
    bowlerChoice: 1,
  });
}
for (let w = 1; w <= 3; w++) {
  HandCricketEngine.processBallOnMatch(aiMatch, {
    ballId: `ai_i1_w_${w}`,
    batterChoice: 2,
    bowlerChoice: 2,
  });
}
HandCricketEngine.advanceToNextInnings(aiMatch);

// Innings 2: Human bowls 3 consecutive wickets (Hat-Trick!) to win the match 54 vs 0
HandCricketEngine.processBallOnMatch(aiMatch, { ballId: 'ai_i2_w1', batterChoice: 4, bowlerChoice: 4 });
HandCricketEngine.processBallOnMatch(aiMatch, { ballId: 'ai_i2_w2', batterChoice: 5, bowlerChoice: 5 });
const aiFinalBall = HandCricketEngine.processBallOnMatch(aiMatch, {
  ballId: 'ai_i2_w3',
  batterChoice: 1,
  bowlerChoice: 1,
});
assert.strictEqual(aiFinalBall.matchCompleted, true);
aiMatch.phase = 'MATCH_COMPLETE';

const reward1 = manager.recordCompletedMatchForPlayer(aiMatch, careerPlayerId)!;
assert.ok(reward1.xpEarned > 0, 'XP awarded for completed AI match');

const careerDataAfterAi = manager.getOrCreateCareer(careerPlayerId);
// 5.1 AI stats updated, Multiplayer stats untouched, Overall matches AI
assert.strictEqual(careerDataAfterAi.ai.totalMatches, 1, 'AI Career matches = 1');
assert.strictEqual(careerDataAfterAi.ai.totalRuns, 54, 'AI Career runs = 54');
assert.strictEqual(careerDataAfterAi.ai.hatTricks, 1, 'AI Career hat-tricks = 1');
assert.strictEqual(careerDataAfterAi.multiplayer.totalMatches, 0, 'Multiplayer Career matches = 0 (strict separation)');
assert.strictEqual(careerDataAfterAi.overall.totalMatches, 1, 'Overall Career matches = 1');
assert.strictEqual(careerDataAfterAi.overall.totalRuns, 54, 'Overall Career runs = 54');

// 5.2 Achievements unlocked accurately
assert.ok(careerDataAfterAi.unlockedAchievements['first_match'], 'Unlocked First Match achievement');
assert.ok(careerDataAfterAi.unlockedAchievements['first_win'], 'Unlocked First Win achievement');
assert.ok(careerDataAfterAi.unlockedAchievements['half_century'], 'Unlocked Half-Century Hero achievement');
assert.ok(careerDataAfterAi.unlockedAchievements['hat_trick'], 'Unlocked Hat-Trick Bowler achievement');
assert.strictEqual(careerDataAfterAi.unlockedAchievements['runs_100'], undefined, '100 runs achievement NOT unlocked at 54 runs');

// 5.3 Idempotency: Re-recording the same matchId does NOT double-count stats or XP
const xpBeforeDuplicate = careerDataAfterAi.xp;
const duplicateReward = manager.recordCompletedMatchForPlayer(aiMatch, careerPlayerId)!;
assert.strictEqual(duplicateReward.xpEarned, 0, 'Duplicate match recording awards 0 XP');
assert.strictEqual(manager.getOrCreateCareer(careerPlayerId).xp, xpBeforeDuplicate, 'XP unchanged on duplicate call');
assert.strictEqual(manager.getOrCreateCareer(careerPlayerId).overall.totalMatches, 1, 'Total matches unchanged on duplicate call');

// 5.4 Multiplayer Leaderboard strictly excludes AI-only players
const leaderboardBeforeMp = manager.getMultiplayerLeaderboard('wins');
assert.strictEqual(
  leaderboardBeforeMp.some((entry) => entry.playerId === careerPlayerId),
  false,
  'Player with only AI matches is strictly excluded from the Multiplayer Leaderboard'
);

// 5.5 Now complete a real Multiplayer match for careerPlayerId vs p2Id and verify both buckets + Leaderboard inclusion
const mpRoom2 = manager.createMatchOrRoom({
  playerId: careerPlayerId,
  mode: 'multiplayer_room',
  format: 'custom_match',
  overs: 2,
  wicketsPerInnings: 1,
});
manager.joinRoom(mpRoom2.roomCode, { playerId: p2Id });
manager.startMultiplayerMatch(mpRoom2.roomId, careerPlayerId);

// Repeated match by existing players (careerPlayerId & p2Id) increments totalPlays by 1, but totalUniquePlayers by 0!
const statsAfterRepeatPlayers = gameStatsManager.getAllStats().handcricket;
assert.strictEqual(statsAfterRepeatPlayers.totalPlays, basePlays + 3, 'New match increments totalPlays');
assert.strictEqual(
  statsAfterRepeatPlayers.totalUniquePlayers,
  baseUnique + 3,
  'Repeated matches by already-known players do NOT inflate totalUniquePlayers'
);

// Play out mpRoom2 match: careerPlayerId scores 6, then out; p2Id out for 0
manager.performTossCall(mpRoom2.roomId, careerPlayerId, 'HEADS', 'HEADS');
manager.confirmTossDecision(mpRoom2.roomId, careerPlayerId, 'BAT_FIRST');

let bId = manager.getClientState(mpRoom2.roomId, careerPlayerId)!.currentBallId;
manager.submitBallChoice(mpRoom2.roomId, careerPlayerId, { number: 6, ballId: bId });
manager.submitBallChoice(mpRoom2.roomId, p2Id, { number: 2, ballId: bId });
manager.advanceAfterRevealOrBreak(mpRoom2.roomId, careerPlayerId);

bId = manager.getClientState(mpRoom2.roomId, careerPlayerId)!.currentBallId;
manager.submitBallChoice(mpRoom2.roomId, careerPlayerId, { number: 3, ballId: bId });
manager.submitBallChoice(mpRoom2.roomId, p2Id, { number: 3, ballId: bId }); // Out, Innings 1 over
manager.advanceAfterRevealOrBreak(mpRoom2.roomId, careerPlayerId); // To INNINGS_BREAK
manager.advanceAfterRevealOrBreak(mpRoom2.roomId, careerPlayerId); // Start Innings 2

bId = manager.getClientState(mpRoom2.roomId, careerPlayerId)!.currentBallId;
manager.submitBallChoice(mpRoom2.roomId, p2Id, { number: 4, ballId: bId });
manager.submitBallChoice(mpRoom2.roomId, careerPlayerId, { number: 4, ballId: bId }); // Out, Match complete!

const careerDataAfterMp = manager.getOrCreateCareer(careerPlayerId);
assert.strictEqual(careerDataAfterMp.ai.totalMatches, 1, 'AI Career remains 1 match');
assert.strictEqual(careerDataAfterMp.multiplayer.totalMatches, 1, 'Multiplayer Career is now 1 match');
assert.strictEqual(careerDataAfterMp.multiplayer.totalRuns, 6, 'Multiplayer Career runs = 6');
assert.strictEqual(careerDataAfterMp.overall.totalMatches, 2, 'Overall Career combines AI(1) + MP(1) = 2');
assert.strictEqual(careerDataAfterMp.overall.totalRuns, 60, 'Overall Career combines AI(54) + MP(6) = 60');

const leaderboardAfterMp = manager.getMultiplayerLeaderboard('wins');
const heroLbEntry = leaderboardAfterMp.find((entry) => entry.playerId === careerPlayerId);
assert.ok(heroLbEntry, 'Player with verified Multiplayer match appears on Multiplayer Leaderboard');
assert.strictEqual(heroLbEntry.multiplayerRuns, 6, 'Leaderboard shows ONLY multiplayer runs (6), never AI runs (54)');

// 5.6 AI strategy independence check
const aiMove = HandCricketAI.selectMove({
  aiPlayerId: 'ai_bot_hard',
  role: 'BOWLER',
  difficulty: 'hard',
  currentInnings: aiMatch.innings[0],
  allInnings: aiMatch.innings,
});
assert.ok(aiMove.number >= 1 && aiMove.number <= 6, 'AI selects valid number 1..6 from public history only');

// 5.7 Verify AI Toss Winner visibility & Human Turn Control (AI never auto-plays human's role)
const aiHumanControlRoom = manager.createMatchOrRoom({
  playerId: careerPlayerId,
  mode: 'ai_single_player',
  format: 'limited_overs',
  overs: 2,
  wicketsPerInnings: 2,
  aiDifficulty: 'hard',
});
// Force AI to win toss (caller calls HEADS, coin lands TAILS)
const aiWonTossRes = manager.performTossCall(
  aiHumanControlRoom.roomId,
  careerPlayerId,
  'HEADS',
  'TAILS'
);
assert.strictEqual(aiWonTossRes.success, true);
assert.strictEqual(
  aiWonTossRes.state?.phase,
  'TOSS_DECISION',
  'When AI wins toss, phase stays in TOSS_DECISION so human sees winner and AI choice'
);
assert.ok(aiWonTossRes.state?.toss.decision, 'AI pre-selects its toss decision');

// Human acknowledges/starts match after seeing AI's toss win
const startAfterAiToss = manager.confirmTossDecision(
  aiHumanControlRoom.roomId,
  careerPlayerId,
  aiWonTossRes.state!.toss.decision!
);
assert.strictEqual(startAfterAiToss.success, true);
assert.strictEqual(startAfterAiToss.state?.phase, 'BALL_SELECTION');
assert.strictEqual(
  startAfterAiToss.state?.ballDeadline,
  undefined,
  'In AI Single Player mode, ballDeadline is undefined so the server never auto-plays the human turn'
);

// Restore clean game-stats.json after test verification
if (originalGameStatsRaw !== null) {
  fs.writeFileSync(gameStatsFilePath, originalGameStatsRaw, 'utf-8');
}

console.log('✅ All Hand Cricket Engine, Test Match, Multiplayer Anti-Cheat, Career Mode & Global Stats tests passed!');
