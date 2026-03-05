/**
 * Example usage of the Premier League Prediction Engine.
 *
 * In a real Node.js environment, load files like this:
 *
 *   import { readFileSync } from "fs";
 *   const oddsSnapshot1: RawFixture[] = JSON.parse(readFileSync("gw27-monday.json", "utf-8"));
 *   const oddsSnapshot2: RawFixture[] = JSON.parse(readFileSync("gw27-friday.json", "utf-8"));
 *   const historicalMatches: HistoricalMatch[] = JSON.parse(readFileSync("epl-2024-25.json", "utf-8"),
 *     (key, value) => key === "date" ? new Date(value) : value
 *   );
 */

import type {
  BayesianModelResult,
  EngineOutput,
  HistoricalMatch,
  Probabilities,
  ProcessedFixture,
  RawFixture,
} from './index';
import { DEFAULT_CONFIG, runPredictionEngine } from './index';

// ============================================================
// Output formatting
// ============================================================

function pct(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

function formatProbs(p: Probabilities): string {
  return `H:${pct(p.home)}  D:${pct(p.draw)}  A:${pct(p.away)}`;
}

function printStatisticalModel(model: BayesianModelResult): void {
  const dc = model.dixonColes;
  const params = dc.parameters;

  console.log(`\nSTATISTICAL MODEL`);
  console.log(
    `  Dixon-Coles  λ_home:${params.homeLambda.toFixed(2)}  λ_away:${params.awayLambda.toFixed(2)}  ρ:${params.rho.toFixed(3)}`,
  );
  console.log(`  DC probs:    ${formatProbs(dc.probabilities)}`);
  console.log(
    `  Most likely: ${dc.mostLikelyScore.home}-${dc.mostLikelyScore.away} (${pct(dc.mostLikelyScore.probability)})`,
  );
  console.log(
    `  xG:          home ${dc.expectedGoals.home.toFixed(2)}  away ${dc.expectedGoals.away.toFixed(2)}`,
  );
  console.log(
    `  Elo ratings: home ${model.elo.homeElo.toFixed(0)}  away ${model.elo.awayElo.toFixed(0)}`,
  );
  console.log(`  Elo probs:   ${formatProbs(model.elo.probabilities)}`);
  console.log(`  Posterior:   ${formatProbs(model.posteriorProbabilities)}`);
}

function printFixture(fixture: ProcessedFixture): void {
  const { prediction, consensus, sharpSignal, oddsMovementSignal, totalsSignal } = fixture;

  console.log(`\n${'═'.repeat(72)}`);
  console.log(`  ${fixture.homeTeam} vs ${fixture.awayTeam}`);
  console.log(`  ${fixture.commenceTime.toUTCString()}`);
  console.log(`${'═'.repeat(72)}`);

  console.log(
    `\nMARKET CONSENSUS  (${consensus.bookmakerCount} bookmakers, ${consensus.overround.toFixed(2)}% overround)`,
  );
  console.log(
    `  Avg odds:  H:${consensus.averageOdds.home.toFixed(2)}  D:${consensus.averageOdds.draw.toFixed(2)}  A:${consensus.averageOdds.away.toFixed(2)}`,
  );
  console.log(`  Fair:      ${formatProbs(consensus.fairProbabilities)}`);

  if (sharpSignal !== null) {
    console.log(`\nSHARP MONEY  (${sharpSignal.bookmakerCount} sources)`);
    console.log(`  Fair:      ${formatProbs(sharpSignal.fairProbabilities)}`);
    if (sharpSignal.exchangeSpread !== null) {
      const s = sharpSignal.exchangeSpread;
      console.log(
        `  Spread:    H:${s.home.toFixed(2)}  D:${s.draw.toFixed(2)}  A:${s.away.toFixed(2)}`,
      );
    }
  }

  if (totalsSignal !== null) {
    console.log(
      `\nTOTALS MARKET  (${totalsSignal.bookmakerCount} sources, line ${totalsSignal.line})`,
    );
    console.log(
      `  P(over):   ${pct(totalsSignal.fairProbabilityOver)}  →  implied xG total: ${totalsSignal.impliedExpectedGoals.toFixed(2)}`,
    );
  }

  if (fixture.statisticalModel !== null) {
    printStatisticalModel(fixture.statisticalModel);
  } else {
    console.log(`\nSTATISTICAL MODEL  (not available — no historical data provided)`);
  }

  if (oddsMovementSignal !== null) {
    const { movement } = oddsMovementSignal;
    console.log(`\nODDS MOVEMENT`);
    console.log(
      `  Open:   H:${movement.earliest.home.toFixed(2)}  D:${movement.earliest.draw.toFixed(2)}  A:${movement.earliest.away.toFixed(2)}`,
    );
    console.log(
      `  Latest: H:${movement.latest.home.toFixed(2)}  D:${movement.latest.draw.toFixed(2)}  A:${movement.latest.away.toFixed(2)}`,
    );
    if (movement.steamMoveDetected) {
      console.log(`  ⚡ Steam move → ${movement.steamMoveOutcome}`);
    }
  }

  console.log(`\nPREDICTION`);
  console.log(
    `  ► ${prediction.recommendation.toUpperCase()}  ` +
      `[${prediction.confidence.toUpperCase()} confidence — ${prediction.confidenceScore.toFixed(0)}/100]`,
  );
  console.log(`  Final: ${formatProbs(prediction.finalProbabilities)}`);

  console.log(`\nREASONING`);
  for (const line of prediction.reasoning) {
    console.log(`  • ${line}`);
  }

  if (prediction.valueOpportunities.length > 0) {
    console.log(`\nVALUE OPPORTUNITIES`);
    for (const vb of prediction.valueOpportunities) {
      console.log(
        `  ${vb.outcome.toUpperCase()} @ ${vb.bestAvailableOdds.toFixed(2)} (${vb.bookmakerKey})` +
          `  edge: +${vb.edgePercent.toFixed(2)}%  EV: ${vb.expectedValue.toFixed(3)}`,
      );
    }
  }
}

// ============================================================
// Main
// ============================================================

function main(): void {
  // ── Odds files ──────────────────────────────────────────────
  // Pass one file for a single snapshot, or multiple files captured
  // at different times during the week for odds movement analysis.
  const oddsFiles: RawFixture[][] = [
    // e.g. JSON.parse(readFileSync("gw27-tuesday.json", "utf-8")),
    //      JSON.parse(readFileSync("gw27-friday.json", "utf-8")),
  ];

  // ── Historical matches ───────────────────────────────────────
  // Provide completed EPL matches. More seasons = more stable ratings.
  // Date values must be Date objects (use a JSON reviver when loading).
  const historicalMatches: HistoricalMatch[] = [
    // { date: new Date("2024-08-17"), homeTeam: "Arsenal", awayTeam: "Wolves", homeGoals: 2, awayGoals: 0 },
    // ...
  ];

  const output: EngineOutput = runPredictionEngine(oddsFiles, historicalMatches, DEFAULT_CONFIG);

  console.log(`PREMIER LEAGUE PREDICTION ENGINE`);
  console.log(`Generated:    ${output.generatedAt.toUTCString()}`);
  console.log(`Source files: ${output.sourceFileCount}`);
  console.log(`Fixtures:     ${output.fixtureCount}`);

  for (const fixture of output.fixtures) {
    printFixture(fixture);
  }

  // The EngineOutput is fully JSON-serialisable.
  // Persist with: writeFileSync("output.json", JSON.stringify(output, null, 2));
  //
  // The ScoreMatrix, DixonColesParameters, EloRatingResult etc. are all
  // included in ProcessedFixture and can be stored and reused without
  // rerunning the engine.
}

main();
