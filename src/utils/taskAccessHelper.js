
const Task    = require("../models/Task");
const Project = require("../models/Project");
const { AppError } = require("../utils/errorUtils");

const verifyTaskAccess = async (projectId, taskId, user) => {
  const task = await Task.findOne({ _id: taskId, project: projectId });
  if (!task) throw new AppError("Task not found", 404);

  const project = await Project.findById(projectId);
  if (!project) throw new AppError("Project not found", 404);

  if (user.role === "admin") return task;

  if (user.role === "team_member") {
    if (!task.assignedTo || task.assignedTo.toString() !== user.id)
      throw new AppError("You do not have access to this task.", 403);
    return task;
  }

  if (user.role === "project_manager") {
    if (project.createdBy.toString() !== user.id)
      throw new AppError("You can only access tasks in your own projects.", 403);
    return task;
  }

  throw new AppError("You do not have access to this task.", 403);
};

module.exports = { verifyTaskAccess };