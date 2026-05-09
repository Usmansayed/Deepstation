import mongoose from "mongoose";

const { Schema } = mongoose;

const StartupFollowSchema = new Schema(
  {
    startupSlug: { type: String, required: true, index: true },
    userId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

StartupFollowSchema.index({ userId: 1, startupSlug: 1 }, { unique: true });

export const StartupFollow = mongoose.model("StartupFollow", StartupFollowSchema);
