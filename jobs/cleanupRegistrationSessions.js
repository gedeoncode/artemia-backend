// src/jobs/cleanupRegistrationSessions.js

const RegistrationSession = require("../models/RegistrationSession.model");

/**
 * Cleanup expired registration sessions
 *
 * @param {Number} maxAgeMinutes - number of minutes after which a session expires
 */
const cleanupRegistrationSessions = async (maxAgeMinutes = 30) => {
  try {
    const expiryDate = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

    const result = await RegistrationSession.deleteMany({
      createdAt: { $lt: expiryDate },
    });

    if (result.deletedCount > 0) {
      console.log(
        `[CLEANUP] Removed ${result.deletedCount} expired registration session(s)`
      );
    } else {
      console.log("[CLEANUP] No expired registration sessions found");
    }

    return result;
  } catch (err) {
    console.error(
      "[CLEANUP ERROR] Failed to clean registration sessions:",
      err
    );
    throw err;
  }
};

module.exports = cleanupRegistrationSessions;
