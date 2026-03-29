const { validationResult } = require("express-validator");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { AppError } = require("../utils/errorUtils");
const crypto = require("crypto");
const { sendOTP } = require("../utils/emailService");
const jwt = require("jsonwebtoken");



// ────────────────────────────────────────────────────────────────
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
// ────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // 1) Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError("Email is already registered", 409));
    }

    // 2) Create the user 
    const user = await User.create({ name, email, password, role });

    // 3) Generate JWT
    const token = generateToken(user._id);

    // 4) Respond
    res.status(201).json({
      status: "success",
      message: "Account created successfully",
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
// ────────────────────────────────────────────────────────────────
// @desc    Login user and return JWT
// @route   POST /api/auth/login
// @access  Public
// ────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1) Find user and explicitly include password
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return next(new AppError("Invalid email or password", 401));
    }

    // 2) Check if account is active
    if (!user.isActive) {
      return next(new AppError("Your account has been deactivated. Contact admin.", 403));
    }

    // 3) Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return next(new AppError("Invalid email or password", 401));
    }

    // 4) Generate token
    const token = generateToken(user._id);

    // 5) Respond
    res.status(200).json({
      status: "success",
      message: "Logged in successfully",
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};



// ────────────────────────────────────────────────────────────────
// @desc    Send OTP to email
// @route   POST /api/auth/forgot-password
// @access  Public
// ────────────────────────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) return next(new AppError("Please provide your email.", 400));

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        status: "success",
        message: "If this email is registered, an OTP has been sent.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    user.passwordResetOTP = hashedOTP;
    user.passwordResetOTPExpires = Date.now() + 10 * 60 * 1000;
    user.passwordResetVerified = false;
    await user.save({ validateBeforeSave: false });
    try {
      await sendOTP(user.email, otp);
      console.log("OTP sent to:", user.email);
    } catch (emailError) {
      console.error(" Email error:", emailError); 
      return next(new AppError("Failed to send OTP. Please try again.", 500));
    }

    res.status(200).json({
      status: "success",
      message: "If this email is registered, an OTP has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Verify OTP
// @route   POST /api/auth/verify-reset-otp
// @access  Public
// ────────────────────────────────────────────────────────────────
const verifyResetOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return next(new AppError("Please provide email and OTP.", 400));
    }

    const user = await User.findOne({ email }).select(
      "+passwordResetOTP +passwordResetOTPExpires +passwordResetVerified"
    );

    if (!user || !user.passwordResetOTP) {
      return next(new AppError("No OTP was requested for this email.", 400));
    }

    if (Date.now() > user.passwordResetOTPExpires) {
      user.passwordResetOTP = undefined;
      user.passwordResetOTPExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return next(new AppError("OTP has expired. Please request a new one.", 400));
    }

    const hashedIncoming = crypto.createHash("sha256").update(otp).digest("hex");

    if (hashedIncoming !== user.passwordResetOTP) {
      return next(new AppError("Invalid OTP.", 400));
    }

    //  Mark as verified
    user.passwordResetVerified = true;
    await user.save({ validateBeforeSave: false });

    const resetToken = jwt.sign(
      { id: user._id, purpose: "reset_password" },
      process.env.JWT_SECRET,
      { expiresIn: "10m" } 
    );

    res.status(200).json({
      status: "success",
      message: "OTP verified. You may now reset your password.",
      resetToken,
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Reset password after OTP verified
// @route   POST /api/auth/reset-password
// @access  Public
// ────────────────────────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return next(new AppError("Please provide newPassword and confirmPassword.", 400));
    }

    if (newPassword !== confirmPassword) {
      return next(new AppError("Passwords do not match.", 400));
    }

    if (newPassword.length < 6) {
      return next(new AppError("Password must be at least 6 characters.", 400));
    }

    //  Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new AppError("Reset token required.", 401));
    }

    const resetToken = authHeader.split(" ")[1];

    // Verify token and check purpose
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
      return next(new AppError("Reset token is invalid or expired.", 401));
    }

    if (decoded.purpose !== "reset_password") {
      return next(new AppError("Invalid reset token.", 401));
    }

    // Find user by ID from token — no email needed
    const user = await User.findById(decoded.id).select(
      "+passwordResetVerified"
    );

    if (!user) return next(new AppError("User not found.", 404));

    // Check OTP was verified
    if (!user.passwordResetVerified) {
      return next(new AppError("Please verify your OTP first.", 403));
    }

    // Update password
    user.password = newPassword;
    user.passwordResetOTP = undefined;
    user.passwordResetOTPExpires = undefined;
    user.passwordResetVerified = false;
    await user.save();

    // Return real login token
    const token = generateToken(user._id);

    res.status(200).json({
      status: "success",
      message: "Password reset successfully.",
      token,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, forgotPassword, verifyResetOTP, resetPassword };
