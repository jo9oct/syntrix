// STATUS: CREATED
// File: test/database/crawlPageInputs.test.js

import test, { mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import CrawlPage from "../../src/database/models/crawlPage.model.js";
import * as crawlPageRepository from "../../src/database/repositories/crawlPage.repository.js";

const ownerId = new mongoose.Types.ObjectId();
const scanId = new mongoose.Types.ObjectId();

const createQuery = (result) => {
  const query = {
    projection: null,
    sortOptions: null,
    skipValue: null,
    limitValue: null,

    select(projection) {
      this.projection = projection;
      return this;
    },

    sort(options) {
      this.sortOptions = options;
      return this;
    },

    skip(value) {
      this.skipValue = value;
      return this;
    },

    limit(value) {
      this.limitValue = value;
      return this;
    },

    lean() {
      return Promise.resolve(result);
    },
  };

  return query;
};

test("listInputsByScan selects input metadata without exposing pageKey", async () => {
  const expectedPages = [
    {
      _id: new mongoose.Types.ObjectId(),
      ownerId,
      scanId,
      url: "https://example.com/search",
      depth: 1,
      forms: [],
      inputs: [
        {
          tag: "input",
          name: "query",
          pattern: "[a-zA-Z]+",
          minlength: 2,
          maxlength: 80,
          readonly: false,
          multiple: false,
          accept: [],
          options: [],
        },
      ],
      queryParameterNames: ["page"],
      apiRequests: [],
      statusCode: 200,
      createdAt: new Date(),
    },
  ];

  const query = createQuery(expectedPages);

  const findMock = mock.method(CrawlPage, "find", (filter) => {
    assert.equal(String(filter.ownerId), String(ownerId));
    assert.equal(String(filter.scanId), String(scanId));

    assert.ok(Array.isArray(filter.$or));
    assert.ok(
      filter.$or.some((condition) => Object.hasOwn(condition, "inputs")),
    );

    return query;
  });

  try {
    const result = await crawlPageRepository.listInputsByScan({
      ownerId: String(ownerId),
      scanId: String(scanId),
      limit: 20,
      skip: 10,
    });

    assert.deepEqual(result, expectedPages);

    assert.deepEqual(query.projection, {
      _id: 1,
      ownerId: 1,
      scanId: 1,
      url: 1,
      depth: 1,
      forms: 1,
      inputs: 1,
      queryParameterNames: 1,
      apiRequests: 1,
      statusCode: 1,
      createdAt: 1,
    });

    assert.equal(Object.hasOwn(query.projection, "pageKey"), false);

    assert.deepEqual(query.sortOptions, {
      depth: 1,
      url: 1,
      _id: 1,
    });

    assert.equal(query.skipValue, 10);
    assert.equal(query.limitValue, 20);
  } finally {
    findMock.mock.restore();
  }
});

test("listInputsByScan rejects missing owner or scan identity", async () => {
  await assert.rejects(
    crawlPageRepository.listInputsByScan({
      ownerId: String(ownerId),
    }),
    {
      name: "TypeError",
      message: "Both ownerId and scanId are required.",
    },
  );

  await assert.rejects(
    crawlPageRepository.listInputsByScan({
      scanId: String(scanId),
    }),
    {
      name: "TypeError",
      message: "Both ownerId and scanId are required.",
    },
  );
});

test("listInputsByScan rejects invalid pagination", async () => {
  await assert.rejects(
    crawlPageRepository.listInputsByScan({
      ownerId: String(ownerId),
      scanId: String(scanId),
      limit: 101,
    }),
    RangeError,
  );

  await assert.rejects(
    crawlPageRepository.listInputsByScan({
      ownerId: String(ownerId),
      scanId: String(scanId),
      skip: -1,
    }),
    RangeError,
  );
});
