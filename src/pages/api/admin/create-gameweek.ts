import { getSecret } from 'astro:env/server';
import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { Fixture } from '@/db/model/Fixture.model';
import { Match, type TMatch } from '@/db/model/Match.model';
import { getGameweekFixtures } from '@/helpers/gameweek';
import { normaliseTeamName } from '@/helpers/normalise-team-name';

const json = (obj: unknown) => new Response(JSON.stringify(obj));

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const gameWeek = url.searchParams.get('gameweek');
  const parsedGameWeek = parseInt(gameWeek ?? '1', 10);
  const connectionUri = getSecret('MONGO_DB_URI') ?? '';

  await mongoose.connect(connectionUri);

  const fixtures = await Fixture.find({ gameWeek: parsedGameWeek });

  const matches = fixtures.map((fixture) => {
    const match = {
      gameWeek: 0,
      commenceTime: '',
      homeTeam: '',
      awayTeam: '',
      isComplete: false,
      homeScore: 0,
      awayScore: 0,
    };
    match.gameWeek = parsedGameWeek;
    match.commenceTime = fixture.commenceTime;
    match.homeTeam = normaliseTeamName(fixture.homeTeam);
    match.awayTeam = normaliseTeamName(fixture.awayTeam);
    match.isComplete = fixture.finished;
    match.homeScore = fixture.finalScore?.homeTeam ?? 0;
    match.awayScore = fixture.finalScore?.awayTeam ?? 0;
    return match;
  });

  try {
    const result = await Match.insertMany(matches);
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
  const fplFixtures = await getGameweekFixtures(gameWeek);

  const updatedMatches = matches.map((match) => {
    const fixture = fplFixtures.find(
      (f) => f.homeTeam === match.homeTeam && f.awayTeam === match.awayTeam,
    );

    return {
      updateOne: {
        filter: { _id: match._id },
        update: {
          $set: {
            commenceTime: fixture?.commenceTime,
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
