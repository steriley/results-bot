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

export const getPredictionAccuracy = async (userId: string) => {
  const result = await UserPrediction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$userId',
        total: { $sum: 1 },
        correct: {
          $sum: { $cond: [{ $eq: ['$score', 10] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalPredictions: '$total',
        correctPredictions: '$correct',
        accuracyPercentage: {
          $cond: [
            { $eq: ['$total', 0] },
            0,
            { $multiply: [{ $divide: ['$correct', '$total'] }, 100] },
          ],
        },
      },
    },
  ]);

  return result[0] || { totalPredictions: 0, correctPredictions: 0, accuracyPercentage: 0 };
};
