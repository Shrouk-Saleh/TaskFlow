const { validationResult } = require("express-validator");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { AppError } = require("../utils/errorUtils");

// ────────────────────────────────────────────────────────────────
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
// ────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    // 1) Validate incoming request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "fail",
        errors: errors.array()
      });
    }

    const { name, email, password, role } = req.body;

    // 2) Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError("Email is already registered", 409));
    }

    // 3) Create the user (password is hashed by pre-save hook in model)
    const user = await User.create({ name, email, password, role });

    // 4) Generate JWT — pass only user._id 
    const token = generateToken(user._id);

    // 5) Respond 
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
    // 1) Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "fail",
        errors: errors.array() ,
      });
    }

    const { email, password } = req.body;

    // 2) Find user and explicitly include password 
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return next(new AppError("Invalid email or password", 401));
    }

    // 3) Check if account is active
    if (!user.isActive) {
      return next(new AppError("Your account has been deactivated. Contact admin.", 403));
    }

    // 4) Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return next(new AppError("Invalid email or password", 401));
    }

    // 5) Generate token
    const token = generateToken(user._id);

    // 6) Respond
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



module.exports = { register, login };