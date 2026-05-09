import mongoose from "mongoose";

const { Schema } = mongoose;

const StartupCommentSchema = new Schema(
  {
    startupSlug: { type: String, required: true, index: true },
    author: { type: String, required: true },
    body: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = String(ret._id);
        delete ret._id;
        if (ret.createdAt instanceof Date) ret.createdAt = ret.createdAt.toISOString();
        return ret;
      },
    },
  },
);

export const StartupComment = mongoose.model("StartupComment", StartupCommentSchema);
