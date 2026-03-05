import type { APIRoute } from 'astro';
import { Match, type TMatch } from '@/db/model/Match.model';
import { getGameweekFixtures } from '@/helpers/gameweek';
import { getPredictionPoints } from '@/helpers/get-predicition-points';

const json = (obj: unknown) => new Response(JSON.stringify(obj));

export const PATCH: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { gameWeek } = body;

  const matches: TMatch[] = await Match.find({ gameWeek }).lean();
  const fplFixtures = await getGameweekFixtures(gameWeek);

  const updatedMatches = matches.map((match) => {
    const fixture = fplFixtures.find(
      (f) => f.homeTeam === match.homeTeam && f.awayTeam === match.awayTeam,
    );

    const prediction = {
      home: match.homeScoreBot ?? 0,
      away: match.awayScoreBot ?? 0,
    };
    const finalScore = {
      home: fixture?.finalScore?.homeTeam ?? 0,
      away: fixture?.finalScore?.awayTeam ?? 0,
    };
    const { score } = getPredictionPoints(prediction, finalScore);

    return {
      updateOne: {
        filter: { _id: match._id },
        update: {
          $set: {
            isComplete: fixture?.finished,
            homeScore: finalScore.home,
            awayScore: finalScore.away,
            score,
          },
        },
        upsert: false,
      },
    };
  });

  try {
    const result = await Match.bulkWrite(updatedMatches);
    return json(result);
  } catch (error) {
    return json({ error });
  }
};
