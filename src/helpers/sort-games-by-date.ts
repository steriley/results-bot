import type { EnrichedFixture } from './merge-fixtures-predictions';

export const fixtureByDates = (fixture: EnrichedFixture[]) => {
  return fixture.reduce(
    (acc, game) => {
      const date = new Date(game.commenceTime ?? Date.now());
      const dateKey = date.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(game);
      return acc;
    },
    {} as Record<string, typeof fixture>,
  );
};

export const fixtureDates = (gamesByDate: Record<string, any>) => {
  return Object.keys(gamesByDate).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );
};
