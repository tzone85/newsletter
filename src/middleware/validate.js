import { z } from "zod";

export const signupSchema = z.object({
  fName: z.string().trim().min(1, "first name is required").max(100),
  lName: z.string().trim().min(1, "last name is required").max(100),
  email: z.string().trim().toLowerCase().email("invalid email"),
});

/**
 * Express middleware that parses + validates the request body against a zod
 * schema, attaching the parsed value as `req.validatedBody`. Renders the
 * failure view on validation error so the form-driven UX stays consistent.
 */
export function validateBody(schema, { onError } = {}) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      if (onError) return onError(req, res, parsed.error);
      return res.status(422).json({ error: "validation failed", issues: parsed.error.issues });
    }
    req.validatedBody = parsed.data;
    next();
  };
}
