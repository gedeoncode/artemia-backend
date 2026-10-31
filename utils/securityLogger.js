const fs = require("fs/promises");
const path = require("path");
const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf } = format;
require("winston-daily-rotate-file");

// Configuration - all values now environment-configurable
const config = {
  LOG_DIR: process.env.LOG_DIR || path.join(__dirname, "../logs"),
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  FILE_PERMISSIONS: parseInt(process.env.LOG_FILE_PERMISSIONS || "640", 8),
  MAX_SIZE: process.env.LOG_MAX_SIZE || "20m",
  MAX_FILES: process.env.LOG_MAX_FILES || "30d",
  ENABLE_CONSOLE: process.env.NODE_ENV !== "production",
  ROTATE_ZIP: process.env.LOG_ROTATE_ZIP !== "false",
};

// Queue for logs that occur before initialization
const logQueue = [];
let isInitialized = false;

// Async directory creation with proper permissions
const ensureLogsDirectory = async () => {
  try {
    await fs.access(config.LOG_DIR);
  } catch (err) {
    if (err.code === "ENOENT") {
      await fs.mkdir(config.LOG_DIR, {
        recursive: true,
        mode: 0o750, // Secure directory permissions
      });
    } else {
      throw new Error(`Could not set up log directory: ${err.message}`);
    }
  }
};

