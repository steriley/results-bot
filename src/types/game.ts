export interface GamePrediction {
  gameId: string;
  expectedGoals: { home: number; away: number };
  mostLikelyScore: { home: number; away: number };
  confidence: number;
  trapWarning: boolean;
}

export interface Game {
  gameWeek?: number;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  finished: boolean;
  finalScore: { home: number; away: number } | null;
  prediction: GamePrediction | null;
  userPrediction?: {
    home?: number;
    away?: number;
  };
}
