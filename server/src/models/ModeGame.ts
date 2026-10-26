import mongoose, { Document, Schema } from 'mongoose';
import { GameModeKey } from './ModePuzzle';

export type ModeGameStatus = 'playing' | 'won' | 'lost';

export interface IModeGame extends Document {
  clientId: string;
  userId?: mongoose.Types.ObjectId | null;
  mode: GameModeKey;
  puzzleNumber: number;
  state: any;
  score?: number;
  status: ModeGameStatus;
  playedOnDate: boolean;
  createdAt: Date;
}

const ModeGameSchema = new Schema<IModeGame>(
  {
    clientId: {
      type: String,
      required: true,
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
      enum: ['flashlight', 'double_exposure', 'narrator'],
    },
    puzzleNumber: {
      type: Number,
      required: true,
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
      enum: ['playing', 'won', 'lost'],
      default: 'playing',
    },
    playedOnDate: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: false,
  }
);

ModeGameSchema.index({ clientId: 1, mode: 1, puzzleNumber: 1 }, { unique: true });

export const ModeGame = mongoose.model<IModeGame>('ModeGame', ModeGameSchema);
