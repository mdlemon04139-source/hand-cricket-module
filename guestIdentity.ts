const PLAYER_ID_STORAGE_KEY = 'khelghor_hc_player_id_v1';

/**
 * Retrieves or generates a cryptographically random, persistent guest playerId.
 * A nickname is NEVER used as a player ID.
 */
export function getPersistentGuestPlayerId(): string {
  try {
    const existing = localStorage.getItem(PLAYER_ID_STORAGE_KEY);
    if (existing && existing.trim().length >= 10) {
      return existing.trim();
    }
  } catch {
    // ignore storage errors
  }

  let newId: string;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    newId = `hc_usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  } else {
    newId = `hc_usr_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .substring(2, 10)}`;
  }

  try {
    localStorage.setItem(PLAYER_ID_STORAGE_KEY, newId);
  } catch {
    // ignore storage errors
  }

  return newId;
}
