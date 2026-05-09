import mongoose from "mongoose";

const { Schema } = mongoose;

/** Singleton-style key/value for small UI payloads (discover taxonomy, demo user). */
const AppConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

export const AppConfig = mongoose.model("AppConfig", AppConfigSchema);
