import { describe, expect, it } from "vitest";
import { loadConfig, ConfigError } from "../../src/config.js";

describe("loadConfig", () => {
  it("returns a parsed config when all required vars are present", () => {
    const cfg = loadConfig({
      MAILCHIMP_API_KEY: "abcdef-us21",
      MAILCHIMP_LIST_ID: "list123",
      MAILCHIMP_SERVER_PREFIX: "us21",
    });
    expect(cfg.mailchimp.apiKey).toBe("abcdef-us21");
    expect(cfg.mailchimp.listId).toBe("list123");
    expect(cfg.mailchimp.serverPrefix).toBe("us21");
    expect(cfg.port).toBe(3000);
  });

  it("respects PORT override", () => {
    const cfg = loadConfig({
      MAILCHIMP_API_KEY: "k",
      MAILCHIMP_LIST_ID: "l",
      MAILCHIMP_SERVER_PREFIX: "us21",
      PORT: "8081",
    });
    expect(cfg.port).toBe(8081);
  });

  it("derives server prefix from API key when env var missing", () => {
    const cfg = loadConfig({
      MAILCHIMP_API_KEY: "deadbeef-us9",
      MAILCHIMP_LIST_ID: "list123",
    });
    expect(cfg.mailchimp.serverPrefix).toBe("us9");
  });

  it("throws ConfigError on missing API key", () => {
    expect(() =>
      loadConfig({ MAILCHIMP_LIST_ID: "l", MAILCHIMP_SERVER_PREFIX: "us21" })
    ).toThrow(ConfigError);
  });

  it("throws ConfigError when API key has no server prefix and none provided", () => {
    expect(() =>
      loadConfig({ MAILCHIMP_API_KEY: "no-suffix-here", MAILCHIMP_LIST_ID: "l" })
    ).toThrow(ConfigError);
  });

  it("throws ConfigError on missing list id", () => {
    expect(() => loadConfig({ MAILCHIMP_API_KEY: "k-us21" })).toThrow(ConfigError);
  });
});
