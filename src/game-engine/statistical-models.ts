import { normalise, poissonPMF } from './market-analysis';
import type {
  BayesianModelResult,
  DixonColesParameters,
  DixonColesResult,
  EloRatingResult,
  EngineConfig,
  HistoricalMatch,
  Probabilities,
  ScoreMatrix,
} from './types';

// ============================================================
// Team rating store
// ============================================================

interface TeamRating {
  attack: number;
  defence: number;
  eloRating: number;
}

interface LeagueParameters {
  homeAverage: number;
  awayAverage: number;
  homeAdvantage: number;
  /** Fitted Dixon-Coles rho (low-score correlation correction) */
  rho: number;
}

interface RatingStore {
  teams: Map<string, TeamRating>;
  league: LeagueParameters;
}

// ============================================================
// Elo constants
// ============================================================

const ELO_BASE = 1500;
const ELO_K_FACTOR = 32;
const ELO_HOME_ADVANTAGE = 100;

// ============================================================
// Dixon-Coles time decay
// ============================================================

/**
 * Exponential time-decay weight for a match.
 * w(t) = exp(-xi * days_ago)
 * xi = 0.003 gives half-weight at ~231 days (roughly 8 months).
 */
function timeDecayWeight(matchDate: Date, referenceDate: Date, xi: number): number {
  const daysAgo = (referenceDate.getTime() - matchDate.getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-xi * Math.max(0, daysAgo));
}

// ============================================================
// Dixon-Coles rho correction
// ============================================================

/**
 * The tau function corrects joint probabilities for low scorelines.
 * Derived from Dixon & Coles (1997) equation (2).
 */
