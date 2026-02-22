import { getGameweekDateRange } from '@/helpers/game-week-date-range';
import { getGameweekFixtures } from '@/helpers/gameweek';
import { $currentGameweek } from '@/stores/store';
import { type APIRoute } from 'astro';

const json = (obj: Record<string, any>) => new Response(JSON.stringify(obj));

export const GET: APIRoute = (async ({ params }) => {
  const gameweek = params.gameweek || $currentGameweek.get().toString();
  const fixtures = await getGameweekFixtures(parseInt(gameweek));
  const gameweekDateRange = getGameweekDateRange(fixtures);

  return json({ fixtures, gameweekDateRange });
}) satisfies APIRoute;
