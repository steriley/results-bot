import { atom } from 'nanostores';
import type { GameweekDateRange } from '@/helpers/game-week-date-range';
import type { GameweekFixture } from '@/types/gameweek';
import { $gameweek } from './gameweek';

type GameweekData = {
  fixtures: GameweekFixture[];
  dateRange: GameweekDateRange;
};

export const $gameweekData = atom<GameweekData>({
  fixtures: [],
  dateRange: { start: '', end: '' },
});
export const $loading = atom(false);
export const $error = atom<string | null>(null);

// --- Session-persistent cache ---
const CACHE_KEY = 'gameweekCache_v1';
let cache: Map<number, GameweekData> = new Map();

const getGameWeekData = async (gw: number) => {
  if (!gw) return;

  // Check cache (in-memory/session)
  if (cache.has(gw)) {
    const cached = cache.get(gw);
    if (cached) $gameweekData.set(cached);
    return;
  }

  try {
    $loading.set(true);
    $error.set(null);

    const data = await fetchGameweekData(gw);
    cache.set(gw, data);
    persistCache();
    $gameweekData.set(data);
  } catch (err) {
    $error.set((err as Error).message);
  } finally {
    $loading.set(false);
  }
};

// Load cache from sessionStorage on init
const raw = typeof window !== 'undefined' ? sessionStorage.getItem(CACHE_KEY) : null;
if (raw) {
  try {
    const obj = JSON.parse(raw) as Record<string, GameweekData>;
    cache = new Map(Object.entries(obj).map(([k, v]) => [Number(k), v]));
    getGameWeekData($gameweek.value);
  } catch (_e) {
    // Ignore parse errors, start with empty cache
    cache = new Map();
  }
}

function persistCache() {
  if (typeof window === 'undefined') return;
  // Convert Map to object for storage
  const obj: Record<string, GameweekData> = {};
  for (const [k, v] of cache.entries()) obj[k] = v;
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(obj));
}

async function fetchGameweekData(gw: number): Promise<GameweekData> {
  const res = await fetch(`/api/fixtures?gameweek=${gw}`);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

$gameweek.listen(getGameWeekData);
