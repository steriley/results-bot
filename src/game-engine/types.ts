// ============================================================
// Raw bookmaker JSON types
// ============================================================

export type MarketKey = 'h2h' | 'h2h_lay' | 'totals' | 'spreads';
export type Outcome = 'home' | 'draw' | 'away';

export interface RawOutcome {
  name: string;
  price: number;
  link: string | null;
  sid: string | null;
  bet_limit: number | null;
  point?: number;
}

export interface RawMarket {
  key: MarketKey;
  last_update: string;
  link: string | null;
  sid: string | null;
  outcomes: RawOutcome[];
}

export interface RawBookmaker {
  key: string;
  title: string;
  last_update: string;
  link: string | null;
  sid: string;
  markets: RawMarket[];
}

export interface RawFixture {
  id: string;
  matchId: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  home_rotation: number | null;
  away_rotation: number | null;
  bookmakers: RawBookmaker[];
}

// ============================================================
// Historical match data (required by statistical models)
//
// Provide at least a full season (380 EPL matches) for meaningful
// ratings. The engine applies time-decay weighting automatically,
// so including multiple seasons improves stability.
// ============================================================

export interface HistoricalMatch {
  date: Date;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
}

// ============================================================
// Processed odds structures
// ============================================================

export interface ThreeWayOdds {
  home: number;
  draw: number;
  away: number;
}

export interface TotalsOdds {
  line: number;
  over: number;
  under: number;
}

export interface BookmakerSnapshot {
  bookmakerKey: string;
  bookmakerTitle: string;
  lastUpdate: Date;
  isExchange: boolean;
  isSharp: boolean;
  h2h: ThreeWayOdds | null;
  h2hLay: ThreeWayOdds | null;
  totals: TotalsOdds | null;
}

// ============================================================
// Market analysis signals
// ============================================================

export interface Probabilities {
  home: number;
  draw: number;
  away: number;
}

export interface OddsMovement {
  earliest: ThreeWayOdds;
  latest: ThreeWayOdds;
  /** Positive = price drifted out (lengthened), negative = shortened */
  drift: ThreeWayOdds;
  steamMoveDetected: boolean;
  steamMoveOutcome: Outcome | null;
}

export interface MarketConsensus {
  averageOdds: ThreeWayOdds;
  /** Bookmaker margin as a percentage, e.g. 5.2 = 5.2% */
  overround: number;
  rawImpliedProbabilities: Probabilities;
  /** Margin-removed fair probabilities — primary market signal */
  fairProbabilities: Probabilities;
  bookmakerCount: number;
}

export interface SharpMarketSignal {
  fairProbabilities: Probabilities;
  /** Back-lay spread per outcome: narrow = high liquidity = high confidence */
  exchangeSpread: ThreeWayOdds | null;
  bookmakerCount: number;
}

export interface OddsMovementSignal {
  movement: OddsMovement;
  adjustedProbabilities: Probabilities;
}

/**
 * Signal from the totals (over/under) market.
 * The implied expected goals figure is used to calibrate
 * the Poisson model's lambda parameters independently of
 * the team rating estimates.
 */
export interface TotalsMarketSignal {
  line: number;
  fairProbabilityOver: number;
  /** Implied total expected goals backed out from the over/under market */
  impliedExpectedGoals: number;
  bookmakerCount: number;
}

// ============================================================
// Statistical model outputs
// ============================================================

/**
 * Dixon-Coles Poisson model parameters for a single fixture.
 *
 * Goals for each team are modelled as independent Poisson
 * processes with rates (lambdas) derived from attack/defence
 * strength ratings and a home advantage multiplier. A rho
 * correction adjusts for the known over-frequency of low
 * scorelines (0-0, 1-0, 0-1, 1-1).
 */
export interface DixonColesParameters {
  homeLambda: number;
  awayLambda: number;
  /** Low-score dependency correction. Typical fitted value: -0.13 to 0 */
  rho: number;
  homeAttackRating: number;
  homeDefenceRating: number;
  awayAttackRating: number;
  awayDefenceRating: number;
  leagueHomeAverage: number;
  leagueAwayAverage: number;
  homeAdvantage: number;
}

