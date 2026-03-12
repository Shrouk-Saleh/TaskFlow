// ── Custom Error Class ───────────────────────────────────────────
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Global Error Handler ─────────────────────────────────────────
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // ── Case 1: Invalid JSON body (trailing comma, wrong quotes, etc.)
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      status: "fail",
      message: "Invalid JSON format. Check your request body for trailing commas or syntax errors.",
    });
  }

  // ── Case 2: Our own AppError (operational, expected errors)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // ── Case 3: Unknown/unexpected errors (bugs, crashes)
  console.error("UNEXPECTED ERROR:", err);
  return res.status(500).json({
    status: "error",
    message: "Something went wrong. Please try again later.",
  });
};

module.exports = { AppError, globalErrorHandler };