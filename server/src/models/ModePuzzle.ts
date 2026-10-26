import mongoose, { Document, Schema } from 'mongoose';

export type GameModeKey = 'flashlight' | 'double_exposure' | 'narrator';

export interface IModePuzzle extends Document {
  mode: GameModeKey;
  puzzleNumber: number;
  dateKey: string; // UTC "YYYY-MM-DD"
  movieIds: mongoose.Types.ObjectId[];
  payload?: any;
  createdAt: Date;
}

const ModePuzzleSchema = new Schema<IModePuzzle>(
  {
    mode: {
      type: String,
      required: true,
      enum: ['flashlight', 'double_exposure', 'narrator'],
    },
    puzzleNumber: {
      type: Number,
      required: true,
    },
    dateKey: {
      type: String,
      required: true,
    },
    movieIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Movie',
        required: true,
      },
    ],
    payload: {
      type: Schema.Types.Mixed,
      default: null,
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

ModePuzzleSchema.index({ mode: 1, puzzleNumber: 1 }, { unique: true });
ModePuzzleSchema.index({ mode: 1, dateKey: 1 });

export const ModePuzzle = mongoose.model<IModePuzzle>('ModePuzzle', ModePuzzleSchema);