/**
 * Full score probability matrix up to maxGoals x maxGoals.
 * scoreMatrix[i][j] = P(home scores i goals, away scores j goals)
 */
export interface ScoreMatrix {
  probabilities: number[][];
  maxGoals: number;
}

export interface DixonColesResult {
  parameters: DixonColesParameters;
  scoreMatrix: ScoreMatrix;
  probabilities: Probabilities;
  mostLikelyScore: { home: number; away: number; probability: number };
  expectedGoals: { home: number; away: number; total: number };
}

/**
 * Elo rating system adapted for football with home advantage.
 * Used as a Bayesian prior when updating with Dixon-Coles likelihoods,
 * and as a standalone signal when historical match data is unavailable.
 */
export interface EloRatingResult {
  homeElo: number;
  awayElo: number;
  probabilities: Probabilities;
}

/**
 * Bayesian update of Elo prior probabilities with Dixon-Coles
 * score-matrix likelihoods.
 *
 * Posterior = P(DC result | outcome) * P_elo(outcome) / normalisation
 *
 * This produces more robust estimates than either model alone,
 * especially for teams with limited recent data.
 */
export interface BayesianModelResult {
  dixonColes: DixonColesResult;
  elo: EloRatingResult;
  /** Final blended probabilities after Bayesian update */
  posteriorProbabilities: Probabilities;
}

// ============================================================
// Value betting
// ============================================================

export interface ValueBet {
  outcome: Outcome;
  bestAvailableOdds: number;
  bookmakerKey: string;
  predictedProbability: number;
  impliedProbabilityAtBestOdds: number;
  edgePercent: number;
  /** Expected profit per unit staked, e.g. 0.05 = 5p per £1 */
  expectedValue: number;
}

// ============================================================
// Prediction output
// ============================================================

export interface PredictionFactorWeights {
  marketConsensus: number;
  sharpMoney: number;
  statisticalModel: number;
  oddsMovement: number;
}

export interface PredictionBreakdown {
  marketConsensus: Probabilities;
  sharpMoney: Probabilities | null;
  statisticalModel: Probabilities | null;
  oddsMovement: Probabilities | null;
  weights: PredictionFactorWeights;
}

export interface PredictedScore {
  home: number;
  away: number;
  /** Probability of this exact scoreline under the model */
  probability: number;
  /** Source of the score estimate */
  source: 'dixon-coles' | 'market-implied';
}

export interface Prediction {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: Date;
  recommendation: Outcome;
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number;
  finalProbabilities: Probabilities;
  /** Most likely scoreline and expected goals */
  predictedScore: PredictedScore;
  expectedGoals: { home: number; away: number; total: number };
  breakdown: PredictionBreakdown;
  valueOpportunities: ValueBet[];
  reasoning: string[];
}

// ============================================================
// Full engine output — JSON-serialisable and designed for persistence
// ============================================================

export interface ProcessedFixture {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: Date;
  snapshots: BookmakerSnapshot[];
  consensus: MarketConsensus;
  sharpSignal: SharpMarketSignal | null;
  oddsMovementSignal: OddsMovementSignal | null;
  totalsSignal: TotalsMarketSignal | null;
  statisticalModel: BayesianModelResult | null;
  prediction: Prediction;
}

export interface EngineOutput {
  generatedAt: Date;
  sourceFileCount: number;
  fixtureCount: number;
  fixtures: ProcessedFixture[];
}

// ============================================================
// Engine configuration
// ============================================================

export interface EngineConfig {
  sharpBookmakerKeys: string[];
  exchangeBookmakerKeys: string[];
  minBookmakersForConsensus: number;
  minValueEdgePercent: number;
  /** Maximum scoreline modelled in the score matrix (default: 8) */
  maxGoalsInMatrix: number;
  /**
   * Dixon-Coles time-decay constant xi.
   * Controls how quickly older matches lose influence.
   * Typical EPL values: 0.002 (slow decay) to 0.005 (fast decay).
   */
  dcTimeDecayXi: number;
  /** Factor weights — must sum to 1.0 */
  factorWeights: PredictionFactorWeights;
}
