import type { GameweekFixture } from '../types/gameweek';

export interface GameweekDateRange {
  start: string;
  end: string;
}

export function getGameweekDateRange(fixtures: GameweekFixture[]): GameweekDateRange {
  if (!fixtures.length) {
    throw new Error('No fixtures provided');
  }

  // Filter out fixtures with no kickoff time (postponed/unscheduled)
  const kickoffTimes = fixtures
    .map((f) => f.commenceTime)
    .filter((time): time is string => time !== null)
    .map((time) => new Date(time).getTime());

  if (kickoffTimes.length === 0) {
    throw new Error('No scheduled fixtures found');
  }

  const start = `${new Date(Math.min(...kickoffTimes)).toISOString().split('.')[0]}Z`;
  const end = `${new Date(Math.max(...kickoffTimes)).toISOString().split('.')[0]}Z`;

  return {
    start,
    end,
  };
}
