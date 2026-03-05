import { getSecret } from 'astro:env/server';
import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { Match } from '@/db/model/Match.model';
import { OddsMarket } from '@/db/model/OddsMarket.model';
import type { EngineOutput, HistoricalMatch, RawFixture } from '@/game-engine';
import { DEFAULT_CONFIG, runPredictionEngine } from '@/game-engine';
import { fetchFplFixtures } from '@/helpers/epl-history';

const json = (obj: unknown) => new Response(JSON.stringify(obj));

function groupByLastUpdate(docs: RawFixture[]): RawFixture[][] {
  const groups = docs.reduce(
    (acc, doc) => {
      const rawUpdate = doc.bookmakers?.[0]?.last_update;
      const dateStr = new Date(rawUpdate).toISOString();

      if (typeof dateStr !== 'string') return acc;
      const dateKey = dateStr.split('T')[0];

      const docWithId = {
        ...doc,
        id: doc.matchId.toString(),
      };

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }

      acc[dateKey].push(docWithId);
      return acc;
    },
    {} as Record<string, RawFixture[]>,
  );

  return Object.values(groups);
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const gameweek = url.searchParams.get('gameweek');
  const parsedGameWeek = parseInt(gameweek ?? '1', 10);

  const connectionUri = getSecret('MONGO_DB_URI') ?? '';
  await mongoose.connect(connectionUri);

  const fixtures = await fetchFplFixtures(['2024-25', '2025-26']);
  const oddsMarket = await OddsMarket.find({ gameWeek: parsedGameWeek }).lean();

  // ── Odds files ──────────────────────────────────────────────
  // Pass one file for a single snapshot, or multiple files captured
  // at different times during the week for odds movement analysis.
  const oddsFiles: RawFixture[][] = groupByLastUpdate(oddsMarket);

  // ── Historical matches ───────────────────────────────────────
  // Provide completed EPL matches. More seasons = more stable ratings.
  // Date values must be Date objects (use a JSON reviver when loading).
  // { date: new Date("2024-08-17"), homeTeam: "Arsenal", awayTeam: "Wolves", homeGoals: 2, awayGoals: 0 },
  const historicalMatches: HistoricalMatch[] = fixtures;

  const output: EngineOutput = runPredictionEngine(oddsFiles, historicalMatches, DEFAULT_CONFIG);

  const finalOutput = output.fixtures.map((fixture) => {
    return {
      matchId: fixture.prediction.fixtureId,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      homeScore: fixture.prediction.predictedScore.home,
      awayScore: fixture.prediction.predictedScore.away,
    };
  });

  const predictionUpdates = finalOutput.map((fixture) => {
    return {
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(fixture.matchId) },
        update: {
          $set: {
            homeScoreBot: fixture.homeScore,
            awayScoreBot: fixture.awayScore,
          },
        },
        upsert: false,
      },
    };
  });

  try {
    const result = await Match.bulkWrite(predictionUpdates);
    return json(result);
  } catch (error) {
    return json({ error });
  }
};
