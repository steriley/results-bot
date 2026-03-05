import mongoose from 'mongoose';

const outcomeSchema = new mongoose.Schema({
  name: String,
  price: Number,
  point: Number,
  link: String,
  sid: String,
  bet_limit: Number,
});

const marketSchema = new mongoose.Schema({
  key: String,
  last_update: Date,
  link: String,
  sid: String,
  outcomes: [outcomeSchema],
});

const bookmakerSchema = new mongoose.Schema({
  key: String,
  title: String,
  last_update: Date,
  link: String,
  sid: String,
  markets: [marketSchema],
});

const oddsMarketSchema = new mongoose.Schema({
  matchId: mongoose.Schema.Types.ObjectId,
  gameWeek: { type: Number, required: true },
  season: String,
  sport_key: String,
  sport_title: String,
  commence_time: String,
  home_team: String,
  away_team: String,
  bookmakers: [bookmakerSchema],
});

export const OddsMarket =
  mongoose.models.OddsMarket || mongoose.model('OddsMarket', oddsMarketSchema);
