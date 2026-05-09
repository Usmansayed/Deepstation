import mongoose from "mongoose";

const { Schema } = mongoose;

const JourneyEntrySchema = new Schema(
  {
    title: String,
    excerpt: String,
    body: String,
    readMins: Number,
    seed: String,
    category: String,
  },
  { _id: false },
);

const KpiSchema = new Schema(
  { label: String, value: String, tone: String, iconKey: String },
  { _id: false },
);

const TimelineEntrySchema = new Schema(
  { q: String, title: String, body: String },
  { _id: false },
);

const InvestorQuoteSchema = new Schema(
  { name: String, role: String, quote: String },
  { _id: false },
);

const StartupProfileSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    journeyEntries: { type: [JourneyEntrySchema], default: [] },
    kpis: { type: [KpiSchema], default: [] },
    timeline: { type: [TimelineEntrySchema], default: [] },
    investorQuotes: { type: [InvestorQuoteSchema], default: [] },
    announcementSamples: { type: [String], default: [] },
    qaInvestors: { type: [String], default: [] },
    qaQuestions: { type: [String], default: [] },
    qaReplies: { type: [String], default: [] },
    journeyGalleryCount: { type: Number, default: 0 },
    journeyGalleryCaption: { type: String, default: "" },
  },
  { timestamps: true },
);

export const StartupProfile = mongoose.model("StartupProfile", StartupProfileSchema);
