import "dotenv/config";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { MailchimpClient } from "./services/mailchimp.js";

function start() {
  const config = loadConfig();
  const mailchimp = new MailchimpClient({
    apiKey: config.mailchimp.apiKey,
    listId: config.mailchimp.listId,
    serverPrefix: config.mailchimp.serverPrefix,
  });
  const app = createApp({ mailchimp });
  app.listen(config.port, () => {
    console.log(`newsletter listening on :${config.port}`);
  });
}

start();
