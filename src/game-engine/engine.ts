import {
  buildMarketConsensus,
  buildOddsMovementSignal,
  buildSharpMarketSignal,
  buildTotalsSignal,
} from './market-analysis';
import { mergeRawFixtures, parseFixtureSnapshots } from './parser';
import { synthesisePrediction } from './prediction';
import { StatisticalModelEngine } from './statistical-models';
import type {
  BookmakerSnapshot,
  EngineConfig,
  EngineOutput,
  HistoricalMatch,
  ProcessedFixture,
  RawFixture,
} from './types';

// ============================================================
// Default configuration
// ============================================================

export const DEFAULT_CONFIG: EngineConfig = {
  sharpBookmakerKeys: ['betfair_ex_uk', 'smarkets', 'matchbook', 'pinnacle'],
  exchangeBookmakerKeys: ['betfair_ex_uk', 'smarkets', 'matchbook'],
  minBookmakersForConsensus: 2,
  minValueEdgePercent: 2.0,
  maxGoalsInMatrix: 8,
  dcTimeDecayXi: 0.003,
  factorWeights: {
    // Weights reflect the relative predictive value of each signal.
    // Market consensus is the dominant signal — it already incorporates
    // vast amounts of information. Sharp money refines it. The statistical
    // model adds independent structure. Odds movement is a late signal only.
    marketConsensus: 0.4,
    sharpMoney: 0.3,
    statisticalModel: 0.2,
    oddsMovement: 0.1,
  },
};

// ============================================================
// Per-fixture processing
// ============================================================

function processFixture(
  fixture: RawFixture,
  snapshots: BookmakerSnapshot[],
  modelEngine: StatisticalModelEngine,
  config: EngineConfig,
): ProcessedFixture | null {
  const consensus = buildMarketConsensus(snapshots, config);
  if (consensus === null) return null;

  const sharpSignal = buildSharpMarketSignal(snapshots);
  const oddsMovementSignal = buildOddsMovementSignal(snapshots);
  const totalsSignal = buildTotalsSignal(snapshots);

  const impliedExpectedGoals = totalsSignal?.impliedExpectedGoals ?? null;

  const statisticalModel = modelEngine.runBayesianModel(
    fixture.home_team,
    fixture.away_team,
    impliedExpectedGoals,
    config,
  );

  const prediction = synthesisePrediction(
    fixture.id,
    fixture.home_team,
    fixture.away_team,
    new Date(fixture.commence_time),
    snapshots,
    consensus,
    sharpSignal,
    oddsMovementSignal,
    statisticalModel,
    totalsSignal,
    config,
  );

  return {
    fixtureId: fixture.id,
    homeTeam: fixture.home_team,
    awayTeam: fixture.away_team,
    commenceTime: new Date(fixture.commence_time),
    snapshots,
    consensus,
    sharpSignal,
    oddsMovementSignal,
    totalsSignal,
    statisticalModel,
    prediction,
  };
}

// ============================================================
// Public API
// ============================================================

/**
 * Accept either a single file (RawFixture[]) or multiple snapshots (RawFixture[][]).
 * A RawFixture[] is identified by checking whether the first element looks like a
 * fixture object (has a string `id` field) rather than an array.
 */
function normaliseOddsInput(input: RawFixture[] | RawFixture[][]): RawFixture[][] {
  if (input.length === 0) return [];
  const firstElement = input[0];
  if (Array.isArray(firstElement)) {
    return input as RawFixture[][];
  }
  return [input as RawFixture[]];
}

/**
 * Run the prediction engine.
 *
 * @param oddsInput - The bookmaker odds data. Accepts either:
 *   - A single file's contents: `RawFixture[]` (the direct result of JSON.parse)
 *   - Multiple snapshots from different points in the week: `RawFixture[][]`
 *     Providing multiple snapshots enables odds movement / steam detection.
 *
 * @param historicalMatches - Completed match results used to estimate
 *   Dixon-Coles attack/defence ratings and Elo ratings. Provide at least
 *   one full EPL season (380 matches) for reliable estimates.
 *   Pass an empty array to skip statistical modelling and rely on market
 *   signals only.
 *
 * @param config - Optional engine configuration overrides.
 */
export function runPredictionEngine(
  oddsInput: RawFixture[] | RawFixture[][],
  historicalMatches: HistoricalMatch[],
  config: EngineConfig = DEFAULT_CONFIG,
): EngineOutput {
  const normalised = normaliseOddsInput(oddsInput);
  const mergedFixtures = mergeRawFixtures(normalised);
  const snapshotsByFixture = parseFixtureSnapshots(mergedFixtures, config);

  // Initialise statistical model engine once — ratings are shared across
  // all fixtures in the same game week
  const referenceDate = new Date();
  const modelEngine = new StatisticalModelEngine(historicalMatches, config, referenceDate);

  const processedFixtures: ProcessedFixture[] = [];

  for (const fixture of mergedFixtures) {
    const snapshots = snapshotsByFixture.get(fixture.id) ?? [];

    const processed = processFixture(fixture, snapshots, modelEngine, config);
    if (processed !== null) {
      processedFixtures.push(processed);
    }
  }

  return {
    generatedAt: new Date(),
    sourceFileCount: normalised.length,
    fixtureCount: processedFixtures.length,
    fixtures: processedFixtures,
  };
}
