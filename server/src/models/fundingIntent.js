import mongoose from "mongoose";

const { Schema } = mongoose;

const FundingIntentSchema = new Schema(
  {
    startupSlug: { type: String, required: true, index: true },
    investorId: { type: String, required: true, index: true },
    amount: { type: Number, min: 0, required: true },
    instrument: { type: String, enum: ["SAFE", "Equity"], required: true },
    valuationCap: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ["initiated", "signed", "recorded"],
      default: "initiated",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const FundingIntent = mongoose.model("FundingIntent", FundingIntentSchema);
