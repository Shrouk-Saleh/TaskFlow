const express = require("express");
const router = express.Router();

const { addComment, getTaskComments, deleteComment } = require("../controllers/commentController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { addCommentValidation } = require("../validators/taskValidators");

// Any authenticated user can do these — access checked inside controller
router.post("/:projectId/:taskId", verifyToken, addCommentValidation, addComment);
router.get("/:projectId/:taskId", verifyToken, getTaskComments);
router.delete("/:projectId/:taskId/:commentId", verifyToken, deleteComment);

module.exports = router;