import mongoose, { Document, Schema } from 'mongoose';

export type GameStatus = 'playing' | 'won' | 'lost';

export interface IGame extends Document {
  clientId: string;
  puzzleNumber: number;
  guesses: number[];
  status: GameStatus;
  createdAt: Date;
}

const GameSchema = new Schema<IGame>(
  {
    clientId: {
      type: String,
      required: true,
    },
    puzzleNumber: {
      type: Number,
      required: true,
    },
    guesses: {
      type: [Number],
      default: [],
    },
    status: {
      type: String,
      enum: ['playing', 'won', 'lost'],
      default: 'playing',
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

GameSchema.index({ clientId: 1, puzzleNumber: 1 }, { unique: true });

export const Game = mongoose.model<IGame>('Game', GameSchema);
