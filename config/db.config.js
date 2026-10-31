const mongoose = require("mongoose");
const retry = require("async-retry");
const { MONGODB_URL } = require("../constants/env");

// Validate environment variables
if (!MONGODB_URL) {
  console.error(
    "MONGODB_URL is not defined in environment variables",
    MONGODB_URL,
  );
  process.exit(1);
}

console.log("Connecting to MongoDB...");

const connectDB = async () => {
  try {
    await retry(
      async () => {
        const conn = await mongoose.connect(MONGODB_URL, {
          serverSelectionTimeoutMS: 5000, // Timeout after 5s if no server is selected
          socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
          maxPoolSize: 10, // Maintain up to 10 socket connections
          retryWrites: true,
          w: "majority",
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Connection event listeners
        conn.connection.on("connected", () => {
          console.log("Mongoose connected to DB");
        });

        conn.connection.on("error", (err) => {
          console.error("Mongoose connection error:", err);
        });

        conn.connection.on("disconnected", () => {
          console.log("Mongoose disconnected");
        });
      },
      {
        retries: 3,
        minTimeout: 1000,
        maxTimeout: 5000,
        onRetry: (error) => {
          console.log(`Retrying connection due to: ${error.message}`);
        },
      },
    );
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // Graceful shutdown
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("Mongoose connection closed due to app termination");
  process.exit(0);
});

module.exports = { connectDB };
