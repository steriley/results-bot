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

export const getActiveEvent = async () => {
  const result = await Bootstrap.aggregate([
    {
      $match: {
        $or: [{ 'events.is_current': true }, { 'events.is_next': true }],
      },
    },
    {
      $project: {
        events: {
          $filter: {
            input: '$events',
            as: 'event',
            cond: {
              $or: [{ $eq: ['$$event.is_current', true] }, { $eq: ['$$event.is_next', true] }],
            },
          },
        },
        season: 1,
        _id: 1,
      },
    },
  ]);

  return (
    result[0]?.events && {
      season: result[0].season,
      gameWeek: result[0].events[0].finished ? result[0].events[1].id : result[0].events[0].id,
      nextDeadline: result[0].events[1].deadline_time,
    }
  );
};
