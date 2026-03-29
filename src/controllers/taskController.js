const Task = require("../models/Task");
const Project = require("../models/Project");
const Comment = require("../models/Comment");
const { AppError } = require("../utils/errorUtils");
const { transitionTask } = require("./task.service");

// ────────────────────────────────────────────────────────────────
// @desc    Create task
// @route   POST /api/projects/:projectId/tasks
// @access  Admin | Manager (own project)
// ────────────────────────────────────────────────────────────────
const createTask = async (req, res, next) => {
  try {
    const { title, description, assignedTo, priority, dueDate } = req.body;
    const { projectId } = req.params;

    // 1) Project must exist
    const project = await Project.findById(projectId);
    if (!project) return next(new AppError("Project not found", 404));

    // 2) Manager can only create tasks in their own project
    if (req.user.role === "project_manager" && project.createdBy.toString() !== req.user.id) {
      return next(new AppError("You can only create tasks in your own projects.", 403));
    }

    // 3) assignedTo must be a member of this project
    if (assignedTo) {
      const isMember = project.members.some((m) => m.toString() === assignedTo);
      if (!isMember) {
        return next(new AppError("Assigned user is not a member of this project.", 400));
      }
    }

    const task = await Task.create({
      title,
      description,
      project: projectId,
      assignedTo: assignedTo || null,
      createdBy: req.user.id,
      priority,
      dueDate,
    });

    await task.populate([
      { path: "assignedTo", select: "name email" },
      { path: "createdBy", select: "name email" },
    ]);

    res.status(201).json({
      status: "success",
      message: "Task created successfully",
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get all tasks for a project
// @route   GET /api/projects/:projectId/tasks
// @access  Admin | Manager (own) | Member (own tasks only)
// ────────────────────────────────────────────────────────────────
const getProjectTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return next(new AppError("Project not found", 404));

    // Access check
    const isAdmin   = req.user.role === "admin";
    const isOwner   = project.createdBy.toString() === req.user.id;
    const isMember  = project.members.some((m) => m.toString() === req.user.id);

    if (!isAdmin && !isOwner && !isMember) {
      return next(new AppError("You do not have access to this project.", 403));
    }

    // Build filter
    let filter = { project: projectId };

    // Member only sees their own tasks
    if (req.user.role === "team_member") filter.assignedTo = req.user.id;

    if (req.query.status)   filter.status   = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;

    const tasks = await Task.find(filter)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      results: tasks.length,
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get single task
// @route   GET /api/projects/:projectId/tasks/:taskId
// @access  Admin | Manager (own project) | Member (assigned)
// ────────────────────────────────────────────────────────────────
const getTaskById = async (req, res, next) => {
  try {
    const { projectId, taskId } = req.params;

    const task = await Task.findOne({ _id: taskId, project: projectId })
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")
      .populate("project", "name status");

    if (!task) return next(new AppError("Task not found", 404));

    // Access check
    const isAdmin    = req.user.role === "admin";
    const isOwner    = task.createdBy._id.toString() === req.user.id;
    const isAssigned = task.assignedTo?._id.toString() === req.user.id;

    if (!isAdmin && !isOwner && !isAssigned) {
      return next(new AppError("You do not have access to this task.", 403));
    }

    res.status(200).json({
      status: "success",
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Update task details (NOT status — use /status for that)
// @route   PUT /api/projects/:projectId/tasks/:taskId
// @access  Admin | Manager (own project)
// ────────────────────────────────────────────────────────────────
const updateTask = async (req, res, next) => {
  try {
    const { projectId, taskId } = req.params;

    // Block status changes here — must use /status endpoint
    if (req.body.status) {
      return next(new AppError("Use PATCH /tasks/:taskId/status to change task status.", 400));
    }

    const project = await Project.findById(projectId);
    if (!project) return next(new AppError("Project not found", 404));

    if (req.user.role === "project_manager" && project.createdBy.toString() !== req.user.id) {
      return next(new AppError("You can only update tasks in your own projects.", 403));
    }

    // If reassigning, new assignee must be a project member
    if (req.body.assignedTo) {
      const isMember = project.members.some((m) => m.toString() === req.body.assignedTo);
      if (!isMember) {
        return next(new AppError("Assigned user is not a member of this project.", 400));
      }
    }

    const { title, description, priority, dueDate, assignedTo } = req.body;

    const task = await Task.findByIdAndUpdate(
      taskId,
      { title, description, priority, dueDate, assignedTo },
      { new: true, runValidators: true }
    )
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    if (!task) return next(new AppError("Task not found", 404));

    res.status(200).json({
      status: "success",
      message: "Task updated successfully",
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Delete task
// @route   DELETE /api/projects/:projectId/tasks/:taskId
// @access  Admin | Manager (own project)
// ────────────────────────────────────────────────────────────────
const deleteTask = async (req, res, next) => {
  try {
    const { projectId, taskId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return next(new AppError("Project not found", 404));

    if (req.user.role === "project_manager" && project.createdBy.toString() !== req.user.id) {
      return next(new AppError("You can only delete tasks in your own projects.", 403));
    }

    const task = await Task.findByIdAndDelete(taskId);
    if (!task) return next(new AppError("Task not found", 404));

    // Delete all comments on this task too
    await Comment.deleteMany({ task: taskId });

    res.status(200).json({
      status: "success",
      message: "Task deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Move task through workflow
// @route   PATCH /api/projects/:projectId/tasks/:taskId/status
// @access  Member (todo→in_progress→review) | Manager/Admin (review→done or review→todo)
// ────────────────────────────────────────────────────────────────
const updateTaskStatus = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { status, reason } = req.body;

    if (!status) return next(new AppError("Please provide the new status.", 400));

    const task = await Task.findById(taskId);
    if (!task) return next(new AppError("Task not found", 404));

    // All logic lives in the service
    const updatedTask = await transitionTask(task, status, req.user, reason);

    await updatedTask.populate([
      { path: "assignedTo", select: "name email" },
      { path: "createdBy", select: "name email" },
    ]);

    res.status(200).json({
      status: "success",
      message: `Task moved to "${status}"`,
      data: { task: updatedTask },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus,
};