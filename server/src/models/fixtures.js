import mongoose from "mongoose";

const { Schema } = mongoose;

const ChatMessageSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    mine: { type: Boolean, default: false },
    time: { type: String, required: true },
  },
  { _id: false },
);

const MessageThreadSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    role: String,
    preview: String,
    time: String,
    unread: { type: Number, min: 0, default: 0 },
    avatarSeed: String,
    pinned: { type: Boolean, default: false },
    mutedUntil: { type: String, default: null },
    archived: { type: Boolean, default: false },
    messages: { type: [ChatMessageSchema], default: [] },
  },
  { timestamps: true },
);

const CashTransactionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ["Deposit", "Withdrawal", "Internal transfer"], required: true },
    account: String,
    amount: Number,
    status: { type: String, enum: ["Pending", "Completed"], default: "Pending" },
    date: String,
    destination: String,
    channel: { type: String, enum: ["Bank wire", "ACH", "Internal ledger"] },
    reference: String,
  },
  { timestamps: true },
);

const TopInvestorSchema = new Schema(
  {
    rank: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    blurb: String,
    site: String,
    seed: String,
  },
  { timestamps: true },
);

export const MessageThread = mongoose.model("MessageThread", MessageThreadSchema);
export const CashTransaction = mongoose.model("CashTransaction", CashTransactionSchema);
export const TopInvestor = mongoose.model("TopInvestor", TopInvestorSchema);
