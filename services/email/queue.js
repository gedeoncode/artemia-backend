const Bull = require("bull");

const emailQueue = new Bull("email-queue", {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  limiter: {
    max: 100, // Max 100 jobs/sec
    duration: 1000,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: true,
  },
});

emailQueue.on("completed", (job) => {
  console.log(`Email job ${job.id} completed`);
});

emailQueue.on("failed", (job, err) => {
  console.error(`Email job ${job.id} failed:`, err.message);
});

module.exports = emailQueue;