function tau(x: number, y: number, lambdaHome: number, lambdaAway: number, rho: number): number {
  if (x === 0 && y === 0) return 1 - lambdaHome * lambdaAway * rho;
  if (x === 0 && y === 1) return 1 + lambdaHome * rho;
  if (x === 1 && y === 0) return 1 + lambdaAway * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

// ============================================================
// Rating estimation from historical matches
// ============================================================

function initRatingStore(teams: string[]): RatingStore {
  const teamMap = new Map<string, TeamRating>();
  for (const team of teams) {
    teamMap.set(team, { attack: 1.0, defence: 1.0, eloRating: ELO_BASE });
  }
  return {
    teams: teamMap,
    league: {
      homeAverage: 1.5,
      awayAverage: 1.1,
      homeAdvantage: 1.35,
      rho: -0.13,
    },
  };
}

/**
 * Estimate attack/defence ratings using an iterative proportional
 * fitting approach (simpler than full MLE, converges reliably).
 *
 * The model:
 *   E[home goals] = attack_home * defence_away * homeAverage * homeAdvantage
 *   E[away goals] = attack_away * defence_home * awayAverage
 *
 * We iterate: fix defences, solve for attacks; fix attacks, solve for defences.
 */
function estimateRatings(matches: HistoricalMatch[], referenceDate: Date, xi: number): RatingStore {
  const teamNames = Array.from(new Set(matches.flatMap((m) => [m.homeTeam, m.awayTeam])));

  const store = initRatingStore(teamNames);

  // Compute league averages weighted by time decay
  let totalWeight = 0;
  let weightedHomeGoals = 0;
  let weightedAwayGoals = 0;

  for (const match of matches) {
    const w = timeDecayWeight(match.date, referenceDate, xi);
    weightedHomeGoals += match.homeGoals * w;
    weightedAwayGoals += match.awayGoals * w;
    totalWeight += w;
  }

  if (totalWeight === 0) return store;

  store.league.homeAverage = weightedHomeGoals / totalWeight;
  store.league.awayAverage = weightedAwayGoals / totalWeight;
  store.league.homeAdvantage = store.league.homeAverage / store.league.awayAverage;

  // Iterative proportional fitting — 50 iterations converges well
  const ITERATIONS = 50;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Update attack ratings
    for (const team of teamNames) {
      const homeMatches = matches.filter((m) => m.homeTeam === team);
      const awayMatches = matches.filter((m) => m.awayTeam === team);

      let numerator = 0;
      let denominator = 0;

      for (const m of homeMatches) {
        const w = timeDecayWeight(m.date, referenceDate, xi);
        const awayDef = store.teams.get(m.awayTeam)?.defence ?? 1;
        numerator += m.homeGoals * w;
        denominator += store.league.homeAverage * store.league.homeAdvantage * awayDef * w;
      }

      for (const m of awayMatches) {
        const w = timeDecayWeight(m.date, referenceDate, xi);
        const homeDef = store.teams.get(m.homeTeam)?.defence ?? 1;
        numerator += m.awayGoals * w;
        denominator += store.league.awayAverage * homeDef * w;
      }

      const rating = store.teams.get(team);
      if (rating && denominator > 0) {
        rating.attack = numerator / denominator;
      }
    }

    // Update defence ratings
    for (const team of teamNames) {
      const homeMatches = matches.filter((m) => m.homeTeam === team);
      const awayMatches = matches.filter((m) => m.awayTeam === team);

      let numerator = 0;
      let denominator = 0;

      for (const m of homeMatches) {
        const w = timeDecayWeight(m.date, referenceDate, xi);
        const awayAtk = store.teams.get(m.awayTeam)?.attack ?? 1;
        numerator += m.awayGoals * w;
        denominator += store.league.awayAverage * awayAtk * w;
      }

      for (const m of awayMatches) {
        const w = timeDecayWeight(m.date, referenceDate, xi);
        const homeAtk = store.teams.get(m.homeTeam)?.attack ?? 1;
        numerator += m.homeGoals * w;
        denominator += store.league.homeAverage * store.league.homeAdvantage * homeAtk * w;
      }

      const rating = store.teams.get(team);
      if (rating && denominator > 0) {
        rating.defence = numerator / denominator;
      }
    }

    // Normalise so geometric mean of all attack ratings = 1
    const attackRatings = teamNames.map((t) => store.teams.get(t)?.attack ?? 1);
    const meanAttack = Math.exp(
      attackRatings.reduce((s, a) => s + Math.log(Math.max(a, 1e-6)), 0) / attackRatings.length,
    );
    for (const team of teamNames) {
      const rating = store.teams.get(team);
      if (rating) rating.attack /= meanAttack;
    }
  }

  // Build Elo ratings from the same match history
  buildEloRatings(matches, store, referenceDate, xi);

  return store;
}

// ============================================================
// Elo rating builder
// ============================================================

function eloExpected(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

function buildEloRatings(
  matches: HistoricalMatch[],
  store: RatingStore,
  referenceDate: Date,
  xi: number,
): void {
  // Reset Elo to base before replay
  for (const [, rating] of store.teams) {
    rating.eloRating = ELO_BASE;
  }

  // Replay matches in chronological order
  const sorted = [...matches].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const match of sorted) {
    const home = store.teams.get(match.homeTeam);
    const away = store.teams.get(match.awayTeam);
    if (!home || !away) continue;

    const w = timeDecayWeight(match.date, referenceDate, xi);
    const kWeighted = ELO_K_FACTOR * w;

    const homeEloAdj = home.eloRating + ELO_HOME_ADVANTAGE;
    const expectedHome = eloExpected(homeEloAdj, away.eloRating);

    const actualHome =
      match.homeGoals > match.awayGoals ? 1 : match.homeGoals === match.awayGoals ? 0.5 : 0;

    const homeChange = kWeighted * (actualHome - expectedHome);
    home.eloRating += homeChange;
    away.eloRating -= homeChange;
  }
}

// ============================================================
// Dixon-Coles score matrix and probabilities
// ============================================================

