import mongoose from "mongoose";

const { Schema } = mongoose;

const FounderSchema = new Schema(
  {
    name: { type: String, required: true },
    role: { type: String, required: true },
    bio: { type: String, default: "" },
    verified: { type: Boolean, default: false },
  },
  { _id: false },
);

const TractionPointSchema = new Schema(
  {
    month: { type: String, required: true },
    revenue: { type: Number, required: true },
    users: { type: Number, required: true },
  },
  { _id: false },
);

const UpdateSchema = new Schema(
  {
    id: { type: String, required: true },
    date: { type: String, required: true },
    type: {
      type: String,
      enum: ["milestone", "product", "traction", "team", "fundraise"],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
  },
  { _id: false },
);

const VerificationBadgeSchema = new Schema(
  {
    label: { type: String, required: true },
    source: {
      type: String,
      enum: ["stripe", "github", "google-analytics", "mixpanel", "posthog", "razorpay", "linkedin"],
      required: true,
    },
    verified: { type: Boolean, default: false },
  },
  { _id: false },
);

const StartupSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    sector: { type: String, required: true },
    stage: {
      type: String,
      enum: ["Pre-seed", "Seed", "Series A", "Series B"],
      required: true,
    },
    tagline: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    founded: { type: String, required: true },

    credibility: { type: Number, min: 0, max: 100, required: true },
    momentum: { type: Number, min: 0, max: 100, required: true },
    raising: { type: Number, min: 0, required: true },
    valuation: { type: Number, min: 0, required: true },
    followers: { type: Number, min: 0, default: 0 },
    /** Display / pitch (from mock-data.ts) */
    logo: { type: String, default: "📦" },
    /** Wide cover / hero (e.g. Wefunder video still or card photo) */
    heroImage: { type: String, default: "" },
    /** Investor-facing Pitch tab body (Markdown). Generated offline (e.g. Vertex); omitted on list API if empty. */
    pitchMarkdown: { type: String, default: "" },
    /** Full Wefunder campaign object from `campaigns.json` (detail API only). */
    wefunderCampaign: { type: Schema.Types.Mixed, default: undefined },
    raised: { type: Number, min: 0, default: 0 },
    highlights: { type: [String], default: [] },

    lastHeartbeatAt: { type: Date, required: true },
    founderResponseHours: { type: Number, min: 0, required: true },
    milestoneHitRate: { type: Number, min: 0, max: 100, required: true },
    communityEngagement: { type: Number, min: 0, max: 100, required: true },

    founders: { type: [FounderSchema], default: [] },
    traction: { type: [TractionPointSchema], default: [] },
    updates: { type: [UpdateSchema], default: [] },
    verificationBadges: { type: [VerificationBadgeSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = String(ret._id);
        delete ret._id;
        return ret;
      },
    },
  },
);

export const Startup = mongoose.model("Startup", StartupSchema);
