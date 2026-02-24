import type { APIRoute } from 'astro';
import { getGameweekDateRange } from '@/helpers/game-week-date-range';
import { getGameweekFixtures } from '@/helpers/gameweek';

const json = (obj: Record<string, unknown>) => new Response(JSON.stringify(obj));

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const gameweek = url.searchParams.get('gameweek');

  const fixtures = await getGameweekFixtures(gameweek);
  const dateRange = getGameweekDateRange(fixtures);
  const gameWeek = fixtures.length > 0 ? fixtures[0].gameWeek : null;

  return json({ fixtures, dateRange, gameWeek });
};
