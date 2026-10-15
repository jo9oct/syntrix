// STATUS: UPDATED
// File: test/services/crawlOpenApiPersistence.test.js

import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { createHmac } from "node:crypto";
import mongoose from "mongoose";

const TARGET_URL = "https://example.com/";

const PAGE_KEY_SECRET = "test-only-crawl-page-key-secret-32-bytes-minimum";

const CRAWLER_MODULE_URL = new URL("../../src/core/crawler.js", import.meta.url)
  .href;

const SECRET_INPUT_VALUE = "DO_NOT_PERSIST_THIS_VALUE";
const SECRET_PASSWORD_VALUE = "DO_NOT_PERSIST_THIS_PASSWORD";

/*
 * Replace only the crawler module.
 * The crawl service, scope logic, plans, and repositories
 * remain real.
 *
 * The fake crawler never performs network requests.
 */
registerHooks({
  load(url, context, nextLoad) {
    if (url !== CRAWLER_MODULE_URL) {
      return nextLoad(url, context);
    }

    return {
      format: "module",
      shortCircuit: true,
      source: `
        export const MAX_PATHS_HARD_LIMIT = 5000;
        export const MAX_DEPTH_HARD_LIMIT = 20;

        export const crawl = async ({ onPage }) => {
          const page = {
            url: 'https://example.com/',
            depth: 0,
            status: 'success',
            statusCode: 200,
            headers: {
              'content-type': 'text/html',
            },
            body: \`
              <!doctype html>
              <html>
                <body>
                  <form action="/search" method="get" id="search-form">
                    <label for="term">Search</label>
                    <input
                      id="term"
                      name="term"
                      type="text"
                      required
                      minlength="2"
                      maxlength="80"
                      pattern="[a-zA-Z]+"
                      value="DO_NOT_PERSIST_THIS_VALUE"
                    />

                    <select name="category">
                      <option value="books" selected>Books</option>
                      <option value="music">Music</option>
                    </select>

                    <input
                      name="attachment"
                      type="file"
                      accept=".pdf,image/*"
                      multiple
                    />

                    <input
                      name="password"
                      type="password"
                      value="DO_NOT_PERSIST_THIS_PASSWORD"
                    />
                  </form>
                </body>
              </html>
            \`,
            discoveredLinks: [],
            dynamicInputs: [],
            dynamicForms: [],
            apiRequests: [],
          };

          await onPage(page);

          return {
            pages: [
              {
                url: page.url,
                depth: 0,
                status: 'success',
                statusCode: 200,
                openApiEndpoints: [
                  {
                    path: '/api/users',
                    method: 'GET',
                  },
                  {
                    path: '/api/users',
                    method: 'GET',
                  },
                  {
                    path: '/api/users/{id}',
                    method: 'DELETE',
                  },
                  {
                    path: '//outside.example/path',
                    method: 'GET',
                  },
                  {
                    path: '/api/invalid',
                    method: 'INVALID',
                  },
                  {
                    path: '/api/users',
                    method: 'get',
                  },
                ],
              },
            ],
            visited: 1,
            cancelled: false,
          };
        };
      `,
    };
  },
});

const { runCrawlAndPersist } =
  await import("../../src/services/crawl.service.js");

const { default: CrawlPage } =
  await import("../../src/database/models/crawlPage.model.js");

const { default: CrawlData } =
  await import("../../src/database/models/crawlData.model.js");

const createLeanResult = (value) => ({
  lean: async () => value,
});

const assertSameObjectId = (actual, expected) => {
  assert.equal(String(actual), String(expected));
};

