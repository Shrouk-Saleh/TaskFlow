const Joi = require("joi");

// ── Helper: run Joi validation and call next on error ────────────
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly: false,  
    allowUnknown: false
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

// ── Register Schema ──────────────────────────────────────────────
const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required()
    .messages({
      "string.min": "Name must be at least 2 characters",
      "string.max": "Name cannot exceed 50 characters",
      "any.required": "Name is required",
    }),

  email: Joi.string().trim().email().required()
    .messages({
      "string.email": "Please provide a valid email",
      "any.required": "Email is required",
    }),

  password: Joi.string().min(6).pattern(/\d/).required()
    .messages({
      "string.min": "Password must be at least 6 characters",
      "string.pattern.base": "Password must contain at least one number",
      "any.required": "Password is required",
    }),

  confirmPassword: Joi.string().valid(Joi.ref("password")).required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Please confirm your password",
    }),

  role: Joi.string().valid("admin", "project_manager", "team_member")
    .messages({
      "any.only": "Role must be admin, project_manager, or team_member",
    }),
});

// ── Login Schema ─────────────────────────────────────────────────
const loginSchema = Joi.object({
  email: Joi.string().trim().email().required()
    .messages({
      "string.email": "Please provide a valid email",
      "any.required": "Email is required",
    }),

  password: Joi.string().required()
    .messages({
      "any.required": "Password is required",
    }),
});

module.exports = {
  registerValidation: validate(registerSchema),
  loginValidation: validate(loginSchema),
};