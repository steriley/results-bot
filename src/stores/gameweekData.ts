import { atom } from 'nanostores';
import type { GameweekFixture } from '@/helpers/gameweek';
import { $gameweek } from './gameweek';

// You can refine this type if you have more specific types for fixtures/stats
type GameweekData = {
  fixtures: GameweekFixture[];
  gameweekDateRange: { earliest: string; latest: string };
};

export const $gameweekData = atom<GameweekData | null>(null);
export const $loading = atom(false);
export const $error = atom<string | null>(null);

// --- Session-persistent cache ---
const CACHE_KEY = 'gameweekDataCache';
let cache: Map<number, GameweekData> = new Map();

// Load cache from sessionStorage on init
const raw =
  typeof window !== 'undefined' ? sessionStorage.getItem(CACHE_KEY) : null;
if (raw) {
  try {
    const obj = JSON.parse(raw) as Record<string, GameweekData>;
    cache = new Map(Object.entries(obj).map(([k, v]) => [Number(k), v]));
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

$gameweek.listen(async (gw) => {
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
});
