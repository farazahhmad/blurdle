import mongoose, { Document, Schema } from 'mongoose';

export interface IMovie extends Document {
  tmdbId: number;
  title: string;
  normalizedTitle: string;
  year: number;
  genres: string[];
  backdropPath: string;
}

const MovieSchema = new Schema<IMovie>(
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
    },
    genres: {
      type: [String],
      default: [],
    },
    backdropPath: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

export const Movie = mongoose.model<IMovie>('Movie', MovieSchema);
