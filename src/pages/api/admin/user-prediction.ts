import { getSecret } from 'astro:env/server';
import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { Match, type TMatch } from '@/db/model/Match.model';
import { type TUserPrediction, UserPrediction } from '@/db/model/UserPrediction.model';
import { getPredictionPoints } from '@/helpers/get-predicition-points';

type MatchScores = Record<string, [number, number]>;

const json = (obj: unknown) => new Response(JSON.stringify(obj));

function parseMatchResults(params: { scores: MatchScores; gameWeek: number; userId: string }) {
  return Object.entries(params.scores).map(([matchId, [homeScore, awayScore]]) => ({
    updateOne: {
      filter: { userId: params.userId, matchId },
      update: {
        $set: {
          gameWeek: params.gameWeek,
          homeScore,
          awayScore,
        },
      },
      upsert: true,
    },
  }));
}

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await request.json();
  const { gameWeek, scores } = body;
  const user = locals.user;

  if (!user) {
    return new Response(JSON.stringify({ success: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const results = parseMatchResults({ scores, gameWeek, userId: user.id });

  const connectionUri = getSecret('MONGO_DB_URI') ?? '';
  await mongoose.connect(connectionUri);

  try {
    const result = await UserPrediction.bulkWrite(results);
    return json(result);
  } catch (error) {
    return json({ error });
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { gameWeek } = body;

  const connectionUri = getSecret('MONGO_DB_URI') ?? '';
  await mongoose.connect(connectionUri);

  const matches: TMatch[] = await Match.find({ gameWeek }).lean();
  const userPredictions: TUserPrediction[] = await UserPrediction.find({ gameWeek }).lean();

  const updatedMatches = userPredictions.map((user) => {
    const fixture = matches.find((m) => m._id.toString() === user.matchId.toString());

    const prediction = {
      home: user.homeScore ?? 0,
      away: user.awayScore ?? 0,
    };
    const finalScore = {
      home: fixture?.homeScore ?? 0,
      away: fixture?.awayScore ?? 0,
    };

    const { score } = getPredictionPoints(prediction, finalScore);

    return {
      updateOne: {
        filter: { matchId: new mongoose.Types.ObjectId(user.matchId.toString()) },
        update: { $set: { score } },
        upsert: true,
      },
    };
  });

  try {
    const result = await UserPrediction.bulkWrite(updatedMatches);
    return json(result);
  } catch (error) {
    return json({ error });
  }
};
