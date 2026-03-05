import { getSecret } from 'astro:env/server';
import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { Bootstrap } from '@/db/model/Bootstrap.model';
import { Match } from '@/db/model/Match.model';
import { UserPrediction } from '@/db/model/UserPrediction.model';
import { getGameweekDateRange } from '@/helpers/game-week-date-range';
import { $gameweek } from '@/stores/gameweek';
import type { GameweekFixture } from '@/types/gameweek';

const json = (obj: unknown) => new Response(JSON.stringify(obj));

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const gameWeek = url.searchParams.get('gameweek');
  let parsedGameWeek = parseInt(gameWeek ?? '1', 10);

  const connectionUri = getSecret('MONGO_DB_URI') ?? '';

  await mongoose.connect(connectionUri);

  if (!gameWeek) {
    const data = await Bootstrap.findOne({ 'events.is_current': true }, { 'events.$': 1 });
    parsedGameWeek = data.events[0].id;
  }

  $gameweek.set(parsedGameWeek);

  let fixtures = await Match.find({ gameWeek: parsedGameWeek }).lean();

  if (url.pathname === '/predictions') {
    const userPredictions = await UserPrediction.find({ gameWeek: parsedGameWeek }).lean();
    fixtures = fixtures.map((fixture) => {
      const prediction = userPredictions.find(
        (prediction) => fixture._id.toString() === prediction.matchId.toString(),
      );
      return {
        ...fixture,
        homeScoreBot: prediction?.homeScore ?? 0,
        awayScoreBot: prediction?.awayScore ?? 0,
        score: prediction?.score ?? 0,
      };
    });
  }

  const dateRange = getGameweekDateRange(fixtures);

  const totalPoints = fixtures.reduce((total, fixture) => total + fixture.score, 0);

  const groupedFixtures = fixtures.reduce<Record<string, GameweekFixture[]>>((groups, fixture) => {
    const date = new Date(fixture.commenceTime).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(fixture);
    return groups;
  }, {});

  return json({
    dateRange,
    fixtures,
    gameWeek: parsedGameWeek,
    totalPoints,
    groupedFixtures,
  });
};
