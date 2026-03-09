import { getSecret } from 'astro:env/server';
import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { getActiveEvent } from '@/db/model/Bootstrap.model';
import { Match } from '@/db/model/Match.model';
import { getPredictionAccuracy, UserPrediction } from '@/db/model/UserPrediction.model';
import { getGameweekDateRange } from '@/helpers/game-week-date-range';
import { $gameweek } from '@/stores/gameweek';
import type { GameweekFixture } from '@/types/gameweek';

const json = (obj: unknown) => new Response(JSON.stringify(obj));

export const GET: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  const url = new URL(request.url);
  const gameWeek = url.searchParams.get('gameweek');
  let parsedGameWeek = parseInt(gameWeek ?? '1', 10);

  const connectionUri = getSecret('MONGO_DB_URI') ?? '';

  await mongoose.connect(connectionUri);

  if (!gameWeek) {
    const { gameWeek } = await getActiveEvent();

    parsedGameWeek = gameWeek;
  }

  $gameweek.set(parsedGameWeek);

  let accuracy = 0;
  let fixtures = await Match.find({ gameWeek: parsedGameWeek }).lean();

  if (url.pathname === '/predictions') {
    const userPredictions = await UserPrediction.find({ gameWeek: parsedGameWeek }).lean();

    fixtures = fixtures.map((fixture) => {
      const prediction = userPredictions.find(
        (prediction) => fixture._id.toString() === prediction.matchId.toString(),
      );
      return {
        ...fixture,
        homeScoreBot: prediction?.homeScore ?? null,
        awayScoreBot: prediction?.awayScore ?? null,
        score: prediction?.score ?? 0,
      };
    });

    accuracy = user?.id ? (await getPredictionAccuracy(user.id)).accuracyPercentage : 0;
  }

  const dateRange = getGameweekDateRange(fixtures);

  const totalPoints = fixtures.reduce((total, fixture) => total + fixture.score, 0);

  const groupedFixtures = [
    ...fixtures
      .reduce<Map<string, GameweekFixture[]>>((groups, fixture) => {
        const date = new Date(fixture.commenceTime).toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        const group = groups.get(date);
        group ? group.push(fixture) : groups.set(date, [fixture]);
        return groups;
      }, new Map())
      .entries(),
  ]
    .map(([date, fixtures]) => ({ date, fixtures }))
    .sort(
      (a, b) =>
        new Date(a.fixtures[0].commenceTime).getTime() -
        new Date(b.fixtures[0].commenceTime).getTime(),
    );

  return json({
    accuracy,
    dateRange,
    fixtures,
    gameWeek: parsedGameWeek,
    totalPoints,
    groupedFixtures,
  });
};
