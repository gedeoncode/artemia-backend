const Bull = require("bull");
const Notification = require("../models/Notification.model");
const { createBullBoard } = require("@bull-board/api");
const { BullAdapter } = require("@bull-board/api/bullAdapter");
const { ExpressAdapter } = require("@bull-board/express");
const { REDIS_URI } = require("../constants/env");
const notificationQueue = new Bull("notification-queue", REDIS_URI);
notificationQueue.process(async (job) => {
  try {
    const { notificationData } = job.data;
    const notification = await Notification.create(notificationData);
    return notification;
  } catch (error) {
    console.error("Notification job failed:", error);
    throw error;
  }
});
notificationQueue.on("error", (err) => {
  console.error("Queue connection error:", err);
});

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullAdapter(notificationQueue)],
  serverAdapter,
});

module.exports = {
  notificationQueue,
  serverAdapter,
};

//======= The production code for the queue/notification.queue.js  =========//

// const Bull = require("bull");
// const Notification = require("../models/Notification.model");
// const logger = require("../utils/logger"); // Replace with your logger (Winston/Pino)
// const { createBullBoard } = require("@bull-board/api");
// const { BullAdapter } = require("@bull-board/api/bullAdapter");
// const { ExpressAdapter } = require("@bull-board/express");

// // 1. Queue Configuration
// const notificationQueue = new Bull("notification-queue", {
//   redis: process.env.REDIS_URL || "redis://localhost:6379",
//   settings: {
//     maxStalledCount: 0, // Prevents jobs from being reprocessed if worker crashes
//     lockDuration: 30000, // 30s to complete a job before it's retried
//   },
//   limiter: {
//     max: 1000, // Max jobs per duration
//     duration: 5000, // 5 seconds
//   },
// });

// // 2. Job Processor with Retries & Timeout
// notificationQueue.process(5, async (job) => {
//   // 5 concurrent workers
//   const { notificationData } = job.data;

//   // Input validation
//   if (!notificationData?.message || !notificationData?.userId) {
//     throw new Error("Invalid job data: missing 'message' or 'userId'");
//   }

//   // Job timeout (fail if DB takes > 10s)
//   await Promise.race([
//     Notification.create(notificationData),
//     new Promise((_, reject) =>
//       setTimeout(() => reject(new Error("Job timeout")), 10000)
//     ),
//   ]);

//   logger.info(`Processed notification for user ${notificationData.userId}`);
// });

// // 3. Event Listeners (Metrics & Logging)
// notificationQueue
//   .on("error", (err) => logger.error("Queue error:", err))
//   .on("failed", (job, err) => logger.error(`Job ${job.id} failed:`, err))
//   .on("completed", (job) =>
//     logger.debug(
//       `Job ${job.id} completed in ${job.finishedOn - job.processedOn}ms`
//     )
//   );

// // 4. Bull Board Setup (with auth middleware)
// const serverAdapter = new ExpressAdapter();
// serverAdapter.setBasePath("/admin/queues");

// createBullBoard({
//   queues: [new BullAdapter(notificationQueue)],
//   serverAdapter,
// });

// // 5. Graceful Shutdown
// const shutdown = async () => {
//   logger.info("Closing queue gracefully...");
//   await notificationQueue.close();
//   process.exit(0);
// };

// process.on("SIGTERM", shutdown);
// process.on("SIGINT", shutdown);

// module.exports = {
//   notificationQueue,
//   serverAdapter,
// };
