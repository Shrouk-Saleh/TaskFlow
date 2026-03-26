const Comment = require("../models/Comment");
const { AppError } = require("../utils/errorUtils");

// ── What moves are allowed from each status ──────────────────────
const ALLOWED_TRANSITIONS = {
  todo:        ["in_progress"],
  in_progress: ["review"],
  review:      ["done", "todo"], // done = approved | todo = rejected
  done:        [],               // terminal — no more moves
};

// ── Who can make each move ───────────────────────────────────────
const TRANSITION_ROLES = {
  todo_to_in_progress:   ["team_member"],
  in_progress_to_review: ["team_member"],
  review_to_done:        ["project_manager", "admin"],
  review_to_todo:        ["project_manager", "admin"], // rejection
};

const transitionTask = async (task, newStatus, user, reason) => {
  const from = task.status;

  // 1) Is this transition allowed at all?
  if (!ALLOWED_TRANSITIONS[from].includes(newStatus)) {
    throw new AppError(
      `Cannot move from "${from}" to "${newStatus}". Allowed: [${ALLOWED_TRANSITIONS[from].join(", ") || "none"}]`,
      400
    );
  }

  // 2) Does this user's role allow this move?
  const key = `${from}_to_${newStatus}`;
  const allowedRoles = TRANSITION_ROLES[key];

  if (!allowedRoles.includes(user.role)) {
    throw new AppError(
      `Only [${allowedRoles.join(", ")}] can move a task from "${from}" to "${newStatus}".`,
      403
    );
  }

  // 3) Team member can only move tasks assigned to them
  if (user.role === "team_member") {
    if (!task.assignedTo || task.assignedTo.toString() !== user.id) {
      throw new AppError("You can only update tasks assigned to you.", 403);
    }
  }

  // 4) Self-review prevention
  // The person assigned to the task cannot be the one to approve or reject it
  if (from === "review" && (newStatus === "done" || newStatus === "todo")) {
    if (task.assignedTo && task.assignedTo.toString() === user.id) {
      throw new AppError("You cannot approve or reject a task assigned to yourself.", 403);
    }
  }

  // 5) Rejection requires a reason
  if (from === "review" && newStatus === "todo") {
    if (!reason || reason.trim() === "") {
      throw new AppError("A rejection reason is required.", 400);
    }

    // Auto-create a system comment with the rejection reason
    await Comment.create({
      task: task._id,
      author: user.id,
      content: `Rejected: ${reason.trim()}`,
      isSystemComment: true,
    });
  }

  // 6) Apply the transition
  task.status = newStatus;
  await task.save();

  return task;
};

module.exports = { transitionTask };
