import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  fetch,
  MockAgent,
  setGlobalDispatcher,
  getGlobalDispatcher,
} from "undici";
import {
  MailchimpClient,
  MailchimpError,
} from "../../src/services/mailchimp.js";

const baseUrl = "https://us21.api.mailchimp.com";
const listPath = "/3.0/lists/list123/members";

function newClient(overrides = {}) {
  return new MailchimpClient({
    apiKey: "secret-us21",
    listId: "list123",
    serverPrefix: "us21",
    fetchImpl: fetch,
    ...overrides,
  });
}

describe("MailchimpClient.addSubscriber", () => {
  let agent;
  let originalDispatcher;
  let pool;

  beforeEach(() => {
    originalDispatcher = getGlobalDispatcher();
    agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);
    pool = agent.get(baseUrl);
  });

  afterEach(async () => {
    await agent.close();
    setGlobalDispatcher(originalDispatcher);
  });

  it("POSTs the correct subscriber payload and returns success", async () => {
    pool
      .intercept({
        method: "POST",
        path: listPath,
        body: JSON.stringify({
          email_address: "alice@example.com",
          status: "subscribed",
          merge_fields: { FNAME: "Alice", LNAME: "Liddell" },
        }),
      })
      .reply(200, { email_address: "alice@example.com", status: "subscribed" });

    const result = await newClient().addSubscriber({
      firstName: "Alice",
      lastName: "Liddell",
      email: "alice@example.com",
    });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it("returns ok=false on 4xx without throwing", async () => {
    pool
      .intercept({ method: "POST", path: listPath })
      .reply(400, { title: "Invalid Resource", detail: "looks fake" });
    const result = await newClient().addSubscriber({
      firstName: "A",
      lastName: "B",
      email: "x@example.com",
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.detail).toMatch(/looks fake/);
  });

  it("returns ok=false on 5xx", async () => {
    pool
      .intercept({ method: "POST", path: listPath })
      .reply(500, { title: "Server Error" });
    const result = await newClient().addSubscriber({
      firstName: "A",
      lastName: "B",
      email: "x@example.com",
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
  });

  it("throws MailchimpError when the upstream call errors", async () => {
    pool
      .intercept({ method: "POST", path: listPath })
      .replyWithError(new Error("connection refused"));
    await expect(
      newClient().addSubscriber({
        firstName: "A",
        lastName: "B",
        email: "x@example.com",
      }),
    ).rejects.toThrow(MailchimpError);
  });

  it("sends Basic auth header derived from apiKey", async () => {
    const expectedAuth =
      "Basic " + Buffer.from("anystring:secret-us21").toString("base64");
    pool
      .intercept({
        method: "POST",
        path: listPath,
        headers: { authorization: expectedAuth },
      })
      .reply(200, {});
    const result = await newClient().addSubscriber({
      firstName: "A",
      lastName: "B",
      email: "x@example.com",
    });
    expect(result.ok).toBe(true);
  });
});
