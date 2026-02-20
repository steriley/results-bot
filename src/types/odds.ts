export interface Outcome {
  name: string;
  price: number;
  link: string | null;
  sid: string;
  bet_limit: number | null;
}

export interface Market {
  key: string;
  last_update: string;
  link: string | null;
  sid: string;
  outcomes: Outcome[];
}

export interface Bookmaker {
  key: string;
  title: string;
  last_update: string;
  link: string | null;
  sid: string;
  markets: Market[];
}

export interface OddsGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  home_rotation: number | null;
  away_rotation: number | null;
  bookmakers: Bookmaker[];
}
