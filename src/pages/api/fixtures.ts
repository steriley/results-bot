import type { APIRoute } from 'astro';
import { getGameweekDateRange } from '@/helpers/game-week-date-range';
import { getGameweekFixtures } from '@/helpers/gameweek';
import { $gameweek } from '@/stores/gameweek';

const json = (obj: Record<string, unknown>) =>
  new Response(JSON.stringify(obj));

export const GET: APIRoute = (async ({ request }) => {
  const url = new URL(request.url);
  const gameweek = url.searchParams.get('gameweek');

  console.log('GET /api/fixtures', { gameweek });

  const fixtures = await getGameweekFixtures(
    parseInt($gameweek.get().toString(), 10),
  );
  const gameweekDateRange = getGameweekDateRange(fixtures);

  return json({ fixtures, gameweekDateRange });
}) satisfies APIRoute;

export const POST: APIRoute = (async ({ request }) => {
  const body = await request.json();

  const gameweek = body.gameweek ?? $gameweek.get().toString();
  const fixtures = await getGameweekFixtures(parseInt(gameweek, 10));
  const gameweekDateRange = getGameweekDateRange(fixtures);

  return json({ fixtures, gameweekDateRange });
}) satisfies APIRoute;
