import { getLatestOdds } from '../../helpers/get-latest-odds';
import { predictScores } from '../../helpers/prediction-engine';
import mockData from '../../mocks/premier-league-games.json';
import { type APIRoute } from 'astro';

const json = (obj: Record<string, any>) => new Response(JSON.stringify(obj));

export const GET: APIRoute = async () => {
  const USE_MOCK_DATA = true;
  const odds = USE_MOCK_DATA ? mockData : await getLatestOdds();
  const predictions = predictScores(odds as any);

  return json(predictions);
};
