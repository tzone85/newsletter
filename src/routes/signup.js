import { Router } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { signupSchema, validateBody } from "../middleware/validate.js";
import { MailchimpError } from "../services/mailchimp.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIEWS = path.resolve(__dirname, "..", "..", "views");

export function buildSignupRouter({ mailchimp, logger = console }) {
  const router = Router();

  router.get("/", (_req, res) => {
    res.sendFile(path.join(VIEWS, "signup.html"));
  });

  router.post(
    "/",
    validateBody(signupSchema, {
      onError: (_req, res) => res.status(400).sendFile(path.join(VIEWS, "failure.html")),
    }),
    async (req, res, next) => {
      try {
        const { fName, lName, email } = req.validatedBody;
        const result = await mailchimp.addSubscriber({
          firstName: fName,
          lastName: lName,
          email,
        });
        if (result.ok) {
          return res.status(200).sendFile(path.join(VIEWS, "success.html"));
        }
        logger.warn(
          "mailchimp non-ok response: status=%d detail=%s",
          result.status,
          result.detail,
        );
        return res.status(502).sendFile(path.join(VIEWS, "failure.html"));
      } catch (err) {
        if (err instanceof MailchimpError) {
          logger.error("mailchimp transport error: %s", err.message);
          return res.status(502).sendFile(path.join(VIEWS, "failure.html"));
        }
        return next(err);
      }
    },
  );

  router.post("/failure", (_req, res) => res.redirect("/"));

  return router;
}
