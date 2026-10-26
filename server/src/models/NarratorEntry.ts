import mongoose, { Document, Schema } from 'mongoose';

export interface INarratorEntry extends Document {
  tmdbId: number;
  persona: string;
  hints: string[]; // [h1, h2, h3]
  createdAt: Date;
}

const NarratorEntrySchema = new Schema<INarratorEntry>(
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

export const NarratorEntry = mongoose.model<INarratorEntry>('NarratorEntry', NarratorEntrySchema);
