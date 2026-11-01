import {
  AIDifficulty,
  GestureVariationId,
  HandNumber,
  InningsState,
  TossCall,
  TossDecision,
} from '../types/handCricket';
import {
  getRandomGestureForNumber,
  HAND_NUMBERS,
} from '../handcricket/data/gestureRegistry';

export interface AIDecisionContext {
  aiPlayerId: string;
  role: 'BATTER' | 'BOWLER';
  difficulty: AIDifficulty;
  currentInnings: InningsState;
  allInnings: InningsState[];
}

export class HandCricketAI {
  /**
   * AI chooses a toss call (HEADS or TAILS).
   */
  public static chooseTossCall(): TossCall {
    return Math.random() < 0.5 ? 'HEADS' : 'TAILS';
  }

  /**
   * AI chooses whether to Bat First or Bowl First when winning the toss.
   */
  public static chooseTossDecision(difficulty: AIDifficulty): TossDecision {
    if (difficulty === 'hard') {
      // Strategic preference to bowl first and chase in limited overs, or bat first 45% of the time
      return Math.random() < 0.55 ? 'BOWL_FIRST' : 'BAT_FIRST';
    }
    return Math.random() < 0.5 ? 'BAT_FIRST' : 'BOWL_FIRST';
  }

  /**
   * Selects a HandNumber (1-6) and a matching GestureVariationId using ONLY public ball history.
   * Never accesses the opponent's hidden current-ball selection.
   */
  public static selectMove(context: AIDecisionContext): {
    number: HandNumber;
    gestureId: GestureVariationId;
  } {
    const { role, difficulty, currentInnings } = context;
    const history = currentInnings.ballHistory;

    let chosenNumber: HandNumber;

    if (difficulty === 'easy') {
      chosenNumber = this.selectEasyMove(role, history);
    } else if (difficulty === 'medium') {
      chosenNumber = this.selectMediumMove(role, currentInnings, history);
    } else {
      chosenNumber = this.selectHardMove(role, currentInnings, history);
    }

    const gestureId = getRandomGestureForNumber(chosenNumber);
    return { number: chosenNumber, gestureId };
  }

  private static selectEasyMove(
    role: 'BATTER' | 'BOWLER',
    history: InningsState['ballHistory']
  ): HandNumber {
    if (role === 'BOWLER') {
      // Easy AI Bowler bowls mostly 1, 2, 3, 5 and very rarely 4 or 6 so the human batter can hit boundaries freely!
      const weights: Record<HandNumber, number> = {
        1: 34,
        2: 28,
        3: 20,
        4: 4,
        5: 11,
        6: 3,
      };
      // Avoid picking the human batter's last number so human rarely gets out on consecutive shots
      if (history.length > 0) {
        const lastHumanBat = history[history.length - 1].batterNumber;
        weights[lastHumanBat] = Math.max(1, Math.floor(weights[lastHumanBat] / 3));
      }
      return this.weightedPick(weights);
    } else {
      // Easy AI Batter plays predictable low numbers (mostly 1, 2, 3, 4) so the human bowler can easily take wickets and defend targets
      const weights: Record<HandNumber, number> = {
        1: 30,
        2: 28,
        3: 18,
        4: 12,
        5: 6,
        6: 6,
      };
      // Frequently repeats or stays near its recent numbers so human bowler can read it easily
      if (history.length > 0) {
        const lastAiBat = history[history.length - 1].batterNumber;
        weights[lastAiBat] += 14;
      }
      return this.weightedPick(weights);
    }
  }

  private static selectMediumMove(
    role: 'BATTER' | 'BOWLER',
    innings: InningsState,
    history: InningsState['ballHistory']
  ): HandNumber {
    const recent = history.slice(-5);

    if (role === 'BOWLER') {
      // Medium AI Bowler favors 1-3 and 5, leaving 4 and 6 relatively open for human boundaries
      const weights: Record<HandNumber, number> = {
        1: 25,
        2: 22,
        3: 19,
        4: 10,
        5: 15,
        6: 9,
      };
      // Only slightly increase weight if human batter picked the exact same number 3 times in a row
      if (recent.length >= 3) {
        const b1 = recent[recent.length - 1].batterNumber;
        const b2 = recent[recent.length - 2].batterNumber;
        const b3 = recent[recent.length - 3].batterNumber;
        if (b1 === b2 && b2 === b3) {
          weights[b1] += 8;
        }
      }
      return this.weightedPick(weights);
    } else {
      // Medium AI Batter uses natural batting weights without dodging the human bowler's choices
      const weights: Record<HandNumber, number> = {
        1: 24,
        2: 24,
        3: 18,
        4: 15,
        5: 9,
        6: 10,
      };
      if (innings.target !== null) {
        const runsNeeded = innings.target - innings.runs;
        if (runsNeeded >= 1 && runsNeeded <= 6) {
          weights[runsNeeded as HandNumber] += 6;
        }
      }
      return this.weightedPick(weights);
    }
  }

  private static selectHardMove(
    role: 'BATTER' | 'BOWLER',
    innings: InningsState,
    history: InningsState['ballHistory']
  ): HandNumber {
    const weights: Record<HandNumber, number> = {
      1: 19,
      2: 19,
      3: 18,
      4: 14,
      5: 16,
      6: 14,
    };

    if (role === 'BOWLER') {
      // Mild frequency awareness without unfair sniping
      const recent = history.slice(-6);
      for (const ball of recent) {
        weights[ball.batterNumber] += 2;
      }
      if (recent.length >= 2) {
        const last = recent[recent.length - 1].batterNumber;
        const prev = recent[recent.length - 2].batterNumber;
        if (last === prev) {
          weights[last] += 5;
        }
      }
    } else {
      // AI is BATTER (Hard): balanced batting
      const baseAttack: Record<HandNumber, number> = {
        1: 18,
        2: 20,
        3: 18,
        4: 18,
        5: 12,
        6: 14,
      };
      for (const n of HAND_NUMBERS) {
        weights[n] = baseAttack[n];
      }
      if (innings.target !== null) {
        const needed = innings.target - innings.runs;
        if (needed >= 1 && needed <= 6) {
          weights[needed as HandNumber] += 5;
        }
      }
    }

    return this.weightedPick(weights);
  }

  private static weightedPick(weights: Record<HandNumber, number>): HandNumber {
    let total = 0;
    for (const n of HAND_NUMBERS) {
      total += Math.max(1, weights[n]);
    }
    let roll = Math.random() * total;
    for (const n of HAND_NUMBERS) {
      const w = Math.max(1, weights[n]);
      if (roll < w) {
        return n;
      }
      roll -= w;
    }
    return 1;
  }
}
