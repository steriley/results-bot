import type {
  BayesianModelResult,
  BookmakerSnapshot,
  EngineConfig,
  MarketConsensus,
  OddsMovementSignal,
  Outcome,
  PredictedScore,
  Prediction,
  PredictionBreakdown,
  Probabilities,
  SharpMarketSignal,
  TotalsMarketSignal,
  ValueBet,
} from './types';

// ============================================================
// Probability helpers
// ============================================================

function weightedBlend(
  signals: ReadonlyArray<{ probabilities: Probabilities; weight: number }>,
): Probabilities {
  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);

  const blended = signals.reduce(
    (acc, { probabilities, weight }) => ({
      home: acc.home + probabilities.home * weight,
      draw: acc.draw + probabilities.draw * weight,
      away: acc.away + probabilities.away * weight,
    }),
    { home: 0, draw: 0, away: 0 },
  );

  return {
    home: blended.home / totalWeight,
    draw: blended.draw / totalWeight,
    away: blended.away / totalWeight,
  };
}

function pickRecommendation(p: Probabilities): Outcome {
  if (p.home >= p.draw && p.home >= p.away) return 'home';
  if (p.away >= p.draw) return 'away';
  return 'draw';
}

// ============================================================
// Value bet detection
// ============================================================

function findValueBets(
  snapshots: BookmakerSnapshot[],
  finalProbabilities: Probabilities,
  minEdgePercent: number,
): ValueBet[] {
  const outcomes: Outcome[] = ['home', 'draw', 'away'];
  const valueBets: ValueBet[] = [];

  for (const outcome of outcomes) {
    let bestOdds = 0;
    let bestBookmakerKey = '';

    for (const snapshot of snapshots) {
      if (snapshot.h2h === null) continue;
      const odds = snapshot.h2h[outcome];
      if (odds > bestOdds) {
        bestOdds = odds;
        bestBookmakerKey = snapshot.bookmakerKey;
      }
    }

    if (bestOdds === 0) continue;

    const impliedAtBest = 1 / bestOdds;
    const predicted = finalProbabilities[outcome];
    const edge = (predicted - impliedAtBest) * 100;

    if (edge >= minEdgePercent) {
      valueBets.push({
        outcome,
        bestAvailableOdds: bestOdds,
        bookmakerKey: bestBookmakerKey,
        predictedProbability: predicted,
        impliedProbabilityAtBestOdds: impliedAtBest,
        edgePercent: edge,
        expectedValue: predicted * bestOdds - 1,
      });
    }
  }

  return valueBets.sort((a, b) => b.edgePercent - a.edgePercent);
}

// ============================================================
// Confidence scoring
// ============================================================

function scoreConfidence(
  finalProbabilities: Probabilities,
  recommendation: Outcome,
  sharpSignal: SharpMarketSignal | null,
  statisticalModel: BayesianModelResult | null,
  oddsMovement: OddsMovementSignal | null,
): number {
  const prob = finalProbabilities[recommendation];

  // Base score from probability strength: a 60% probability scores 42pts,
  // 75% scores 52pts. Scale is intentionally conservative.
  const probabilityScore = ((prob - 0.33) / 0.67) * 55;

  // Sharp money agrees with recommendation: +15 pts
  const sharpBonus =
    sharpSignal !== null && pickRecommendation(sharpSignal.fairProbabilities) === recommendation
      ? 15
      : 0;

  // Statistical model agrees: +15 pts
  const modelBonus =
    statisticalModel !== null &&
    pickRecommendation(statisticalModel.posteriorProbabilities) === recommendation
      ? 15
      : 0;

  // Steam move in same direction: +10 pts
  const steamBonus = oddsMovement?.movement.steamMoveOutcome === recommendation ? 10 : 0;

  // Penalty when signals disagree strongly
  const signals = [
    sharpSignal?.fairProbabilities[recommendation],
    statisticalModel?.posteriorProbabilities[recommendation],
  ].filter((p): p is number => p !== undefined);

  const maxDisagreement =
    signals.length > 0 ? Math.max(...signals.map((s) => Math.abs(s - prob))) : 0;
  const disagreementPenalty = maxDisagreement > 0.1 ? -10 : 0;

  return Math.max(
    0,
    Math.min(100, probabilityScore + sharpBonus + modelBonus + steamBonus + disagreementPenalty),
  );
}

function confidenceLabel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 65) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

// ============================================================
// Reasoning generation
// ============================================================

