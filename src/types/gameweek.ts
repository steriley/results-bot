// TODO: look to join this type / replace / remove with the same one in src/helpers/gameweek.ts
export type GameweekFixture = {
  gameWeek: number;
  commenceTime: string | null;
  homeTeam: string;
  awayTeam: string;
  finished: boolean;
  finalScore: {
    homeTeam: number | null;
    awayTeam: number | null;
  } | null;
};
