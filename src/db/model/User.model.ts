import mongoose, { type InferSchemaType, model, Schema } from 'mongoose';

const userSchema = new Schema(
  {
    _id: Schema.Types.ObjectId,
    name: String,
    email: String,
    emailVerified: Boolean,
    roles: ['user', 'admin'],
    banned: Boolean,
  },
  {
    timestamps: true,
  },
);

export type TUser = InferSchemaType<typeof userSchema>;

export const User = mongoose.models.User || model<TUser>('User', userSchema, 'user');
