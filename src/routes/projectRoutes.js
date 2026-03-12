const express = require("express");
const router = express.Router();

const {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
} = require("../controllers/projectController");

const { verifyToken, isAdminOrManager } = require("../middlewares/authMiddleware");
const { createProjectValidation, updateProjectValidation } = require("../validators/projectValidators");

// ── Project CRUD ─────────────────────────────────────────────────
router.post("/", verifyToken, isAdminOrManager, createProjectValidation, createProject);
router.get("/", verifyToken, getAllProjects);                             
router.get("/:id", verifyToken, getProjectById);                        
router.put("/:id", verifyToken, isAdminOrManager, updateProjectValidation, updateProject);
router.delete("/:id", verifyToken, isAdminOrManager, deleteProject);

// ── Member Management ─────────────────────────────────────────────
router.post("/:id/members", verifyToken, isAdminOrManager, addMember);
router.delete("/:id/members/:userId", verifyToken, isAdminOrManager, removeMember);

module.exports = router;