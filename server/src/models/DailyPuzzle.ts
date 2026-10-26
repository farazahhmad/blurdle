import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDailyPuzzle extends Document {
  puzzleNumber: number;
  dateKey: string;
  movieId: Types.ObjectId;
  createdAt: Date;
}

const DailyPuzzleSchema = new Schema<IDailyPuzzle>(
  {
    puzzleNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    dateKey: {
      type: String,
      required: true,
      unique: true,
    },
    movieId: {
      type: Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
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

export const DailyPuzzle = mongoose.model<IDailyPuzzle>('DailyPuzzle', DailyPuzzleSchema);
