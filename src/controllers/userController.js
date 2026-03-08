const User = require("../models/User");
const { AppError } = require("../utils/errorUtils");
const generateToken = require("../utils/generateToken");

// ────────────────────────────────────────────────────────────────
// @desc    Update profile (name, email)
// @route   PUT /api/users/me
// @access  Private
// ────────────────────────────────────────────────────────────────
const updateMe = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    // Prevent password update through this route
    if (req.body.password) {
      return next(new AppError("This route is not for password updates. Use /me/password", 400));
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email },
      { new: true, runValidators: true } // new: true → returns updated doc
    );

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
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
// @desc    Change password
// @route   PUT /api/users/me/password
// @access  Private
// ────────────────────────────────────────────────────────────────
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    // 1) Basic field checks
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return next(new AppError("Please provide currentPassword, newPassword, and confirmNewPassword", 400));
    }

    // 2) Confirm new passwords match
    if (newPassword !== confirmNewPassword) {
      return next(new AppError("New passwords do not match", 400));
    }

    // 3) Fetch user with password (select: false by default)
    const user = await User.findById(req.user.id).select("+password");

    // 4) Verify current password is correct
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return next(new AppError("Current password is incorrect", 401));
    }

    // 5) Assign new password — pre hook hashes it automatically
    user.password = newPassword;
    await user.save();

    // 6) Issue a fresh token since credentials changed
    const token = generateToken(user._id);

    res.status(200).json({
      status: "success",
      message: "Password updated successfully",
      token,
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private - Admin
// ────────────────────────────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find();

    res.status(200).json({
      status: "success",
      results: users.length,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};


// ────────────────────────────────────────────────────────────────
// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Admin only
// ────────────────────────────────────────────────────────────────
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-__v");

    if (!user) return next(new AppError("User not found", 404));

    res.status(200).json({
      status: "success",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};


// ────────────────────────────────────────────────────────────────
// @desc    Ban a user (admin only) — blocks login, data kept
// @route   PUT /api/users/:id/ban
// @access  Private - Admin
// ────────────────────────────────────────────────────────────────
const banUser = async (req, res, next) => {
  try {
    // Prevent admin from banning themselves
    if (req.params.id === req.user.id) {
      return next(new AppError("You cannot ban yourself.", 400));
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) return next(new AppError("User not found", 404));

    res.status(200).json({
      status: "success",
      message: `User "${user.name}" has been banned.`,
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Unban a user (admin only) — restores login access
// @route   PUT /api/users/:id/unban
// @access  Private - Admin
// ────────────────────────────────────────────────────────────────
const unbanUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );

    if (!user) return next(new AppError("User not found", 404));

    res.status(200).json({
      status: "success",
      message: `User "${user.name}" has been unbanned.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { updateMe, updatePassword, getAllUsers, unbanUser,banUser ,getUserById};