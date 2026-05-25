/**
 * Thin async client for the Mailchimp Marketing API (members endpoint).
 *
 * `addSubscriber` distinguishes three outcomes:
 *  - ok=true               → 2xx response, member added or already present
 *  - ok=false              → 4xx/5xx with a structured Mailchimp error body
 *  - throws MailchimpError → transport failure (DNS, connection, timeout)
 *
 * The route handler treats `ok=false` as a user-facing failure (HTML failure
 * page) and `MailchimpError` as a 502 to surface infra issues.
 */
import { fetch } from "undici";

export class MailchimpError extends Error {
  constructor(message, { cause } = {}) {
    super(message);
    this.name = "MailchimpError";
    if (cause) this.cause = cause;
  }
}

export class MailchimpClient {
  #apiKey;
  #listId;
  #baseUrl;
  #fetch;

  constructor({ apiKey, listId, serverPrefix, fetchImpl } = {}) {
    if (!apiKey) throw new Error("apiKey required");
    if (!listId) throw new Error("listId required");
    if (!serverPrefix) throw new Error("serverPrefix required");
    this.#apiKey = apiKey;
    this.#listId = listId;
    this.#baseUrl = `https://${serverPrefix}.api.mailchimp.com/3.0`;
    this.#fetch = fetchImpl ?? fetch;
  }

  async addSubscriber({ firstName, lastName, email }) {
    const url = `${this.#baseUrl}/lists/${this.#listId}/members`;
    const body = {
      email_address: email,
      status: "subscribed",
      merge_fields: { FNAME: firstName, LNAME: lastName },
    };
    let response;
    try {
      response = await this.#fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization:
            "Basic " + Buffer.from(`anystring:${this.#apiKey}`).toString("base64"),
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new MailchimpError("mailchimp request failed", { cause: err });
    }

    if (response.ok) {
      return { ok: true, status: response.status };
    }
    const detail = await safeJsonOrText(response);
    return {
      ok: false,
      status: response.status,
      detail: typeof detail === "string" ? detail : JSON.stringify(detail),
    };
  }
}

async function safeJsonOrText(response) {
  const contentType = response.headers.get("content-type") ?? "";
  try {
    return contentType.includes("json") ? await response.json() : await response.text();
  } catch {
    return "";
  }
}
