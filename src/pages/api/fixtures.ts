import type { APIRoute } from 'astro';
import { getGameweekDateRange } from '@/helpers/game-week-date-range';
import { getGameweekFixtures } from '@/helpers/gameweek';

const json = (obj: Record<string, unknown>) =>
  new Response(JSON.stringify(obj));

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const gameweek = url.searchParams.get('gameweek') ?? '1';

  const fixtures = await getGameweekFixtures(parseInt(gameweek, 10));
  const gameweekDateRange = getGameweekDateRange(fixtures);

  return json({ fixtures, gameweekDateRange });
};
