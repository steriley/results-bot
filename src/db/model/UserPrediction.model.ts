import mongoose, { type InferSchemaType, model, Schema } from 'mongoose';

const userPredictionSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
    },
    gameWeek: { type: Number, required: true },
    homeScore: { type: Number, required: true },
    awayScore: { type: Number, required: true },
    score: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
);

userPredictionSchema.index({ userId: 1, matchId: 1 }, { unique: true });

export type TUserPrediction = InferSchemaType<typeof userPredictionSchema>;

export const UserPrediction =
  mongoose.models.UserPrediction || model<TUserPrediction>('UserPrediction', userPredictionSchema);
