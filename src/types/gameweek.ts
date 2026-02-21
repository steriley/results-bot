export type GameweekFixture = {
  gameId: string;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  finished: boolean;
  finalScore: {
    home: number;
    away: number;
  } | null;
};
