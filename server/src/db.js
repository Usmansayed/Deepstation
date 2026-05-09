import mongoose from "mongoose";

/**
 * @param {string} uri
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDb(uri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
  });
  return mongoose;
}

export function getConnectionState() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return {
    readyState: mongoose.connection.readyState,
    label: states[mongoose.connection.readyState] ?? "unknown",
    name: mongoose.connection.name,
    host: mongoose.connection.host,
  };
}
