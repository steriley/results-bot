import { getSecret } from 'astro:env/server';
import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { Match, type TMatch } from '@/db/model/Match.model';
import { type TUserPrediction, UserPrediction } from '@/db/model/UserPrediction.model';
import { getPredictionPoints } from '@/helpers/get-predicition-points';

interface MatchResult {
  matchId: string;
  gameWeek: number;
  homeScore: number;
  awayScore: number;
}

type MatchScores = Record<string, [number, number]>;

const json = (obj: unknown) => new Response(JSON.stringify(obj));

function parseMatchResults(scores: MatchScores, gameWeek: number): MatchResult[] {
  return Object.entries(scores).map(([matchId, [homeScore, awayScore]]) => ({
    userId: new mongoose.Types.ObjectId('69a765f78e8b852ae5d5be1f'),
    matchId,
    gameWeek,
    homeScore,
    awayScore,
  }));
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { gameWeek, scores } = body;

  const results = parseMatchResults(scores, gameWeek);

  const connectionUri = getSecret('MONGO_DB_URI') ?? '';
  await mongoose.connect(connectionUri);

  // TODO: change this to update with upsert
  await UserPrediction.create(results);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
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