function buildReasoning(
  recommendation: Outcome,
  finalProbabilities: Probabilities,
  consensus: MarketConsensus,
  sharpSignal: SharpMarketSignal | null,
  statisticalModel: BayesianModelResult | null,
  oddsMovement: OddsMovementSignal | null,
): string[] {
  const lines: string[] = [];
  const pct = (p: number) => `${(p * 100).toFixed(1)}%`;
  const label = (o: Outcome) => (o === 'home' ? 'home win' : o === 'away' ? 'away win' : 'draw');

  lines.push(
    `Final model probability: ${label(recommendation)} ${pct(finalProbabilities[recommendation])} ` +
      `(H:${pct(finalProbabilities.home)} D:${pct(finalProbabilities.draw)} A:${pct(finalProbabilities.away)}).`,
  );

  lines.push(
    `Market consensus across ${consensus.bookmakerCount} bookmakers (${consensus.overround.toFixed(1)}% overround): ` +
      `H:${pct(consensus.fairProbabilities.home)} D:${pct(consensus.fairProbabilities.draw)} A:${pct(consensus.fairProbabilities.away)}.`,
  );

  if (sharpSignal !== null) {
    const sharpRec = pickRecommendation(sharpSignal.fairProbabilities);
    const agreement = sharpRec === recommendation ? 'agrees' : 'disagrees';
    lines.push(
      `Sharp/exchange money (${sharpSignal.bookmakerCount} sources) ${agreement} — ` +
        `H:${pct(sharpSignal.fairProbabilities.home)} D:${pct(sharpSignal.fairProbabilities.draw)} A:${pct(sharpSignal.fairProbabilities.away)}.`,
    );
    if (sharpSignal.exchangeSpread !== null) {
      const s = sharpSignal.exchangeSpread;
      lines.push(
        `Exchange back-lay spreads: H:${s.home.toFixed(2)} D:${s.draw.toFixed(2)} A:${s.away.toFixed(2)} ` +
          `(narrower = higher liquidity = higher market confidence).`,
      );
    }
  }

  if (statisticalModel !== null) {
    const { dixonColes, elo, posteriorProbabilities } = statisticalModel;
    const dc = dixonColes;

    lines.push(
      `Dixon-Coles model (λ_home=${dc.parameters.homeLambda.toFixed(2)}, λ_away=${dc.parameters.awayLambda.toFixed(2)}, ρ=${dc.parameters.rho.toFixed(3)}): ` +
        `H:${pct(dc.probabilities.home)} D:${pct(dc.probabilities.draw)} A:${pct(dc.probabilities.away)}.`,
    );

    lines.push(
      `Most likely scoreline: ${dc.mostLikelyScore.home}-${dc.mostLikelyScore.away} ` +
        `(${pct(dc.mostLikelyScore.probability)}). ` +
        `Expected goals: ${dc.expectedGoals.home.toFixed(2)} – ${dc.expectedGoals.away.toFixed(2)}.`,
    );

    lines.push(
      `Elo ratings — home: ${elo.homeElo.toFixed(0)}, away: ${elo.awayElo.toFixed(0)}. ` +
        `Elo probabilities: H:${pct(elo.probabilities.home)} D:${pct(elo.probabilities.draw)} A:${pct(elo.probabilities.away)}.`,
    );

    lines.push(
      `Bayesian posterior (DC likelihood × Elo prior): ` +
        `H:${pct(posteriorProbabilities.home)} D:${pct(posteriorProbabilities.draw)} A:${pct(posteriorProbabilities.away)}.`,
    );
  }

  if (oddsMovement !== null) {
    const { movement } = oddsMovement;
    if (movement.steamMoveDetected && movement.steamMoveOutcome !== null) {
      lines.push(
        `⚡ Steam move detected toward "${movement.steamMoveOutcome}" — ` +
          `odds shortened ${((Math.abs(movement.drift[movement.steamMoveOutcome]) / movement.earliest[movement.steamMoveOutcome]) * 100).toFixed(1)}% ` +
          `from open (${movement.earliest[movement.steamMoveOutcome].toFixed(2)}) to current (${movement.latest[movement.steamMoveOutcome].toFixed(2)}).`,
      );
    } else {
      lines.push(
        `Odds have moved since opening but no clear steam move identified. ` +
          `Home drift: ${movement.drift.home.toFixed(2)}, draw: ${movement.drift.draw.toFixed(2)}, away: ${movement.drift.away.toFixed(2)}.`,
      );
    }
  }

  return lines;
}

// ============================================================
// Score prediction
// ============================================================

/**
 * When Dixon-Coles is available, use its score matrix directly.
 * When only market signals are available, derive a score estimate
 * from the totals-implied expected goals split by the 1X2 probability ratio.
 */
