const express = require("express");
const router = express.Router();

const { register, login } = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { registerValidation, loginValidation } = require("../validators/authValidators");

// ── Public Routes ────────────────────────────────────────────────
router.post("/register", registerValidation, register);
router.post("/login",loginValidation, login);



module.exports = router;