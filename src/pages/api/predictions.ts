import type { APIRoute } from 'astro';
import { getLatestOdds } from '@/helpers/get-latest-odds';
import { type Prediction, predictScores } from '@/helpers/prediction-engine';
import mockData from '@/mocks/premier-league-games.json';

const json = (obj: Prediction[]) => new Response(JSON.stringify(obj));

export const GET: APIRoute = async () => {
  const USE_MOCK_DATA = true;
  const now = new Date().toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const odds = USE_MOCK_DATA ? mockData : await getLatestOdds(now, tomorrow);
  const predictions = predictScores(odds);

  return json(predictions);
};
