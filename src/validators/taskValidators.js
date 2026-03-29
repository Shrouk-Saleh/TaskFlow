const Joi = require("joi");

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly: false,   // collect ALL errors not just the first
    stripUnknown: true,  // remove extra fields
  });

  if (error) {
    return res.status(400).json({
      status: "fail",
      errors: error.details.map((e) => ({
        field: e.path[0],
        message: e.message.replace(/['"]/g, ""),
      })),
    });
  }

  next();
};

// ── Create Task ──────────────────────────────────────────────────
const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required()
    .messages({
      "any.required": "Task title is required",
      "string.empty": "Task title is required",
      "string.min": "Title must be at least 3 characters",
      "string.max": "Title cannot exceed 200 characters",
    }),

  description: Joi.string().trim().max(1000).optional().allow(""),

  assignedTo: Joi.string().hex().length(24).optional().allow(null, ""),

  priority: Joi.string().valid("low", "medium", "high").optional()
    .messages({ "any.only": "Priority must be low, medium, or high" }),

  dueDate: Joi.date().optional().allow(null),
});

// ── Update Task ──────────────────────────────────────────────────
const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).optional(),
  description: Joi.string().trim().max(1000).optional().allow(""),
  assignedTo: Joi.string().hex().length(24).optional().allow(null, ""),
  priority: Joi.string().valid("low", "medium", "high").optional(),
  dueDate: Joi.date().optional().allow(null),
});

// ── Update Status ────────────────────────────────────────────────
const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid("todo", "in_progress", "review", "done")
    .required()
    .messages({
      "any.required": "Status is required",
      "any.only": "Status must be todo, in_progress, review, or done",
    }),

  reason: Joi.string().trim().max(500).optional().allow(""),
});

// ── Add Comment ──────────────────────────────────────────────────
const addCommentSchema = Joi.object({
  content: Joi.string().trim().min(1).max(1000).required()
    .messages({
      "any.required": "Comment content is required",
      "string.empty": "Comment cannot be empty",
      "string.max": "Comment cannot exceed 1000 characters",
    }),
});

module.exports = {
  createTaskValidation: validate(createTaskSchema),
  updateTaskValidation: validate(updateTaskSchema),
  updateStatusValidation: validate(updateStatusSchema),
  addCommentValidation: validate(addCommentSchema),
};
