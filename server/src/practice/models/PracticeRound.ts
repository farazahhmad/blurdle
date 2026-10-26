import mongoose, { Document, Schema } from 'mongoose';

export type PracticeMode = 'classic' | 'flashlight' | 'double_exposure' | 'narrator';
export type PracticeDifficulty = 'relaxed' | 'standard' | 'hard';
export type PracticeStatus = 'playing' | 'won' | 'lost' | 'abandoned';

export interface IPracticeRound extends Document {
  clientId: string;
  userId?: mongoose.Types.ObjectId | null;
  mode: PracticeMode;
  movieIds: mongoose.Types.ObjectId[];
  narratorEntryId?: mongoose.Types.ObjectId | null;
  difficulty: PracticeDifficulty;
  filters: {
    decade?: number;
    genre?: string;
  };
  state: any;
  score?: number;
  status: PracticeStatus;
  createdAt: Date;
  updatedAt: Date;
}

const PracticeRoundSchema = new Schema<IPracticeRound>(
  {
    clientId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    mode: {
      type: String,
      required: true,
      enum: ['classic', 'flashlight', 'double_exposure', 'narrator'],
    },
    movieIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'PracticeMovie',
        required: true,
      },
    ],
    narratorEntryId: {
      type: Schema.Types.ObjectId,
      ref: 'PracticeNarratorEntry',
      default: null,
    },
    difficulty: {
      type: String,
      enum: ['relaxed', 'standard', 'hard'],
      default: 'standard',
    },
    filters: {
      decade: { type: Number, default: undefined },
      genre: { type: String, default: undefined },
    },
    state: {
      type: Schema.Types.Mixed,
      default: {},
    },
    score: {
      type: Number,
      default: undefined,
    },
    status: {
      type: String,
      enum: ['playing', 'won', 'lost', 'abandoned'],
      default: 'playing',
    },
  },
  {
    timestamps: true,
  }
);

PracticeRoundSchema.index({ clientId: 1, mode: 1, status: 1 });
PracticeRoundSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 48 * 3600 });

export const PracticeRound = mongoose.model<IPracticeRound>(
  'PracticeRound',
  PracticeRoundSchema
);
