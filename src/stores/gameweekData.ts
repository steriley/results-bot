import { atom } from 'nanostores';
import type { GameweekDateRange } from '@/helpers/game-week-date-range';
import type { GameweekFixture } from '@/types/gameweek';
import { $gameweek } from './gameweek';

type GameweekData = {
  fixtures: GameweekFixture[];
  dateRange: GameweekDateRange;
  totalPoints: number | null;
  groupedFixtures: { date: string; fixtures: GameweekFixture[] }[];
};

type CacheEntry = {
  data: GameweekData;
  expiresAt: number;
};

const CACHE_KEY = 'gameweekCache_v1';
const CACHE_TTL_MS = 10 * 60 * 1000;

export const $gameweekData = atom<GameweekData>({
  fixtures: [],
  dateRange: { start: '', end: '' },
  totalPoints: null,
  groupedFixtures: [],
});
export const $loading = atom(false);
export const $error = atom<string | null>(null);

let cache: Map<number, CacheEntry> = new Map();

function isHomepage(): boolean {
  return typeof window !== 'undefined' && window.location.pathname === '/';
}

function loadCacheFromStorage(): Map<number, CacheEntry> {
  if (typeof window === 'undefined' || !isHomepage()) return new Map();

  const raw = sessionStorage.getItem(CACHE_KEY);
  if (!raw) return new Map();

  try {
    const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
    return new Map(Object.entries(parsed).map(([k, v]) => [Number(k), v]));
  } catch {
    return new Map();
  }
}

function persistCache(): void {
  if (typeof window === 'undefined') return;
  const obj: Record<string, CacheEntry> = Object.fromEntries(cache.entries());
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(obj));
}

function getValidCacheEntry(gw: number): GameweekData | null {
  const entry = cache.get(gw);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.data;
}

function setCacheEntry(gw: number, data: GameweekData): void {
  cache.set(gw, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  persistCache();
}

async function fetchGameweekData(gw: number): Promise<GameweekData> {
  const res = await fetch(`/api/fixtures?gameweek=${gw}`);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

const getGameWeekData = async (gw: number): Promise<void> => {
  if (!gw) return;

  const cached = getValidCacheEntry(gw);
  if (cached) {
    $gameweekData.set(cached);
    return;
  }

  try {
    $loading.set(true);
    $error.set(null);

    const data = await fetchGameweekData(gw);
    setCacheEntry(gw, data);
    $gameweekData.set(data);
  } catch (err) {
    $error.set((err as Error).message);
  } finally {
    $loading.set(false);
  }
};

cache = loadCacheFromStorage();

$gameweek.listen(getGameWeekData);
