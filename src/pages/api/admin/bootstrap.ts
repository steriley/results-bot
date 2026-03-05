import { getSecret } from 'astro:env/server';
import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { Bootstrap } from '@/db/model/Bootstrap.model';
import { fetchBootstrap } from '@/helpers/gameweek';
import { getSeason } from '@/helpers/get-season';

export const GET: APIRoute = async () => {
  const connectionUri = getSecret('MONGO_DB_URI') ?? '';
  const data = await fetchBootstrap();

  await mongoose.connect(connectionUri);

  const bootstrap = await Bootstrap.findOneAndUpdate(
    { season: getSeason(new Date()) },
    { ...data },
    { upsert: true },
  );

  return new Response(JSON.stringify(bootstrap), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
