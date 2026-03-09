import { getSecret } from 'astro:env/server';
import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { Match } from '@/db/model/Match.model';
import { OddsMarket } from '@/db/model/OddsMarket.model';
import { getGameweekDateRange } from '@/helpers/game-week-date-range';
import { getLatestOdds } from '@/helpers/get-latest-odds';
import { getSeason } from '@/helpers/get-season';
import { processMatchOdds } from '@/helpers/process-odds';

const json = (obj: unknown) => new Response(JSON.stringify(obj));

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const gameweek = url.searchParams.get('gameweek');
  const parsedGameWeek = parseInt(gameweek ?? '1', 10);

  const connectionUri = getSecret('MONGO_DB_URI') ?? '';
  await mongoose.connect(connectionUri);

  const fixtures = await Match.find(
    { gameWeek: parsedGameWeek },
    { _id: 1, homeTeam: 1, awayTeam: 1, commenceTime: 1 },
  ).lean();

  const { start, end } = getGameweekDateRange(fixtures);
  const latestOdds = await getLatestOdds(start, end);
  const normalisedOdds = processMatchOdds(latestOdds, parsedGameWeek, getSeason(new Date()));

  const oddsLinkedToMatches = normalisedOdds.map((match) => {
    const fixture = fixtures.find(
      ({ homeTeam, awayTeam }) => homeTeam === match.home_team && awayTeam === match.away_team,
    );
    return {
      ...match,
      _id: match._id?.$oid || match._id,
      matchId: fixture?._id,
    };
  });

  await OddsMarket.insertMany(oddsLinkedToMatches);

  return json(latestOdds);
};
