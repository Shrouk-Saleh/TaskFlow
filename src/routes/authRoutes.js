const express = require("express");
const router = express.Router();

const { register, login,forgotPassword ,verifyResetOTP,resetPassword} = require("../controllers/authController");
const { registerValidation, loginValidation } = require("../validators/authValidators");

router.post("/register", registerValidation, register);
router.post("/login",loginValidation, login);
router.post("/forgot-password",  forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password",   resetPassword);


module.exports = router;