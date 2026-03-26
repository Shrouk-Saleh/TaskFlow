const express = require("express");
const router = express.Router(); // no mergeParams needed

const {
    createTask,
    getProjectTasks,
    getTaskById,
    updateTask,
    deleteTask,
    updateTaskStatus,
} = require("../controllers/taskController");

const { verifyToken, isAdminOrManager } = require("../middlewares/authMiddleware");
const { createTaskValidation, updateTaskValidation, updateStatusValidation } = require("../validators/taskValidators");

router.post("/:projectId", verifyToken, isAdminOrManager, createTaskValidation, createTask);
router.get("/:projectId", verifyToken, getProjectTasks);
router.get("/:projectId/:taskId", verifyToken, getTaskById);
router.put("/:projectId/:taskId", verifyToken, isAdminOrManager, updateTaskValidation, updateTask);
router.delete("/:projectId/:taskId", verifyToken, isAdminOrManager, deleteTask);
router.patch("/:projectId/:taskId/status", verifyToken, updateStatusValidation, updateTaskStatus);

module.exports = router;