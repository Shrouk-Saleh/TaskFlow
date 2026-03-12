const Project = require("../models/Project");
const User = require("../models/User");
const { AppError } = require("../utils/errorUtils");

// ────────────────────────────────────────────────────────────────
// @desc    Create a new project
// @route   POST /api/projects
// @access  Project Manager only
// ────────────────────────────────────────────────────────────────
const createProject = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const project = await Project.create({
      name,
      description,
      createdBy: req.user.id, 
    });

    res.status(201).json({
      status: "success",
      message: "Project created successfully",
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get all projects
// @route   GET /api/projects
// @access  Admin → all projects | Manager → own projects | Member → their projects
// ────────────────────────────────────────────────────────────────
const getAllProjects = async (req, res, next) => {
  try {
    let filter = {};

    if (req.user.role === "project_manager") {
      // Manager sees only projects they created
      filter = { createdBy: req.user.id };
    } else if (req.user.role === "team_member") {
      // Member sees only projects they are a member of
      filter = { members: req.user.id };
    }
    // Admin sees everything — filter stays {}
     if (req.query.status) {
      filter.status = req.query.status;
    }

    const projects = await Project.find(filter)
      .populate("createdBy", "name email")   
      .populate("members", "name email role") 

    res.status(200).json({
      status: "success",
      results: projects.length,
      data: { projects },
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Admin | Manager (own) | Member (if in project)
// ────────────────────────────────────────────────────────────────
const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("members", "name email role")
    if (!project) return next(new AppError("Project not found", 404));

    // ── Ownership / membership check ─────────────────────────────
    const isAdmin = req.user.role === "admin";
    const isOwner = project.createdBy._id.toString() === req.user.id;
    const isMember = project.members.some((m) => m._id.toString() === req.user.id);

    if (!isAdmin && !isOwner && !isMember) {
      return next(new AppError("You do not have access to this project.", 403));
    }

    res.status(200).json({
      status: "success",
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Update project (name, description, status)
// @route   PUT /api/projects/:id
// @access  Admin | Manager (own projects only)
// ────────────────────────────────────────────────────────────────
const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return next(new AppError("Project not found", 404));

    // Manager can only update their own projects
    if (
      req.user.role === "project_manager" &&
      project.createdBy.toString() !== req.user.id
    ) {
      return next(new AppError("You can only update your own projects.", 403));
    }

    const { name, description, status } = req.body;

    const updated = await Project.findByIdAndUpdate(
      req.params.id,
      { name, description, status },
      { new: true, runValidators: true }
    ).populate("createdBy", "name email")
     .populate("members", "name email role");

    res.status(200).json({
      status: "success",
      message: "Project updated successfully",
      data: { project: updated },
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Admin | Manager (own projects only)
// ────────────────────────────────────────────────────────────────
const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return next(new AppError("Project not found", 404));

    // Manager can only delete their own projects
    if (
      req.user.role === "project_manager" &&
      project.createdBy.toString() !== req.user.id
    ) {
      return next(new AppError("You can only delete your own projects.", 403));
    }

    await project.deleteOne();

    res.status(200).json({
      status: "success",
      message: "Project deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Add a member to project
// @route   POST /api/projects/:id/members
// @access  Admin | Manager (own projects only)
// ────────────────────────────────────────────────────────────────
const addMember = async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) return next(new AppError("Please provide a userId", 400));

    const project = await Project.findById(req.params.id);
    if (!project) return next(new AppError("Project not found", 404));

    // Manager can only manage their own projects
    if (
      req.user.role === "project_manager" &&
      project.createdBy.toString() !== req.user.id
    ) {
      return next(new AppError("You can only manage your own projects.", 403));
    }

    // Check the user exists and is a team_member
    const userToAdd = await User.findById(userId);
    if (!userToAdd) return next(new AppError("User not found", 404));

    if (userToAdd.role !== "team_member") {
      return next(new AppError("Only team members can be added to projects.", 400));
    }

    // Check if already a member
    if (project.members.includes(userId)) {
      return next(new AppError("User is already a member of this project.", 409));
    }

    project.members.push(userId);
    await project.save();

    await project.populate("members", "name email role");

    res.status(200).json({
      status: "success",
      message: `"${userToAdd.name}" added to project successfully`,
      data: { members: project.members },
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Remove a member from project
// @route   DELETE /api/projects/:id/members/:userId
// @access  Admin | Manager (own projects only)
// ────────────────────────────────────────────────────────────────
const removeMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return next(new AppError("Project not found", 404));

    // Manager can only manage their own projects
    if (
      req.user.role === "project_manager" &&
      project.createdBy.toString() !== req.user.id
    ) {
      return next(new AppError("You can only manage your own projects.", 403));
    }

    // Check member is actually in the project
    const isMember = project.members.includes(req.params.userId);
    if (!isMember) {
      return next(new AppError("This user is not a member of this project.", 404));
    }

    project.members = project.members.filter(
      (id) => id.toString() !== req.params.userId
    );
    await project.save();

    res.status(200).json({
      status: "success",
      message: "Member removed from project successfully",
      data: { members: project.members },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
};