test("crawl service persists OpenAPI and safe input metadata without double-counting pages", async () => {
  const previousSecret = process.env.CRAWL_PAGE_KEY_SECRET;

  process.env.CRAWL_PAGE_KEY_SECRET = PAGE_KEY_SECRET;

  const ownerId = new mongoose.Types.ObjectId();
  const scanId = new mongoose.Types.ObjectId();

  const pageWrites = [];
  const pageDeletes = [];
  const sessionWrites = [];
  const countUpdates = [];

  /*
   * Intercept actual repository-to-model operations.
   * No MongoDB connection is created.
   */
  const mocks = [
    mock.method(CrawlPage, "deleteMany", async (filter) => {
      pageDeletes.push(filter);
      return { deletedCount: 0 };
    }),

    mock.method(CrawlPage, "findOneAndUpdate", (filter, update, options) => {
      pageWrites.push({
        filter,
        update,
        options,
      });

      return createLeanResult({
        ...filter,
        ...update.$set,
      });
    }),

    mock.method(CrawlData, "findOneAndUpdate", (filter, update, options) => {
      sessionWrites.push({
        filter,
        update,
        options,
      });

      return createLeanResult({
        ...filter,
        ...update.$set,
      });
    }),

    mock.method(CrawlData, "updateOne", async (filter, update) => {
      countUpdates.push({
        filter,
        update,
      });

      return {
        acknowledged: true,
        matchedCount: 1,
        modifiedCount: 1,
      };
    }),
  ];

  try {
    const result = await runCrawlAndPersist({
      ownerId,
      scanId,
      targetUrl: TARGET_URL,
      plan: "free",
      scopeSnapshot: [],
    });

    /*
     * 1. Crawl finishes successfully.
     */
    assert.equal(result.status, "completed");
    assert.equal(result.visited, 1);
    assert.equal(result.plan, "free");

    /*
     * 2. Existing crawl pages are cleared only
     * within the correct owner and scan.
     */
    assert.equal(pageDeletes.length, 1);

    assertSameObjectId(pageDeletes[0].ownerId, ownerId);
    assertSameObjectId(pageDeletes[0].scanId, scanId);

    /*
     * 3. Exactly two page writes:
     *    - initial page upsert
     *    - OpenAPI metadata update
     */
    assert.equal(pageWrites.length, 2);

    const [initialWrite, metadataWrite] = pageWrites;

    assert.equal(initialWrite.options.upsert, true);
    assert.equal(metadataWrite.options.upsert, false);
    assert.equal(metadataWrite.options.runValidators, true);

    /*
     * 4. Verify correct owner and scan.
     */
    for (const write of pageWrites) {
      assertSameObjectId(write.filter.ownerId, ownerId);
      assertSameObjectId(write.filter.scanId, scanId);
    }

    /*
     * 5. Verify both writes use the same HMAC page key.
     */
    const expectedPageKey = createHmac("sha256", PAGE_KEY_SECRET)
      .update(TARGET_URL, "utf8")
      .digest("hex");

    assert.equal(initialWrite.filter.pageKey, expectedPageKey);
    assert.equal(metadataWrite.filter.pageKey, expectedPageKey);

    /*
     * 6. Verify base page metadata.
     */
    assert.equal(initialWrite.update.$set.url, TARGET_URL);
    assert.equal(initialWrite.update.$set.status, "success");

    /*
     * 7. Verify discovered validation metadata survives
     * extraction, sanitization, and the repository write.
     */
    const persistedInputs = initialWrite.update.$set.inputs;

    assert.ok(Array.isArray(persistedInputs));

    const searchInput = persistedInputs.find((input) => input.name === "term");

    assert.ok(searchInput, "search input should be persisted");
    assert.equal(searchInput.required, true);
    assert.equal(searchInput.minlength, 2);
    assert.equal(searchInput.maxlength, 80);
    assert.equal(searchInput.pattern, "[a-zA-Z]+");

    /*
     * 8. Verify select option metadata.
     */
    const categoryInput = persistedInputs.find(
      (input) => input.name === "category",
    );

    assert.ok(categoryInput, "select input should be persisted");

    assert.deepEqual(categoryInput.options, [
      { value: "books", label: "Books", selected: true },
      { value: "music", label: "Music", selected: false },
    ]);

    /*
     * 9. Verify file-input metadata.
     */
    const attachmentInput = persistedInputs.find(
      (input) => input.name === "attachment",
    );

    assert.ok(attachmentInput, "file input should be persisted");
    assert.equal(attachmentInput.multiple, true);
    assert.deepEqual(attachmentInput.accept, [".pdf", "image/*"]);

    /*
     * 10. Ensure actual input values and password values
     * are not stored in the page write.
     */
    const persistedPageText = JSON.stringify(initialWrite.update.$set);

    assert.equal(
      persistedPageText.includes(SECRET_INPUT_VALUE),
      false,
      "user-entered input values must not be persisted",
    );

    assert.equal(
      persistedPageText.includes(SECRET_PASSWORD_VALUE),
      false,
      "password values must not be persisted",
    );

    /*
     * 11. The second write modifies only OpenAPI metadata.
     */
    assert.deepEqual(Object.keys(metadataWrite.update.$set), [
      "openApiEndpoints",
    ]);

    /*
     * 12. Duplicate and malformed endpoints are removed.
     */
    assert.deepEqual(metadataWrite.update.$set.openApiEndpoints, [
      {
        path: "/api/users",
        method: "GET",
      },
      {
        path: "/api/users/{id}",
        method: "DELETE",
      },
    ]);

    /*
     * 13. Page count increments only once.
     */
    assert.equal(countUpdates.length, 1);

    assertSameObjectId(countUpdates[0].filter.ownerId, ownerId);
    assertSameObjectId(countUpdates[0].filter.scanId, scanId);

    assert.deepEqual(countUpdates[0].update.$inc, {
      pagesAttempted: 1,
      pagesSucceeded: 1,
    });

    /*
     * 14. Session starts and finishes once.
     */
    assert.equal(sessionWrites.length, 2);

    assert.equal(sessionWrites[0].update.$set.status, "running");
    assert.equal(sessionWrites[1].update.$set.status, "completed");
  } finally {
    for (const mockedMethod of mocks) {
      mockedMethod.mock.restore();
    }

    if (previousSecret === undefined) {
      delete process.env.CRAWL_PAGE_KEY_SECRET;
    } else {
      process.env.CRAWL_PAGE_KEY_SECRET = previousSecret;
    }
  }
});
