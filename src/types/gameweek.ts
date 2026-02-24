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
