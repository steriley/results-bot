export type GameweekFixture = {
  _id: string;
  awayScore: number;
  awayScoreBot: number | null;
  awayTeam: string;
  commenceTime: string;
  gameWeek: number;
  homeScore: number;
  homeScoreBot: number | null;
  homeTeam: string;
  isComplete: boolean;
  score: number;
};
