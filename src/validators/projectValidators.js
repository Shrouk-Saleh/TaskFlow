const Joi = require("joi");

// ── Helper: run Joi validation and call next on error ────────────
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly: false,   // collect ALL errors not just the first
   stripUnknown: true, // remove extra fields
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

// ── Create Project Schema ────────────────────────────────────────
const createProjectSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).required()
    .messages({
      "string.min": "Project name must be at least 3 characters",
      "string.max": "Project name cannot exceed 100 characters",
      "any.required": "Project name is required",
      "string.empty": "Project name is required",
    }),

  description: Joi.string().trim().max(500).optional().allow("")
    .messages({
      "string.max": "Description cannot exceed 500 characters",
    }),
});

// ── Update Project Schema ────────────────────────────────────────
const updateProjectSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).optional()
    .messages({
      "string.min": "Project name must be at least 3 characters",
      "string.max": "Project name cannot exceed 100 characters",
    }),

  description: Joi.string().trim().max(500).optional().allow("")
    .messages({
      "string.max": "Description cannot exceed 500 characters",
    }),

  status: Joi.string().valid("active", "on_hold", "completed").optional()
    .messages({
      "any.only": "Status must be active, on_hold, or completed",
    }),
});

module.exports = {
  createProjectValidation: validate(createProjectSchema),
  updateProjectValidation: validate(updateProjectSchema),
};