/**
 * Derive the predicted scoreline from expected goals, not the Poisson mode.
 *
 * dc.mostLikelyScore is the mode of the Poisson distribution: floor(lambda).
 * For lambda_home = 2.8, the mode is 2 — but the expected score is 3.
 * Rounding the expected goals gives a far more representative scoreline,
 * which is why dc.mostLikelyScore is kept in the output for reference only
 * and not used to drive the headline predicted score.
 *
 * When no statistical model is available we fall back to splitting the
 * totals-market implied xG by the 1X2 win probability ratio.
 */
function derivePredictedScore(
  statisticalModel: BayesianModelResult | null,
  totalsSignal: TotalsMarketSignal | null,
  finalProbabilities: Probabilities,
): {
  predictedScore: PredictedScore;
  expectedGoals: { home: number; away: number; total: number };
} {
  if (statisticalModel !== null) {
    const xg = statisticalModel.dixonColes.expectedGoals;
    return {
      predictedScore: {
        home: Math.round(xg.home),
        away: Math.round(xg.away),
        probability: statisticalModel.dixonColes.mostLikelyScore.probability,
        source: 'dixon-coles',
      },
      expectedGoals: xg,
    };
  }

  // Fallback: split the totals-implied xG by the relative win strength of each team.
  const totalXG = totalsSignal?.impliedExpectedGoals ?? 2.5;
  const nonDrawTotal = finalProbabilities.home + finalProbabilities.away;
  const homeShare = nonDrawTotal > 0 ? finalProbabilities.home / nonDrawTotal : 0.5;

  const homeXG = totalXG * homeShare;
  const awayXG = totalXG * (1 - homeShare);

  return {
    predictedScore: {
      home: Math.round(homeXG),
      away: Math.round(awayXG),
      probability: 0,
      source: 'market-implied',
    },
    expectedGoals: { home: homeXG, away: awayXG, total: totalXG },
  };
}

// ============================================================
// Main synthesis
// ============================================================

export function synthesisePrediction(
  fixtureId: string,
  homeTeam: string,
  awayTeam: string,
  commenceTime: Date,
  snapshots: BookmakerSnapshot[],
  consensus: MarketConsensus,
  sharpSignal: SharpMarketSignal | null,
  oddsMovement: OddsMovementSignal | null,
  statisticalModel: BayesianModelResult | null,
  totalsSignal: TotalsMarketSignal | null,
  config: EngineConfig,
): Prediction {
  const weights = config.factorWeights;

  const signals: Array<{ probabilities: Probabilities; weight: number }> = [
    { probabilities: consensus.fairProbabilities, weight: weights.marketConsensus },
  ];

  if (sharpSignal !== null) {
    signals.push({
      probabilities: sharpSignal.fairProbabilities,
      weight: weights.sharpMoney,
    });
  }

  if (statisticalModel !== null) {
    signals.push({
      probabilities: statisticalModel.posteriorProbabilities,
      weight: weights.statisticalModel,
    });
  }

  if (oddsMovement !== null) {
    signals.push({
      probabilities: oddsMovement.adjustedProbabilities,
      weight: weights.oddsMovement,
    });
  }

  const finalProbabilities = weightedBlend(signals);
  const recommendation = pickRecommendation(finalProbabilities);

  const { predictedScore, expectedGoals } = derivePredictedScore(
    statisticalModel,
    totalsSignal,
    finalProbabilities,
  );

  const confidenceScore = scoreConfidence(
    finalProbabilities,
    recommendation,
    sharpSignal,
    statisticalModel,
    oddsMovement,
  );

  const breakdown: PredictionBreakdown = {
    marketConsensus: consensus.fairProbabilities,
    sharpMoney: sharpSignal?.fairProbabilities ?? null,
    statisticalModel: statisticalModel?.posteriorProbabilities ?? null,
    oddsMovement: oddsMovement?.adjustedProbabilities ?? null,
    weights,
  };

  const reasoning = buildReasoning(
    recommendation,
    finalProbabilities,
    consensus,
    sharpSignal,
    statisticalModel,
    oddsMovement,
  );

  const valueOpportunities = findValueBets(
    snapshots,
    finalProbabilities,
    config.minValueEdgePercent,
  );

  return {
    fixtureId,
    homeTeam,
    awayTeam,
    commenceTime,
    recommendation,
    confidence: confidenceLabel(confidenceScore),
    confidenceScore,
    finalProbabilities,
    predictedScore,
    expectedGoals,
    breakdown,
    valueOpportunities,
    reasoning,
  };
}
