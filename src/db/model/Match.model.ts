import mongoose, { type InferSchemaType, model, Schema } from 'mongoose';

const oddsMarketSchema = new Schema({
  h2hAway: Number,
  h2hDraw: Number,
  h2hHome: Number,
  h2hLayHome: Number,
  liquidity: Number,
  marketEfficiency: Number,
  over25: Number,
  timestamp: Date,
  under25: Number,
});

const matchSchema = new Schema({
  _id: Schema.Types.ObjectId,
  gameWeek: { type: Number, required: true },
  commenceTime: Date,
  homeTeam: String,
  awayTeam: String,
  isComplete: { type: Boolean, default: false },
  awayScore: { type: Number, default: 0 },
  awayScoreBot: { type: Number, default: null },
  homeScore: { type: Number, default: 0 },
  homeScoreBot: { type: Number, default: null },
  score: { type: Number, default: 0 },
  oddsSnapshots: { type: [oddsMarketSchema], default: [] },
});

export type TMatch = InferSchemaType<typeof matchSchema>;
export const Match = mongoose.models.Match || model<TMatch>('Match', matchSchema);
