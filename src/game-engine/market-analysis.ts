import type {
  BookmakerSnapshot,
  EngineConfig,
  MarketConsensus,
  OddsMovement,
  OddsMovementSignal,
  Outcome,
  Probabilities,
  SharpMarketSignal,
  ThreeWayOdds,
  TotalsMarketSignal,
  TotalsOdds,
} from './types';

// ============================================================
// Probability / odds helpers
// ============================================================

function oddsToImplied(odds: number): number {
  return 1 / odds;
}

function rawImplied(odds: ThreeWayOdds): Probabilities {
  return {
    home: oddsToImplied(odds.home),
    draw: oddsToImplied(odds.draw),
    away: oddsToImplied(odds.away),
  };
}

function overround(p: Probabilities): number {
  return p.home + p.draw + p.away;
}

/**
 * Shin (1993) margin removal — corrects for the longshot bias introduced
 * by bookmakers applying proportionally larger margins to outsiders.
 *
 * The original closed-form z estimator only holds for 2-outcome markets.
 * For 3-outcome (1X2) markets we solve for z iteratively via bisection:
 * find z ∈ [0, 0.5) such that the sum of Shin-adjusted probabilities = 1,
 * where each Shin prob is:
 *
 *   p̂ᵢ = [sqrt(z² + 4(1-z)·qᵢ²/S) - z] / [2(1-z)]
 *
 * and S is the raw overround, qᵢ are the raw implied probabilities.
 */
function shinMarginRemoval(raw: Probabilities): Probabilities {
  const S = overround(raw);
  const rawArr = [raw.home, raw.draw, raw.away] as const;

  function shinProb(q: number, z: number): number {
    return (Math.sqrt(z ** 2 + (4 * (1 - z) * q ** 2) / S) - z) / (2 * (1 - z));
  }

  function impliedSum(z: number): number {
    return rawArr.reduce((sum, q) => sum + shinProb(q, z), 0);
  }

  // Bisect on z: impliedSum is monotonically decreasing in z.
  // At z=0 the sum > 1 (overround); at z→0.5 the sum < 1.
  let lo = 0;
  let hi = 0.4999;

  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    if (impliedSum(mid) > 1) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const z = (lo + hi) / 2;
  const home = shinProb(raw.home, z);
  const draw = shinProb(raw.draw, z);
  const away = shinProb(raw.away, z);
  const sum = home + draw + away;

  return { home: home / sum, draw: draw / sum, away: away / sum };
}

function averageThreeWay(odds: ThreeWayOdds[]): ThreeWayOdds {
  const n = odds.length;
  return {
    home: odds.reduce((s, o) => s + o.home, 0) / n,
    draw: odds.reduce((s, o) => s + o.draw, 0) / n,
    away: odds.reduce((s, o) => s + o.away, 0) / n,
  };
}

function midpoint(back: ThreeWayOdds, lay: ThreeWayOdds): ThreeWayOdds {
  return {
    home: (back.home + lay.home) / 2,
    draw: (back.draw + lay.draw) / 2,
    away: (back.away + lay.away) / 2,
  };
}

function spread(back: ThreeWayOdds, lay: ThreeWayOdds): ThreeWayOdds {
  return {
    home: lay.home - back.home,
    draw: lay.draw - back.draw,
    away: lay.away - back.away,
  };
}

export function normalise(p: Probabilities): Probabilities {
  const total = p.home + p.draw + p.away;
  return { home: p.home / total, draw: p.draw / total, away: p.away / total };
}

// ============================================================
// Market consensus
// ============================================================

export function buildMarketConsensus(
  snapshots: BookmakerSnapshot[],
  config: EngineConfig,
): MarketConsensus | null {
  const h2hOdds = snapshots
    .filter((s) => s.h2h !== null && !s.isExchange)
    .map((s) => s.h2h as ThreeWayOdds);

  if (h2hOdds.length < config.minBookmakersForConsensus) return null;

  const avg = averageThreeWay(h2hOdds);
  const raw = rawImplied(avg);
  const or = overround(raw);

  return {
    averageOdds: avg,
    overround: (or - 1) * 100,
    rawImpliedProbabilities: raw,
    fairProbabilities: shinMarginRemoval(raw),
    bookmakerCount: h2hOdds.length,
  };
}

