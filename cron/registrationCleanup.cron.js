const cron = require("node-cron");
const cleanupRegistrationSessions = require("../jobs/cleanupRegistrationSessions");

// Runs every 30 minutes
cron.schedule("*/30 * * * *", async () => {
  console.log("[CRON] Running registration session cleanup...");
  await cleanupRegistrationSessions(30);
});
