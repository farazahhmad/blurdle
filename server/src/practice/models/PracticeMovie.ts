import mongoose, { Document, Schema } from 'mongoose';

export interface IPracticeMovie extends Document {
  tmdbId: number;
  title: string;
  normalizedTitle: string;
  year: number;
  genres: string[];
  backdropPath: string;
  posterPath?: string;
}

const PracticeMovieSchema = new Schema<IPracticeMovie>(
  {
    tmdbId: {
      type: Number,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    normalizedTitle: {
      type: String,
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    genres: {
      type: [String],
      default: [],
      index: true,
    },
    backdropPath: {
      type: String,
      required: true,
    },
    posterPath: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: false,
  }
);

export const PracticeMovie = mongoose.model<IPracticeMovie>(
  'PracticeMovie',
  PracticeMovieSchema
);