// ============================================================
// Sharp / exchange money signal
// ============================================================

export function buildSharpMarketSignal(snapshots: BookmakerSnapshot[]): SharpMarketSignal | null {
  const sharpSnapshots = snapshots.filter((s) => (s.isSharp || s.isExchange) && s.h2h !== null);

  if (sharpSnapshots.length === 0) return null;

  // Use back-lay midpoint for exchanges (true market price without spread)
  const odds = sharpSnapshots.map((s) => {
    if (s.isExchange && s.h2hLay !== null) {
      return midpoint(s.h2h as ThreeWayOdds, s.h2hLay);
    }
    return s.h2h as ThreeWayOdds;
  });

  const avg = averageThreeWay(odds);
  const raw = rawImplied(avg);

  // Exchange spread from first exchange with both back and lay
  const exchangeWithLay = sharpSnapshots.find((s) => s.isExchange && s.h2hLay !== null);
  const exchangeSpread =
    exchangeWithLay?.h2h && exchangeWithLay.h2hLay
      ? spread(exchangeWithLay.h2h, exchangeWithLay.h2hLay)
      : null;

  return {
    fairProbabilities: shinMarginRemoval(raw),
    exchangeSpread,
    bookmakerCount: sharpSnapshots.length,
  };
}

// ============================================================
// Odds movement / steam detection
// ============================================================

const STEAM_THRESHOLD = 0.1;
const STEAM_PROBABILITY_BOOST = 0.02;

