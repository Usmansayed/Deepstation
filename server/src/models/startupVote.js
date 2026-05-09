import mongoose from "mongoose";

const { Schema } = mongoose;

const StartupVoteSchema = new Schema(
  {
    startupSlug: { type: String, required: true },
    voterId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

StartupVoteSchema.index({ startupSlug: 1, voterId: 1 }, { unique: true });

export const StartupVote = mongoose.model("StartupVote", StartupVoteSchema);
