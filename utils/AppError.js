
// src/middlewares/errorHandler.js

class AppError extends Error {
  constructor(message, statusCode, code, meta = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code; 
    this.meta = meta;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}


const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  const message = err.message || "Something went wrong";
  console.log("Error Handler Invoked:", {
    message: err.message,
    statusCode: statusCode,
    stack: err.stack,
  });
  if (!err.isOperational) {
    console.error("UNEXPECTED ERROR:", err);
  }

  return res.status(statusCode).json({
    success: false,
    status: err.status || "error",
    code: err.code || "INTERNAL_SERVER_ERROR", 
    message,
  });
};


module.exports = {
  AppError,
  errorHandler,
};
