import { test as authTest } from "./auth.fixture.js";
import { ApiClient } from "../helpers/api-client.js";
import { DbHelper } from "../helpers/db.js";

type ExtendedFixtures = {
  api: ApiClient;
  db: DbHelper;
};

export const test = authTest.extend<ExtendedFixtures>({
  api: async ({}, use) => {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    const client = new ApiClient(apiUrl);
    await use(client);
  },

  db: async ({}, use) => {
    const helper = new DbHelper();
    await use(helper);
    await helper.cleanup();
  },
});

export { expect } from "@playwright/test";
