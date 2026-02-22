export type PillType = 'exact' | 'result' | 'goal' | 'incorrect' | 'none';
export function getPredictionPoints(
  prediction: { home: number; away: number } | undefined,
  actual: { home: number; away: number } | undefined,
): {
  score: number;
  type: PillType;
} {
  if (!prediction || !actual) return { score: 0, type: 'none' };

  if (prediction.home === actual.home && prediction.away === actual.away) {
    return { score: 10, type: 'exact' };
  }

  const predDiff = prediction.home - prediction.away;
  const actualDiff = actual.home - actual.away;
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
    return { score: 3, type: 'result' };
  }

  if (prediction.home === actual.home || prediction.away === actual.away) {
    return { score: 1, type: 'goal' };
  }

  return { score: 0, type: 'incorrect' };
}
