import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { admin } from 'better-auth/plugins';
import { MongoClient } from 'mongodb';

const connectionUri = import.meta.env.MONGO_DB_URI ?? '';
const client = new MongoClient(connectionUri);
const db = client.db();

export const auth = betterAuth({
  database: mongodbAdapter(db, { client }),
  baseURL: import.meta.env.BETTER_AUTH_URL,
  plugins: [admin()],
  emailAndPassword: {
    enabled: true,
  },
});
