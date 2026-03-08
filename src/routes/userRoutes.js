const express = require("express");
const router = express.Router();
const { updateMe, updatePassword, getAllUsers, banUser, unbanUser ,getUserById} = require("../controllers/userController");
const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");

// ── Profile Routes (any logged-in user) ─────────────────────────
router.put("/me", verifyToken, updateMe);
router.put("/me/password", verifyToken, updatePassword);

// ── Admin Only Routes ────────────────────────────────────────────
router.get("/", verifyToken, isAdmin, getAllUsers);
router.get("/:id", verifyToken, isAdmin, getUserById);

router.put("/:id/ban", verifyToken, isAdmin, banUser);     
router.put("/:id/unban", verifyToken, isAdmin, unbanUser); 

module.exports = router;