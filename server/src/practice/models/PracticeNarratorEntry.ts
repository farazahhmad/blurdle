import mongoose, { Document, Schema } from 'mongoose';

export interface IPracticeNarratorEntry extends Document {
  tmdbId: number;
  persona: string;
  hints: string[]; // [h1, h2, h3]
  createdAt: Date;
}

const PracticeNarratorEntrySchema = new Schema<IPracticeNarratorEntry>(
  {
    tmdbId: {
      type: Number,
      required: true,
      unique: true,
    },
    persona: {
      type: String,
      required: true,
    },
    hints: {
      type: [String],
      required: true,
      validate: [(val: string[]) => val.length === 3, 'Must contain exactly 3 hints'],
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

export const PracticeNarratorEntry = mongoose.model<IPracticeNarratorEntry>(
  'PracticeNarratorEntry',
  PracticeNarratorEntrySchema
);
