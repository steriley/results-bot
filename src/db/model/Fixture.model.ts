import mongoose from 'mongoose';

const fixtureSchema = new mongoose.Schema({
  gameWeek: Number,
  commenceTime: String,
  homeTeam: String,
  awayTeam: String,
  finished: Boolean,
  finalScore: {
    homeTeam: Number,
    awayTeam: Number,
  },
});

export const Fixture = mongoose.models.Fixture || mongoose.model('Fixture', fixtureSchema);
