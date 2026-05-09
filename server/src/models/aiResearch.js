import mongoose from "mongoose";

const { Schema } = mongoose;

const AiResearchCompanySchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    ticker: String,
    sector: String,
    image: String,
    confidence: { type: Number, min: 0, max: 100 },
    risk: { type: String, enum: ["Low", "Medium", "High"] },
    timing: String,
    thesis: String,
    trend: { type: String, enum: ["Uptrend", "Neutral", "Emerging"] },
    activityFeed: { type: [String], default: [] },
    reasoningTimeline: { type: [String], default: [] },
  },
  { timestamps: true },
);

// Memo + intel are large free-form blobs; store as Mixed to keep them flexible
// without ratifying every nested field at the Mongo layer.
const AiResearchDossierSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    memo: { type: Schema.Types.Mixed, required: true },
    intel: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, minimize: false },
);

export const AiResearchCompany = mongoose.model("AiResearchCompany", AiResearchCompanySchema);
export const AiResearchDossier = mongoose.model("AiResearchDossier", AiResearchDossierSchema);
