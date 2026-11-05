import type { SaveData } from './save';

/** Per-run ledger: settlements can be called repeatedly, including after endless mode. */
export class RunRewards {
  private chipsPaid = 0;
  private victoryRecorded = false;

  settle(earned: number, victoryAchieved: boolean) {
    const chips = Math.max(0, earned - this.chipsPaid);
    this.chipsPaid = Math.max(this.chipsPaid, earned);
    const victory = victoryAchieved && !this.victoryRecorded;
    if (victory) this.victoryRecorded = true;
    return { chips, victory };
  }
}

export function applyRunRewards(save: SaveData, mapId: string, wavesCleared: number, reward: { chips: number; victory: boolean }): SaveData {
  return {
    ...save,
    chips: save.chips + reward.chips,
    best: { ...save.best, [mapId]: Math.max(save.best[mapId] ?? 0, wavesCleared) },
    wins: reward.victory ? { ...save.wins, [mapId]: (save.wins[mapId] ?? 0) + 1 } : save.wins,
  };
}
