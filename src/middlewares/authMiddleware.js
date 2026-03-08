const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { AppError } = require("../utils/errorUtils");

// ── Verify JWT Token ─────────────────────────────────────────────
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new AppError("Access denied. No token provided.", 401));
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return next(new AppError("User no longer exists.", 401));
    if (!user.isActive) return next(new AppError("Account deactivated.", 403));

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new AppError("Session expired. Please log in again.", 401));
    }
    return next(new AppError("Invalid token. Please log in again.", 401));
  }
};

// ────────────────────────────────────────────────────────────────
// ROLE-BASED MIDDLEWARE
// ────────────────────────────────────────────────────────────────

// ── Generic role check (flexible) ───────────────────────────────
// Usage: allowedTo("admin", "project_manager")
const allowedTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`Access denied. Your role: ${req.user.role}`, 403));
    }
    next();
  };
};

// ── Admin only ───────────────────────────────────────────────────
// Usage: router.delete("/users/:id", verifyToken, isAdmin, handler)
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new AppError("Access denied. Admins only.", 403));
  }
  next();
};

// ── Project Manager only ─────────────────────────────────────────
// Usage: router.post("/projects", verifyToken, isProjectManager, handler)
const isProjectManager = (req, res, next) => {
  if (req.user.role !== "project_manager") {
    return next(new AppError("Access denied. Project Managers only.", 403));
  }
  next();
};

// ── Admin OR Project Manager ─────────────────────────────────────
// Usage: router.get("/projects", verifyToken, isAdminOrManager, handler)
const isAdminOrManager = (req, res, next) => {
  if (!["admin", "project_manager"].includes(req.user.role)) {
    return next(new AppError("Access denied. Admins and Project Managers only.", 403));
  }
  next();
};

// ── Team Member only ─────────────────────────────────────────────
// Usage: router.put("/tasks/:id", verifyToken, isTeamMember, handler)
const isTeamMember = (req, res, next) => {
  if (req.user.role !== "team_member") {
    return next(new AppError("Access denied. Team Members only.", 403));
  }
  next();
};

// ── The user themselves only (no admin bypass) ───────────────────
// Usage: router.put("/users/:id", verifyToken, isSameUser, handler)
const isSameUser = (req, res, next) => {
  if (req.user.id !== req.params.id) {
    return next(new AppError("Access denied. You can only do this on your own account.", 403));
  }
  next();
};

// ── Admin OR the user themselves ─────────────────────────────────
// Usage: router.get("/users/:id", verifyToken, isAdminOrSameUser, handler)
const isAdminOrSameUser = (req, res, next) => {
  const isSelf = req.user.id === req.params.id;
  const isAdmin = req.user.role === "admin";

  if (!isSelf && !isAdmin) {
    return next(new AppError("Access denied. You can only access your own data.", 403));
  }
  next();
};

// ── Project Manager OR the user themselves ───────────────────────
// Usage: router.get("/users/:id", verifyToken, isManagerOrSameUser, handler)
const isManagerOrSameUser = (req, res, next) => {
  const isSelf = req.user.id === req.params.id;
  const isManager = req.user.role === "project_manager";

  if (!isSelf && !isManager) {
    return next(new AppError("Access denied.", 403));
  }
  next();
};

// ── Any authenticated user (just needs valid token) ──────────────
// Usage: router.get("/me", verifyToken, isAuthenticated, handler)
const isAuthenticated = (req, res, next) => {
  // req.user is already set by verifyToken, just pass through
  if (!req.user) {
    return next(new AppError("You must be logged in.", 401));
  }
  next();
};

// ────────────────────────────────────────────────────────────────
module.exports = {
  verifyToken,
  allowedTo,
  isAdmin,
  isProjectManager,
  isAdminOrManager,
  isTeamMember,
  isSameUser,
  isAdminOrSameUser,
  isManagerOrSameUser,
  isAuthenticated,
};