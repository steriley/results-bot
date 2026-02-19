// -------------------------------
// TYPES
// -------------------------------

type Outcome = {
  name: string;
  price: number;
  point?: number;
};

type Market = {
  key: string;
  outcomes: Outcome[];
};

type Bookmaker = {
  key: string;
  markets: Market[];
};

type Game = {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
};

type ScoreProbability = {
  home: number;
  away: number;
  probability: number;
};

type SimulationResult = {
  score: string;
  frequency: number;
  probability: number;
};

type Prediction = {
  gameId: string;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  expectedGoals: { home: number; away: number };
  mostLikelyScore: { home: number; away: number };
  // correctScoreMatrix: ScoreProbability[];
  // simulationTopResults: SimulationResult[];
  confidence: number;
  trapWarning: boolean;
};

// -------------------------------
// UTILITY FUNCTIONS
// -------------------------------

const impliedProb = (odds: number) => 1 / odds;

// Convert handicap spread → expected goal difference
function spreadToExpectedGD(spread: number): number {
  const abs = Math.abs(spread);
  if (abs <= 0.5) return 0.6;
  if (abs <= 1.0) return 1.1;
  if (abs <= 1.5) return 1.8;
  if (abs <= 2.0) return 2.4;
  return 3.0;
}

// Poisson PMF
function poissonProbability(lambda: number, k: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

// Small factorial helper (0–10 safe)
function factorial(n: number): number {
  if (n === 0) return 1;
  let result = 1;
  for (let i = 1; i <= n; i++) result *= i;
  return result;
}

// Sample from Poisson using inverse transform
function samplePoisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;

  do {
    k++;
    p *= Math.random();
  } while (p > L);

  return k - 1;
}

// -------------------------------
// MAIN PREDICTION FUNCTION
// -------------------------------

