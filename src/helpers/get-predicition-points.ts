export type PillType = 'exact' | 'result' | 'goal' | 'incorrect' | 'none';
export function getPredictionPoints(
  prediction: { home: number; away: number } | undefined,
  actual: { homeTeam: number; awayTeam: number } | undefined,
): {
  points: number;
  type: PillType;
} {
  if (!prediction || !actual) return { points: 0, type: 'none' };

  if (
    prediction.home === actual.homeTeam &&
    prediction.away === actual.awayTeam
  ) {
    return { points: 10, type: 'exact' };
  }

  const predDiff = prediction.home - prediction.away;
  const actualDiff = actual.homeTeam - actual.awayTeam;
  const isPredHomeWin = predDiff > 0;
  const isPredAwayWin = predDiff < 0;
  const isPredDraw = predDiff === 0;

  const isActualHomeWin = actualDiff > 0;
  const isActualAwayWin = actualDiff < 0;
  const isActualDraw = actualDiff === 0;

  if (
    (isPredHomeWin && isActualHomeWin) ||
    (isPredAwayWin && isActualAwayWin) ||
    (isPredDraw && isActualDraw)
  ) {
    return { points: 3, type: 'result' };
  }

  if (
    prediction.home === actual.homeTeam ||
    prediction.away === actual.awayTeam
  ) {
    return { points: 1, type: 'goal' };
  }

  return { points: 0, type: 'incorrect' };
}