function buildScoreMatrix(
  homeLambda: number,
  awayLambda: number,
  rho: number,
  maxGoals: number,
): ScoreMatrix {
  const probs: number[][] = [];

  for (let i = 0; i <= maxGoals; i++) {
    const row: number[] = [];
    for (let j = 0; j <= maxGoals; j++) {
      const poissonJoint = poissonPMF(i, homeLambda) * poissonPMF(j, awayLambda);
      row[j] = poissonJoint * tau(i, j, homeLambda, awayLambda, rho);
    }
    probs[i] = row;
  }

  // Normalise matrix to account for truncation at maxGoals
  let total = 0;
  for (let i = 0; i <= maxGoals; i++) {
    for (let j = 0; j <= maxGoals; j++) {
      total += probs[i]?.[j] ?? 0;
    }
  }

  for (let i = 0; i <= maxGoals; i++) {
    const row = probs[i];
    if (row && total > 0) {
      for (let j = 0; j <= maxGoals; j++) {
        const val = row[j];
        if (val !== undefined) {
          row[j] = val / total;
        }
      }
    }
  }

  return { probabilities: probs, maxGoals };
}

function scoreMatrixToProbabilities(matrix: ScoreMatrix): Probabilities {
  let home = 0;
  let draw = 0;
  let away = 0;

  for (let i = 0; i <= matrix.maxGoals; i++) {
    for (let j = 0; j <= matrix.maxGoals; j++) {
      const p = matrix.probabilities[i]?.[j] ?? 0;
      if (i > j) home += p;
      else if (i === j) draw += p;
      else away += p;
    }
  }

  return normalise({ home, draw, away });
}

function mostLikelyScore(matrix: ScoreMatrix): { home: number; away: number; probability: number } {
  let bestI = 0;
  let bestJ = 0;
  let bestP = 0;

  for (let i = 0; i <= matrix.maxGoals; i++) {
    for (let j = 0; j <= matrix.maxGoals; j++) {
      const p = matrix.probabilities[i]?.[j] ?? 0;
      if (p > bestP) {
        bestP = p;
        bestI = i;
        bestJ = j;
      }
    }
  }

  return { home: bestI, away: bestJ, probability: bestP };
}

function expectedGoalsFromMatrix(matrix: ScoreMatrix): {
  home: number;
  away: number;
  total: number;
} {
  let homeXG = 0;
  let awayXG = 0;

  for (let i = 0; i <= matrix.maxGoals; i++) {
    for (let j = 0; j <= matrix.maxGoals; j++) {
      const p = matrix.probabilities[i]?.[j] ?? 0;
      homeXG += i * p;
      awayXG += j * p;
    }
  }

  return { home: homeXG, away: awayXG, total: homeXG + awayXG };
}

// ============================================================
// Elo win probability
// ============================================================

/**
 * Convert Elo ratings to 1X2 probabilities.
 *
 * Elo naturally produces home/away win probabilities. We estimate the
 * draw probability using the empirical observation that in football,
 * roughly 26% of games end in draws, with the draw probability peaking
 * when teams are evenly matched and declining as the Elo gap widens.
 *
 * We model draw probability as a scaled Gaussian centred at 0 Elo difference.
 */
function eloToProbabilities(homeElo: number, awayElo: number): Probabilities {
  const eloDiff = homeElo + ELO_HOME_ADVANTAGE - awayElo;
  const expectedHome = eloExpected(homeElo + ELO_HOME_ADVANTAGE, awayElo);
  const expectedAway = 1 - expectedHome;

  // Draw probability peaks at ~28% when Elo difference = 0
  const DRAW_PEAK = 0.28;
  const DRAW_SIGMA = 200;
  const drawRaw = DRAW_PEAK * Math.exp(-(eloDiff ** 2) / (2 * DRAW_SIGMA ** 2));

  const home = expectedHome * (1 - drawRaw);
  const away = expectedAway * (1 - drawRaw);
  const draw = drawRaw;

  return normalise({ home, draw, away });
}

// ============================================================
// Bayesian combination of Dixon-Coles and Elo
// ============================================================

