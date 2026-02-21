import type { GameweekFixture } from '../types/gameweek';

interface GameweekDateRange {
  earliest: string;
  latest: string;
}

export function getGameweekDateRange(
  fixtures: GameweekFixture[],
): GameweekDateRange {
  // Filter out fixtures with no kickoff time (postponed/unscheduled)
  const kickoffTimes = fixtures
    .map((f) => f.commenceTime)
    .filter((time): time is string => time !== null)
    .map((time) => new Date(time).getTime());

  if (kickoffTimes.length === 0) {
    throw new Error('No scheduled fixtures found');
  }

  return {
    earliest:
      new Date(Math.min(...kickoffTimes)).toISOString().split('.')[0] + 'Z',
    latest:
      new Date(Math.max(...kickoffTimes)).toISOString().split('.')[0] + 'Z',
  };
}
