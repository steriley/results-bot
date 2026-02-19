export interface Game {
  gameId: string;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  expectedGoals: {
    home: number;
    away: number;
  };
  mostLikelyScore: {
    home: number;
    away: number;
  };
  confidence: number;
  trapWarning: boolean;
  userPrediction?: {
    home?: number;
    away?: number;
  };
}
