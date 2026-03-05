import mongoose, { type InferSchemaType, model, Schema } from 'mongoose';

const FplTeam = new Schema({
  id: Number,
  name: String,
  short_name: String,
});

const FplEvent = new Schema({
  deadline_time: String,
  finished: Boolean,
  id: Number,
  is_current: Boolean,
  is_next: Boolean,
  is_previous: Boolean,
});

const bootstrapSchema = new Schema(
  {
    season: String,
    events: [FplEvent],
    teams: [FplTeam],
  },
  {
    timestamps: true,
  },
);

export type TBootstrap = InferSchemaType<typeof bootstrapSchema>;

export const Bootstrap =
  mongoose.models.Bootstrap || model<TBootstrap>('Bootstrap', bootstrapSchema);
