import type { GameweekFixture } from '../types/gameweek';

// ─── Team Name Aliases ────────────────────────────────────────────────────────
// Maps FPL short names → canonical names used in predicted scores.

// Extend this as you encounter new mismatches between data sources.
const TEAM_NAME_ALIASES: Record<string, string> = {
  Brighton: 'Brighton and Hove Albion',
  'Man City': 'Manchester City',
  'Man Utd': 'Manchester United',
  Newcastle: 'Newcastle United',
  "Nott'm Forest": 'Nottingham Forest',
  Spurs: 'Tottenham Hotspur',
  Wolves: 'Wolverhampton Wanderers',
  'West Ham': 'West Ham United',
};

function normaliseTeamName(name: string): string {
  return TEAM_NAME_ALIASES[name] ?? name;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PredictedScore {
  gameId: string;
  expectedGoals: { home: number; away: number };
  mostLikelyScore: { home: number; away: number };
  confidence: number;
  trapWarning: boolean;
}

export interface EnrichedFixture extends GameweekFixture {
  gameId: string;
  confidence: number;
  expectedGoals: { home: number; away: number };
  predictedScoreHome: number;
  predictedScoreAway: number;
  points: {
    score: number;
    type: 'exact' | 'result' | 'goal' | 'incorrect' | 'none';
  };
}

// ─── Merge Function ───────────────────────────────────────────────────────────

/**
 * Merges FPL fixtures with predicted scores.
 *
 * Matching strategy: commenceTime + normalised home team name.
 * This is more reliable than team name alone (handles double gameweeks)
 * and more reliable than team name alone (handles naming discrepancies).
 *
 * Fixtures with no matching prediction get prediction: null.
 */
export function mergeFixturesWithPredictions(
  fixtures: GameweekFixture[],
  predictions: (PredictedScore & { commenceTime: string; homeTeam: string })[],
): EnrichedFixture[] {
  // Build a lookup map keyed by "commenceTime|normalisedHomeTeam"
  const predictionMap = new Map(predictions.map((p) => [`${p.commenceTime}|${p.homeTeam}`, p]));

  return fixtures.map((fixture) => {
    const normalisedHome = normaliseTeamName(fixture.homeTeam);
    const lookupKey = `${fixture.commenceTime}|${normalisedHome}`;
    const match = predictionMap.get(lookupKey) ?? null;

    return {
      ...fixture,
      gameId: match?.gameId ?? '',
      confidence: match?.confidence ?? 0,
      expectedGoals: match?.expectedGoals ?? { home: 0, away: 0 },
      predictedScoreHome: match?.mostLikelyScore.home ?? 0,
      predictedScoreAway: match?.mostLikelyScore.away ?? 0,
      points: {
        score: 0,
        type: 'none' as const,
      },
    };
  });
}
