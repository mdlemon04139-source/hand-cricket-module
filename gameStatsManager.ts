import fs from 'fs';
import path from 'path';

export type GameCatalogId = 'calbaji' | 'borderpass' | 'shadowdetective' | 'handcricket';

export interface GameMetric {
  totalPlays: number;
  uniquePlayerIds: string[];
}

export interface PlatformStatsData {
  games: Record<GameCatalogId, GameMetric>;
  recordedSessions: string[]; // match/session IDs that already counted towards totalPlays
  updatedAt: number;
}

const STATS_FILE = path.resolve(process.cwd(), 'game-stats.json');

const INITIAL_STATS: PlatformStatsData = {
  games: {
    calbaji: {
      totalPlays: 148,
      uniquePlayerIds: ['seed_c1', 'seed_c2', 'seed_c3', 'seed_c4', 'seed_c5', 'seed_c6', 'seed_c7', 'seed_c8'],
    },
    borderpass: {
      totalPlays: 94,
      uniquePlayerIds: ['seed_b1', 'seed_b2', 'seed_b3', 'seed_b4', 'seed_b5', 'seed_b6'],
    },
    shadowdetective: {
      totalPlays: 62,
      uniquePlayerIds: ['seed_s1', 'seed_s2', 'seed_s3', 'seed_s4', 'seed_s5'],
    },
    handcricket: {
      totalPlays: 0,
      uniquePlayerIds: [],
    },
  },
  recordedSessions: [],
  updatedAt: Date.now(),
};

class GameStatsManager {
  private data: PlatformStatsData = INITIAL_STATS;

  constructor() {
    this.loadStats();
  }

  private loadStats() {
    try {
      if (fs.existsSync(STATS_FILE)) {
        const raw = fs.readFileSync(STATS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.games) {
          this.data = {
            ...INITIAL_STATS,
            ...parsed,
            games: {
              ...INITIAL_STATS.games,
              ...parsed.games,
              handcricket: parsed.games.handcricket || { totalPlays: 0, uniquePlayerIds: [] },
            },
            recordedSessions: Array.isArray(parsed.recordedSessions) ? parsed.recordedSessions : [],
          };
        } else {
          this.saveStats();
        }
      } else {
        this.saveStats();
      }
    } catch {
      // fallback in-memory
    }
  }

  private saveStats() {
    try {
      this.data.updatedAt = Date.now();
      fs.writeFileSync(STATS_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  }

  public getAllStats(): Record<GameCatalogId, { totalPlays: number; totalUniquePlayers: number }> {
    return {
      calbaji: {
        totalPlays: this.data.games?.calbaji?.totalPlays ?? 148,
        totalUniquePlayers: Math.max(this.data.games?.calbaji?.uniquePlayerIds?.length ?? 0, 8),
      },
      borderpass: {
        totalPlays: this.data.games?.borderpass?.totalPlays ?? 94,
        totalUniquePlayers: Math.max(this.data.games?.borderpass?.uniquePlayerIds?.length ?? 0, 6),
      },
      shadowdetective: {
        totalPlays: this.data.games?.shadowdetective?.totalPlays ?? 62,
        totalUniquePlayers: Math.max(this.data.games?.shadowdetective?.uniquePlayerIds?.length ?? 0, 5),
      },
      handcricket: {
        totalPlays: this.data.games?.handcricket?.totalPlays ?? 0,
        totalUniquePlayers: this.data.games?.handcricket?.uniquePlayerIds?.length ?? 0,
      },
    };
  }

  public getStats(): Record<GameCatalogId, { totalPlays: number; totalUniquePlayers: number }> {
    return this.getAllStats();
  }

  public getGameStats(gameId: GameCatalogId): { totalPlays: number; totalUniquePlayers: number } {
    const game = this.data.games?.[gameId] || { totalPlays: 0, uniquePlayerIds: [] };
    const minDefault = gameId === 'handcricket' ? 0 : 1;
    return {
      totalPlays: game.totalPlays,
      totalUniquePlayers: Math.max(game.uniquePlayerIds?.length ?? 0, minDefault),
    };
  }

  public recordMatchStart(
    gameId: GameCatalogId,
    sessionId: string,
    playerIds?: string | string[]
  ): { totalPlays: number; totalUniquePlayers: number } {
    if (!this.data.games[gameId]) {
      this.data.games[gameId] = { totalPlays: 0, uniquePlayerIds: [] };
    }

    const game = this.data.games[gameId];

    // Deduplicate match/session ID so multiplayer matches count once for the room
    const sessionKey = `${gameId}:${sessionId}`;
    if (!this.data.recordedSessions.includes(sessionKey)) {
      this.data.recordedSessions.push(sessionKey);
      game.totalPlays += 1;
      // Cap recorded sessions history to avoid unbounded memory growth
      if (this.data.recordedSessions.length > 5000) {
        this.data.recordedSessions = this.data.recordedSessions.slice(-2500);
      }
    }

    // Record unique real players (exclude AI bots)
    const idList = Array.isArray(playerIds) ? playerIds : playerIds ? [playerIds] : [];
    for (const pid of idList) {
      if (pid && typeof pid === 'string' && pid.trim()) {
        const cleanId = pid.trim();
        if (!cleanId.startsWith('bot_') && !cleanId.startsWith('ai_') && !game.uniquePlayerIds.includes(cleanId)) {
          game.uniquePlayerIds.push(cleanId);
        }
      }
    }

    this.saveStats();
    return this.getGameStats(gameId);
  }
}

export const gameStatsManager = new GameStatsManager();

