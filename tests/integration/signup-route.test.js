import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

class FakeMailchimp {
  constructor({ result, throws } = {}) {
    this.result = result ?? { ok: true, status: 200 };
    this.throws = throws;
    this.calls = [];
  }
  async addSubscriber(payload) {
    this.calls.push(payload);
    if (this.throws) throw this.throws;
    return this.result;
  }
}

const silentLogger = { warn() {}, error() {}, info() {}, log() {} };

function buildApp(mailchimp) {
  return createApp({ mailchimp, logger: silentLogger });
}

describe("GET /", () => {
  it("serves the signup form", async () => {
    const res = await request(buildApp(new FakeMailchimp())).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Sign me up/);
  });
});

describe("GET /health", () => {
  it("returns ok json", async () => {
    const res = await request(buildApp(new FakeMailchimp())).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("POST /", () => {
  it("returns success page on ok", async () => {
    const fake = new FakeMailchimp({ result: { ok: true, status: 200 } });
    const res = await request(buildApp(fake))
      .post("/")
      .type("form")
      .send({ fName: "Alice", lName: "Liddell", email: "alice@example.com" });
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Success/i);
    expect(fake.calls).toHaveLength(1);
    expect(fake.calls[0]).toMatchObject({
      firstName: "Alice",
      lastName: "Liddell",
      email: "alice@example.com",
    });
  });

  it("returns failure page when validation fails", async () => {
    const fake = new FakeMailchimp();
    const res = await request(buildApp(fake))
      .post("/")
      .type("form")
      .send({ fName: "", lName: "", email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/Failure|something went wrong/i);
    expect(fake.calls).toHaveLength(0);
  });

  it("returns failure page on mailchimp 4xx", async () => {
    const fake = new FakeMailchimp({
      result: { ok: false, status: 400, detail: "bad email" },
    });
    const res = await request(buildApp(fake))
      .post("/")
      .type("form")
      .send({ fName: "A", lName: "B", email: "test@example.com" });
    expect(res.status).toBe(502);
  });

  it("returns failure page on transport error", async () => {
    const { MailchimpError } = await import("../../src/services/mailchimp.js");
    const fake = new FakeMailchimp({ throws: new MailchimpError("network down") });
    const res = await request(buildApp(fake))
      .post("/")
      .type("form")
      .send({ fName: "A", lName: "B", email: "test@example.com" });
    expect(res.status).toBe(502);
  });

  it("lowercases email before sending to mailchimp", async () => {
    const fake = new FakeMailchimp();
    await request(buildApp(fake))
      .post("/")
      .type("form")
      .send({ fName: "A", lName: "B", email: "Alice@Example.COM" });
    expect(fake.calls[0].email).toBe("alice@example.com");
  });
});

describe("POST /failure", () => {
  it("redirects to /", async () => {
    const res = await request(buildApp(new FakeMailchimp())).post("/failure");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");
  });
});

describe("404", () => {
  it("returns json 404 for unknown routes", async () => {
    const res = await request(buildApp(new FakeMailchimp())).get("/unknown");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not found" });
  });
});