// Enhanced sanitization to prevent log injection
const sanitize = (input) => {
  if (typeof input === "object")
    return JSON.stringify(input).replace(/[^\w\s{}[\],":]/g, "");
  if (typeof input === "string") return input.replace(/[\n\r\t]/g, " ");
  return input;
};

// Security-aware log format
const securityFormat = printf(
  ({ level, message, timestamp, event, ...metadata }) => {
    let msg = `${timestamp} [${level}] ${event}: ${sanitize(message)}`;
    if (Object.keys(metadata).length) {
      const cleanMetadata = Object.entries(metadata).reduce(
        (acc, [key, value]) => {
          acc[key] = sanitize(value);
          return acc;
        },
        {}
      );
      msg += ` | ${JSON.stringify(cleanMetadata)}`;
    }
    return msg;
  }
);

// Health monitoring
let isHealthy = false;
const healthCheck = () => isHealthy;

// Initialize logger with enhanced safety
let logger;

const initializeLogger = async (maxRetries = 3, retryDelay = 1000) => {
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      await ensureLogsDirectory();

      logger = createLogger({
        level: config.LOG_LEVEL,
        format: combine(timestamp(), securityFormat),
        transports: [
          new transports.DailyRotateFile({
            filename: path.join(config.LOG_DIR, "security-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            zippedArchive: config.ROTATE_ZIP,
            maxSize: config.MAX_SIZE,
            maxFiles: config.MAX_FILES,
            level: "info",
            createSymlink: true,
            symlinkName: "security-current.log",
            options: { mode: config.FILE_PERMISSIONS },
          }),
          ...(config.ENABLE_CONSOLE ? [new transports.Console()] : []),
        ],
        exceptionHandlers: [
          new transports.File({
            filename: path.join(config.LOG_DIR, "exceptions.log"),
            options: { mode: config.FILE_PERMISSIONS },
          }),
        ],
        rejectionHandlers: [
          new transports.File({
            filename: path.join(config.LOG_DIR, "rejections.log"),
            options: { mode: config.FILE_PERMISSIONS },
          }),
        ],
      });

      logger.on("error", (error) => {
        console.error("Logger error:", error);
        isHealthy = false;
      });

      // Process queued logs
      isInitialized = true;
      isHealthy = true;
      while (logQueue.length) {
        const { event, details } = logQueue.shift();
        logSecurityEvent(event, details);
      }

      return;
    } catch (err) {
      attempts++;
      if (attempts >= maxRetries) {
        console.error("Logger initialization failed after retries:", err);
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
};

// Enhanced security events enum
const SECURITY_EVENTS = Object.freeze({
  REGISTRATION_ATTEMPT: "REGISTRATION_ATTEMPT",
  REGISTRATION_SUCCESS: "REGISTRATION_SUCCESS",
  REGISTRATION_FAILED: "REGISTRATION_FAILED",
  ADMIN_REGISTRATION_ATTEMPT: "ADMIN_REGISTRATION_ATTEMPT",
  ADMIN_REGISTRATION_SUCCESS: "ADMIN_REGISTRATION_SUCCESS",
  ADMIN_REGISTRATION_FAILED: "ADMIN_REGISTRATION_FAILED",
  NO_ADMINS_FOUND: "NO_ADMINS_FOUND",
  ADMINS_ERROR: "ADMINS_ERROR",
  NO_ADMIN_FOUND: "NO_ADMIN_FOUND",
  ADMIN_FOUND: "ADMIN_FOUND",
  ADMINS_FOUND: "ADMINS_FOUND",
  ADMIN_ERROR: "ADMIN_ERROR",
  ADMIN_PRIVILEGE_CHANGE_ATTEMPT: "ADMIN_PRIVILEGE_CHANGE_ATTEMPT",
  ADMIN_PRIVILEGE_CHANGE_SUCCESS: "ADMIN_PRIVILEGE_CHANGE_SUCCESS",
  ADMIN_PRIVILEGE_CHANGE_FAILED: "ADMIN_PRIVILEGE_CHANGE_FAILED",
  ADMIN_DELETE_ATTEMPT: "ADMIN_DELETE_ATTEMPT",
  ADMIN_DELETE_SUCCESS: "ADMIN_DELETE_SUCCESS",
  ADMIN_DELETE_FAILED: "ADMIN_DELETE_FAILED",
  LOGIN_ATTEMPT: "LOGIN_ATTEMPT",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  RATE_LIMIT_TRIGGERED: "RATE_LIMIT_TRIGGERED",
  SUSPICIOUS_ACTIVITY: "SUSPICIOUS_ACTIVITY",
  PASSWORD_RESET_ATTEMPT: "PASSWORD_RESET_ATTEMPT",
  PASSWORD_RESET_SUCCESS: "PASSWORD_RESET_SUCCESS",
  SESSION_START: "SESSION_START",
  SESSION_END: "SESSION_END",
});

// Type-safe log data structure
const createLogData = (event, details = {}) => {
  // Redact sensitive information
  const { email, password, token, ip, userAgent, userId, requestId, ...rest } =
    details;

  const redactedEmail = email ? `${email.substring(0, 3)}...@...` : undefined;
  const redactedIp = ip
    ? `${ip.split(".").slice(0, 2).join(".")}.x.x`
    : undefined;

  return {
    event,
    timestamp: new Date().toISOString(),
    ...(redactedEmail && { email: redactedEmail }),
    ...(redactedIp && { ip: redactedIp }),
    ...(userAgent && { userAgent }),
    ...(userId && { userId }),
    ...(requestId && { correlationId: requestId }),
    ...rest,
  };
};

// Thread-safe logging with queue support
const logSecurityEvent = (event, details = {}) => {
  if (!isInitialized) {
    logQueue.push({ event, details });
    return;
  }

  if (!logger) {
    console.error("Logger not available!");
    return;
  }

  const logData = createLogData(event, details);

  try {
    switch (event) {
      case SECURITY_EVENTS.REGISTRATION_ATTEMPT:
        logger.info(`Registration attempt`, logData);
        break;
      case SECURITY_EVENTS.REGISTRATION_SUCCESS:
        logger.info(`Registration successful`, logData);
        break;
      case SECURITY_EVENTS.REGISTRATION_FAILED:
        logger.error(`Registration failed`, logData);
        break;
      case SECURITY_EVENTS.ADMINS_FOUND:
        logger.info(`Admins found `, logData);
        break;
      case SECURITY_EVENTS.ADMIN_FOUND:
        logger.info(`Admin found `, logData);
        break;
      case SECURITY_EVENTS.ADMIN_REGISTRATION_ATTEMPT:
        logger.warn(`Admin registration attempt`, logData);
        break;
      case SECURITY_EVENTS.ADMIN_REGISTRATION_SUCCESS:
        logger.info(`Admin registration successful`, logData);
        break;
      case SECURITY_EVENTS.ADMIN_REGISTRATION_FAILED:
        logger.error(`Admin registration failed`, logData);
        break;
      case SECURITY_EVENTS.ADMIN_PRIVILEGE_CHANGE_SUCCESS:
        logger.info(`Admin privilege change`, logData);
        break;
      case SECURITY_EVENTS.ADMIN_PRIVILEGE_CHANGE_ATTEMPT:
        logger.warn(`Admin privilege change attempt`, logData);
        break;
      case SECURITY_EVENTS.ADMIN_PRIVILEGE_CHANGE_FAILED:
        logger.warn(`Error changin admin privilege`, logData);
        break;
      case SECURITY_EVENTS.NO_ADMINS_FOUND:
        logger.warn(`No admins found`, logData);
        break;
      case SECURITY_EVENTS.NO_ADMIN_FOUND:
        logger.warn(`No admin found`, logData);
        break;
      case SECURITY_EVENTS.ADMINS_ERROR:
        logger.error(`Error fetching admins`, logData);
        break;
      case SECURITY_EVENTS.ADMIN_ERROR:
        logger.error(`Error fetching admin`, logData);
        break;
      case SECURITY_EVENTS.ADMIN_DELETE_SUCCESS:
        logger.info(`Admin deleted successful`, logData);
        break;
      case SECURITY_EVENTS.ADMIN_DELETE_ATTEMPT:
        logger.warn(`Admin deleted attempt`, logData);
        break;
      case SECURITY_EVENTS.ADMIN_DELETE_FAILED:
        logger.error(`Admin deleted failed`, logData);
        break;
      case SECURITY_EVENTS.RATE_LIMIT_TRIGGERED:
        logger.warn(`Rate limit triggered`, logData);
        break;
      case SECURITY_EVENTS.LOGIN_ATTEMPT:
        logger.info(`Login attempt`, logData);
        break;
      case SECURITY_EVENTS.LOGIN_SUCCESS:
        logger.info(`Login successful`, logData);
        break;
      case SECURITY_EVENTS.SESSION_START:
        logger.info(`Session started`, logData);
        break;
      case SECURITY_EVENTS.SESSION_END:
        logger.info(`Session ended`, logData);
        break;
      case SECURITY_EVENTS.PASSWORD_RESET_ATTEMPT:
        logger.info(`Password reset attempt`, logData);
        break;
      case SECURITY_EVENTS.PASSWORD_RESET_SUCCESS:
        logger.info(`Password reset successful`, logData);
        break;
      case SECURITY_EVENTS.SUSPICIOUS_ACTIVITY:
        logger.warn(`Suspicious activity detected`, logData);
        break;

      case SECURITY_EVENTS.LOGIN_FAILED:
        logger.warn(`Failed login attempt`, logData);
        break;
      default:
        logger.info(`Unclassified security event: ${event}`, logData);
    }
  } catch (err) {
    console.error("Logging failed:", err);
    isHealthy = false;
  }
};

// Initialize with retries
initializeLogger().catch((err) => {
  console.error("Critical logger failure:", err);
  process.exitCode = 1;
});

module.exports = {
  SECURITY_EVENTS,
  logSecurityEvent,
  logger, // For direct access when needed
  healthCheck, // For monitoring
  flushQueue: () => {
      // For testing purposes
    while (logQueue.length) {
      const { event, details } = logQueue.shift();
      logSecurityEvent(event, details);
    }
  },
};