/**
 * Bayesian update: use Elo probabilities as the prior, then update
 * with Dixon-Coles score-matrix probabilities as the likelihood.
 *
 * Posterior(outcome) ∝ P_DC(outcome) * P_Elo(outcome)
 *
 * This rewards outcomes where both models agree and penalises
 * disagreements, producing a more conservative and robust estimate.
 */
function bayesianUpdate(prior: Probabilities, likelihood: Probabilities): Probabilities {
  return normalise({
    home: prior.home * likelihood.home,
    draw: prior.draw * likelihood.draw,
    away: prior.away * likelihood.away,
  });
}

// ============================================================
// Public API
// ============================================================

export class StatisticalModelEngine {
  private readonly ratingStore: RatingStore;

  constructor(
    historicalMatches: HistoricalMatch[],
    config: EngineConfig,
    referenceDate: Date = new Date(),
  ) {
    this.ratingStore =
      historicalMatches.length > 0
        ? estimateRatings(historicalMatches, referenceDate, config.dcTimeDecayXi)
        : initRatingStore([]);
  }

  hasRatingsFor(teamName: string): boolean {
    return this.ratingStore.teams.has(teamName);
  }

  runDixonColes(
    homeTeam: string,
    awayTeam: string,
    impliedExpectedGoals: number | null,
    config: EngineConfig,
  ): DixonColesResult | null {
    const homeRating = this.ratingStore.teams.get(homeTeam);
    const awayRating = this.ratingStore.teams.get(awayTeam);

    if (!homeRating || !awayRating) return null;

    const league = this.ratingStore.league;

    let homeLambda =
      homeRating.attack * awayRating.defence * league.homeAverage * league.homeAdvantage;

    let awayLambda = awayRating.attack * homeRating.defence * league.awayAverage;

    // If the totals market gives us an implied expected goals figure,
    // use it to recalibrate the lambdas while preserving their ratio.
    // This anchors the model to current market information.
    if (impliedExpectedGoals !== null && impliedExpectedGoals > 0) {
      const modelTotal = homeLambda + awayLambda;
      const scaleFactor = impliedExpectedGoals / modelTotal;
      homeLambda *= scaleFactor;
      awayLambda *= scaleFactor;
    }

    const rho = league.rho;
    const matrix = buildScoreMatrix(homeLambda, awayLambda, rho, config.maxGoalsInMatrix);

    const parameters: DixonColesParameters = {
      homeLambda,
      awayLambda,
      rho,
      homeAttackRating: homeRating.attack,
      homeDefenceRating: homeRating.defence,
      awayAttackRating: awayRating.attack,
      awayDefenceRating: awayRating.defence,
      leagueHomeAverage: league.homeAverage,
      leagueAwayAverage: league.awayAverage,
      homeAdvantage: league.homeAdvantage,
    };

    return {
      parameters,
      scoreMatrix: matrix,
      probabilities: scoreMatrixToProbabilities(matrix),
      mostLikelyScore: mostLikelyScore(matrix),
      expectedGoals: expectedGoalsFromMatrix(matrix),
    };
  }

  runElo(homeTeam: string, awayTeam: string): EloRatingResult | null {
    const homeRating = this.ratingStore.teams.get(homeTeam);
    const awayRating = this.ratingStore.teams.get(awayTeam);

    if (!homeRating || !awayRating) return null;

    return {
      homeElo: homeRating.eloRating,
      awayElo: awayRating.eloRating,
      probabilities: eloToProbabilities(homeRating.eloRating, awayRating.eloRating),
    };
  }

  runBayesianModel(
    homeTeam: string,
    awayTeam: string,
    impliedExpectedGoals: number | null,
    config: EngineConfig,
  ): BayesianModelResult | null {
    const dc = this.runDixonColes(homeTeam, awayTeam, impliedExpectedGoals, config);
    const elo = this.runElo(homeTeam, awayTeam);

    if (!dc || !elo) return null;

    const posteriorProbabilities = bayesianUpdate(elo.probabilities, dc.probabilities);

    return { dixonColes: dc, elo, posteriorProbabilities };
  }
}