export function buildOddsMovementSignal(snapshots: BookmakerSnapshot[]): OddsMovementSignal | null {
  const byBookmaker = new Map<string, BookmakerSnapshot[]>();

  for (const snapshot of snapshots) {
    if (snapshot.h2h === null) continue;
    const existing = byBookmaker.get(snapshot.bookmakerKey) ?? [];
    existing.push(snapshot);
    byBookmaker.set(snapshot.bookmakerKey, existing);
  }

  // Only use bookmakers for which we have a timeline (multiple snapshots)
  const movers = Array.from(byBookmaker.values()).filter((history) => history.length > 1);

  if (movers.length === 0) return null;

  const earliestOdds: ThreeWayOdds[] = [];
  const latestOdds: ThreeWayOdds[] = [];

  for (const history of movers) {
    const sorted = history.sort((a, b) => a.lastUpdate.getTime() - b.lastUpdate.getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (first?.h2h && last?.h2h) {
      earliestOdds.push(first.h2h);
      latestOdds.push(last.h2h);
    }
  }

  if (earliestOdds.length === 0) return null;

  const earliest = averageThreeWay(earliestOdds);
  const latest = averageThreeWay(latestOdds);
  const drift: ThreeWayOdds = {
    home: latest.home - earliest.home,
    draw: latest.draw - earliest.draw,
    away: latest.away - earliest.away,
  };

  const steamMoveOutcome = detectSteamOutcome(drift, earliest);
  const movement: OddsMovement = {
    earliest,
    latest,
    drift,
    steamMoveDetected: steamMoveOutcome !== null,
    steamMoveOutcome,
  };

  const baseProbs = shinMarginRemoval(rawImplied(latest));
  const adjustedProbabilities = applySteamBoost(baseProbs, steamMoveOutcome);

  return { movement, adjustedProbabilities };
}

function detectSteamOutcome(drift: ThreeWayOdds, baseline: ThreeWayOdds): Outcome | null {
  const moves: Array<{ outcome: Outcome; pctMove: number; shortened: boolean }> = [
    {
      outcome: 'home',
      pctMove: Math.abs(drift.home) / baseline.home,
      shortened: drift.home < 0,
    },
    {
      outcome: 'draw',
      pctMove: Math.abs(drift.draw) / baseline.draw,
      shortened: drift.draw < 0,
    },
    {
      outcome: 'away',
      pctMove: Math.abs(drift.away) / baseline.away,
      shortened: drift.away < 0,
    },
  ];

  const steam = moves
    .filter((m) => m.pctMove >= STEAM_THRESHOLD && m.shortened)
    .sort((a, b) => b.pctMove - a.pctMove)[0];

  return steam?.outcome ?? null;
}

/** A steam move toward an outcome means informed money thinks it's more likely */
function applySteamBoost(base: Probabilities, steamOutcome: Outcome | null): Probabilities {
  if (steamOutcome === null) return base;

  const boosted: Probabilities = {
    ...base,
    [steamOutcome]: base[steamOutcome] + STEAM_PROBABILITY_BOOST,
  };

  return normalise(boosted);
}

// ============================================================
// Totals market signal
// ============================================================

/**
 * Back out an implied expected goals figure from the over/under market.
 *
 * Uses the Poisson CDF relationship: for a given line L and fair
 * probability of over, we can infer the expected total goals mu
 * by finding the mu where P(X >= L + 1) = P_over under Poisson(mu).
 * We solve numerically via bisection.
 */
export function buildTotalsSignal(snapshots: BookmakerSnapshot[]): TotalsMarketSignal | null {
  const totalOdds = snapshots.filter((s) => s.totals !== null).map((s) => s.totals as TotalsOdds);

  if (totalOdds.length === 0) return null;

  // Use the most common line (typically 2.5 in EPL)
  const lineCounts = new Map<number, number>();
  for (const t of totalOdds) {
    lineCounts.set(t.line, (lineCounts.get(t.line) ?? 0) + 1);
  }
  const dominantLine = Array.from(lineCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];

  if (dominantLine === undefined) return null;

  const oddsAtLine = totalOdds.filter((t) => t.line === dominantLine);
  const avgOver = oddsAtLine.reduce((s, t) => s + t.over, 0) / oddsAtLine.length;
  const avgUnder = oddsAtLine.reduce((s, t) => s + t.under, 0) / oddsAtLine.length;

  const rawOver = 1 / avgOver;
  const rawUnder = 1 / avgUnder;
  const totalRaw = rawOver + rawUnder;
  const fairOver = rawOver / totalRaw;

  const impliedExpectedGoals = inferExpectedGoalsFromOverProb(dominantLine, fairOver);

  return {
    line: dominantLine,
    fairProbabilityOver: fairOver,
    impliedExpectedGoals,
    bookmakerCount: oddsAtLine.length,
  };
}

/**
 * Bisection search: find mu such that P(Poisson(mu) > line) = targetProbOver.
 * The over bet wins when total goals > line (for a 2.5 line, that means 3+).
 */
function inferExpectedGoalsFromOverProb(line: number, targetProbOver: number): number {
  const threshold = Math.ceil(line); // goals needed to win over bet
  let lo = 0.1;
  let hi = 12.0;

  for (let iter = 0; iter < 60; iter++) {
    const mid = (lo + hi) / 2;
    const probOver = 1 - poissonCDF(threshold - 1, mid);
    if (probOver < targetProbOver) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return (lo + hi) / 2;
}

export function poissonPMF(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lambda) * lambda ** k) / factorial(k);
}

function poissonCDF(k: number, lambda: number): number {
  let sum = 0;
  for (let i = 0; i <= k; i++) {
    sum += poissonPMF(i, lambda);
  }
  return sum;
}

const FACTORIAL_CACHE: number[] = [1];

function factorial(n: number): number {
  if (n < 0) return NaN;
  for (let i = FACTORIAL_CACHE.length; i <= n; i++) {
    FACTORIAL_CACHE[i] = (FACTORIAL_CACHE[i - 1] ?? 1) * i;
  }
  return FACTORIAL_CACHE[n] ?? NaN;
}
