const Comment = require("../models/Comment");
const Task    = require("../models/Task");
const Project = require("../models/Project");
const { AppError } = require("../utils/errorUtils");

// ── Helper: same rules as task APIs — admin all, PM own project, member if assigned
const verifyTaskAccess = async (projectId, taskId, user) => {
  const task = await Task.findOne({ _id: taskId, project: projectId });
  if (!task) throw new AppError("Task not found", 404);

  const project = await Project.findById(projectId);
  if (!project) throw new AppError("Project not found", 404);

  if (user.role === "admin") return task;

  if (user.role === "team_member") {
    if (!task.assignedTo || task.assignedTo.toString() !== user.id) {
      throw new AppError("You do not have access to this task.", 403);
    }
    return task;
  }

  if (user.role === "project_manager") {
    if (project.createdBy.toString() !== user.id) {
      throw new AppError("You can only access tasks in your own projects.", 403);
    }
    return task;
  }

  throw new AppError("You do not have access to this task.", 403);
};

// ────────────────────────────────────────────────────────────────
// @desc    Add comment to a task
// @route   POST /api/comments/:projectId/:taskId
// @access  Admin | Manager (own project) | Member (assigned)
// ────────────────────────────────────────────────────────────────
const addComment = async (req, res, next) => {
  try {
    const { projectId, taskId } = req.params;
    const { content } = req.body;

    // Same access check for everyone — consistent
    await verifyTaskAccess(projectId, taskId, req.user);

    const comment = await Comment.create({
      task: taskId,
      author: req.user.id,
      content: content.trim(),
      isSystemComment: false,
    });

    await comment.populate("author", "name email role");

    res.status(201).json({
      status: "success",
      message: "Comment added successfully",
      data: { comment },
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get all comments for a task
// @route   GET /api/comments/:projectId/:taskId
// @access  Admin | Manager (own project) | Member (assigned)
// ────────────────────────────────────────────────────────────────
const getTaskComments = async (req, res, next) => {
  try {
    const { projectId, taskId } = req.params;

    // Same check as addComment — now consistent ✅
    await verifyTaskAccess(projectId, taskId, req.user);

    const comments = await Comment.find({ task: taskId })
      .populate("author", "name email role")
      .sort({ createdAt: 1 });

    res.status(200).json({
      status: "success",
      results: comments.length,
      data: { comments },
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Delete a comment
// @route   DELETE /api/comments/:projectId/:taskId/:commentId
// @access  Admin | Comment author only
// ────────────────────────────────────────────────────────────────
const deleteComment = async (req, res, next) => {
  try {
    const { projectId, taskId, commentId } = req.params;

    // Must have task access first — consistent with add/get ✅
    await verifyTaskAccess(projectId, taskId, req.user);

    const comment = await Comment.findById(commentId);
    if (!comment) return next(new AppError("Comment not found", 404));

    // Only author or admin can delete their comment
    const isAuthor = comment.author.toString() === req.user.id;
    const isAdmin  = req.user.role === "admin";

    // System comments are protected, but admins can delete them
    if (comment.isSystemComment && !isAdmin) {
      return next(new AppError("System comments cannot be deleted.", 403));
    }

    if (!isAuthor && !isAdmin) {
      return next(new AppError("You can only delete your own comments.", 403));
    }

    await comment.deleteOne();

    res.status(200).json({
      status: "success",
      message: "Comment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { addComment, getTaskComments, deleteComment };