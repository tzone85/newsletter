import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSignupRouter } from "./routes/signup.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

/**
 * Application factory — pure composition root.
 * Tests pass a fake `mailchimp`; production wires `MailchimpClient`.
 */
export function createApp({ mailchimp, logger = console } = {}) {
  if (!mailchimp) throw new Error("createApp requires a mailchimp client");
  const app = express();

  app.disable("x-powered-by");
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use("/public", express.static(PUBLIC_DIR));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/", buildSignupRouter({ mailchimp, logger }));

  // 404
  app.use((_req, res) => res.status(404).json({ error: "not found" }));

  // central error handler
  app.use((err, _req, res, _next) => {
    logger.error("unhandled error", err);
    res.status(500).json({ error: "internal server error" });
  });

  return app;
}
