/**
 * Environment loading + validation.
 * Keep all string-from-env parsing here; the rest of the app sees typed objects.
 */
import { z } from "zod";

export class ConfigError extends Error {
  constructor(message, issues = undefined) {
    super(message);
    this.name = "ConfigError";
    this.issues = issues;
  }
}

const schema = z.object({
  MAILCHIMP_API_KEY: z
    .string()
    .min(1, "MAILCHIMP_API_KEY is required"),
  MAILCHIMP_LIST_ID: z
    .string()
    .min(1, "MAILCHIMP_LIST_ID is required"),
  MAILCHIMP_SERVER_PREFIX: z.string().optional(),
  PORT: z
    .string()
    .regex(/^\d+$/, "PORT must be an integer")
    .optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
});

export function loadConfig(env = process.env) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError("invalid environment", parsed.error.issues);
  }
  const data = parsed.data;
  const serverPrefix =
    data.MAILCHIMP_SERVER_PREFIX ?? deriveServerPrefix(data.MAILCHIMP_API_KEY);
  if (!serverPrefix) {
    throw new ConfigError(
      "MAILCHIMP_SERVER_PREFIX is required when API key has no '-<dc>' suffix",
    );
  }
  return Object.freeze({
    port: data.PORT ? Number(data.PORT) : 3000,
    logLevel: data.LOG_LEVEL ?? "info",
    mailchimp: Object.freeze({
      apiKey: data.MAILCHIMP_API_KEY,
      listId: data.MAILCHIMP_LIST_ID,
      serverPrefix,
    }),
  });
}

function deriveServerPrefix(apiKey) {
  const idx = apiKey.lastIndexOf("-");
  if (idx === -1) return undefined;
  const candidate = apiKey.slice(idx + 1);
  return /^us\d+$/.test(candidate) ? candidate : undefined;
}