export function predictScores(
  games: Game[],
  simulationRuns = 10000,
): Prediction[] {
  return games.map((game) => {
    // -------------------------------
    // 1️⃣ Extract Market Signals
    // -------------------------------

    let expectedGD = 0;
    let favIsHome: boolean | null = null;
    let spreadCount = 0;

    let overProb = 0;
    let underProb = 0;
    let totalsCount = 0;

    let homeProb = 0;
    let awayProb = 0;
    let drawProb = 0;
    let h2hCount = 0;

    let layHome = 0;
    let layAway = 0;
    let layCount = 0;

    for (const bm of game.bookmakers) {
      for (const market of bm.markets) {
        // ----- SPREADS -----
        if (market.key === 'spreads') {
          const fav = market.outcomes.find(
            (o) => o.point !== undefined && o.point < 0,
          );
          if (fav) {
            expectedGD += spreadToExpectedGD(fav.point!);
            favIsHome = fav.name === game.home_team;
            spreadCount++;
          }
        }

        // ----- TOTALS -----
        if (market.key === 'totals') {
          const over = market.outcomes.find(
            (o) => o.name === 'Over' && o.point === 2.5,
          );
          const under = market.outcomes.find(
            (o) => o.name === 'Under' && o.point === 2.5,
          );

          if (over && under) {
            overProb += impliedProb(over.price);
            underProb += impliedProb(under.price);
            totalsCount++;
          }
        }

        // ----- H2H -----
        if (market.key === 'h2h') {
          const home = market.outcomes.find((o) => o.name === game.home_team);
          const away = market.outcomes.find((o) => o.name === game.away_team);
          const draw = market.outcomes.find((o) => o.name === 'Draw');

          if (home && away) {
            homeProb += impliedProb(home.price);
            awayProb += impliedProb(away.price);
            if (draw) drawProb += impliedProb(draw.price);
            h2hCount++;
          }
        }

        // ----- LAY (disagreement only) -----
        if (market.key === 'h2h_lay') {
          const home = market.outcomes.find((o) => o.name === game.home_team);
          const away = market.outcomes.find((o) => o.name === game.away_team);
          if (home && away) {
            layHome += impliedProb(home.price);
            layAway += impliedProb(away.price);
            layCount++;
          }
        }
      }
    }

    // -------------------------------
    // 2️⃣ Average Market Signals
    // -------------------------------

    if (spreadCount > 0) expectedGD /= spreadCount;
    if (totalsCount > 0) {
      overProb /= totalsCount;
      underProb /= totalsCount;
    }
    if (h2hCount > 0) {
      homeProb /= h2hCount;
      awayProb /= h2hCount;
      drawProb /= h2hCount;
    }
    if (layCount > 0) {
      layHome /= layCount;
      layAway /= layCount;
    }

    // -------------------------------
    // 3️⃣ Estimate Total Goals
    // -------------------------------

    const overBias =
      overProb + underProb > 0 ? overProb / (overProb + underProb) : 0.5;

    let totalGoals = 2.2 + overBias * 1.1;

    if (expectedGD >= 1.5) totalGoals += 0.3;

    // Fallback if no spreads
    if (spreadCount === 0 && homeProb + awayProb > 0) {
      const winDiff = Math.abs(homeProb - awayProb);
      expectedGD = winDiff * 2.2;
      favIsHome = homeProb > awayProb;
    }

    // -------------------------------
    // 4️⃣ Solve for λ_home & λ_away
    // -------------------------------

    let lambdaHome: number;
    let lambdaAway: number;

    if (favIsHome === null) {
      lambdaHome = totalGoals / 2;
      lambdaAway = totalGoals / 2;
    } else if (favIsHome) {
      lambdaHome = (totalGoals + expectedGD) / 2;
      lambdaAway = totalGoals - lambdaHome;
    } else {
      lambdaAway = (totalGoals + expectedGD) / 2;
      lambdaHome = totalGoals - lambdaAway;
    }

    lambdaHome = Math.max(0.1, lambdaHome);
    lambdaAway = Math.max(0.1, lambdaAway);

    // -------------------------------
    // 5️⃣ Generate Full Score Matrix (0–6)
    // -------------------------------

    const matrix: ScoreProbability[] = [];
    let bestScore = { home: 0, away: 0 };
    let highestProb = 0;

    for (let h = 0; h <= 6; h++) {
      for (let a = 0; a <= 6; a++) {
        const prob =
          poissonProbability(lambdaHome, h) * poissonProbability(lambdaAway, a);

        matrix.push({ home: h, away: a, probability: prob });

        if (prob > highestProb) {
          highestProb = prob;
          bestScore = { home: h, away: a };
        }
      }
    }

    // -------------------------------
    // 6️⃣ Monte Carlo Simulation
    // -------------------------------

    const simResults: Record<string, number> = {};

    for (let i = 0; i < simulationRuns; i++) {
      const h = samplePoisson(lambdaHome);
      const a = samplePoisson(lambdaAway);
      const key = `${h}-${a}`;
      simResults[key] = (simResults[key] || 0) + 1;
    }

    const simulationTopResults = Object.entries(simResults)
      .map(([score, freq]) => ({
        score,
        frequency: freq,
        probability: freq / simulationRuns,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    // -------------------------------
    // 7️⃣ Trap Detection
    // -------------------------------

    const h2hEdge = Math.abs(homeProb - awayProb);
    const layEdge = Math.abs(layHome - layAway);

    const trapWarning =
      expectedGD >= 1.5 && overBias < 0.52 && h2hEdge < 0.15 && layEdge < 0.15;

    // -------------------------------
    // 8️⃣ Confidence Score
    // -------------------------------

    const confidence = Math.min(
      1,
      (expectedGD / 2.5) * 0.6 + overBias * 0.2 + h2hEdge * 0.2,
    );

    // -------------------------------
    // RETURN RESULT
    // -------------------------------

    return {
      gameId: game.id,
      commenceTime: game.commence_time,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      expectedGoals: {
        home: Number(lambdaHome.toFixed(2)),
        away: Number(lambdaAway.toFixed(2)),
      },
      mostLikelyScore: bestScore,
      // correctScoreMatrix: matrix,
      // simulationTopResults,
      confidence: Number(confidence.toFixed(2)),
      trapWarning,
    };
  });
}
