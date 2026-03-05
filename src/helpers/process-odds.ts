import { normaliseTeamName } from './normalise-team-name';

interface Outcome {
  name: string;
  price: number;
  [key: string]: unknown;
}

interface Market {
  key: string;
  outcomes: Outcome[];
  [key: string]: unknown;
}

interface Bookmaker {
  key: string;
  markets: Market[];
  [key: string]: unknown;
}

export interface OddsMarket {
  _id: {
    $oid?: string;
  };
  id: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
  [key: string]: unknown;
}

export function processMatchOdds(data: OddsMarket[], gameWeek: number, season: string) {
  return data.map((match) => ({
    ...match,
    gameWeek,
    season,
    home_team: normaliseTeamName(match.home_team),
    away_team: normaliseTeamName(match.away_team),
    bookmakers: match.bookmakers.map((bookie) => ({
      ...bookie,
      markets: bookie.markets.map((market) => ({
        ...market,
        outcomes: market.outcomes.map((outcome) => {
          // Only normalize if the name matches a team (skips "Draw", "Over", etc.)
          const isTeam = outcome.name === match.home_team || outcome.name === match.away_team;

          return {
            ...outcome,
            name: isTeam ? normaliseTeamName(outcome.name) : outcome.name,
          };
        }),
      })),
    })),
  }));
}
