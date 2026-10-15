// STATUS: UPDATED
// File: test/database/crawlPageOpenApi.test.js

import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import CrawlPage from "../../src/database/models/crawlPage.model.js";
import * as crawlPageRepository from "../../src/database/repositories/crawlPage.repository.js";

const VALID_PAGE_KEY = "a".repeat(64);

const createPage = (overrides = {}) =>
  new CrawlPage({
    ownerId: new mongoose.Types.ObjectId(),
    scanId: new mongoose.Types.ObjectId(),
    pageKey: VALID_PAGE_KEY,
    url: "https://example.com/",
    depth: 0,
    status: "success",
    ...overrides,
  });

test("crawl page model defines OpenAPI endpoint metadata", () => {
  const path = CrawlPage.schema.path("openApiEndpoints");

  assert.ok(path, "openApiEndpoints should exist");
  assert.equal(path.instance, "Array");
  assert.ok(path.schema, "endpoints should use a subdocument schema");
  assert.ok(path.schema.path("path"));
  assert.ok(path.schema.path("method"));
});

test("OpenAPI endpoint schema accepts valid endpoint metadata", () => {
  const page = createPage({
    openApiEndpoints: [
      {
        path: "/api/users/{id}",
        method: "DELETE",
      },
    ],
  });

  assert.equal(page.validateSync(), undefined);

  assert.deepEqual(
    page.openApiEndpoints.map(({ path, method }) => ({
      path,
      method,
    })),
    [
      {
        path: "/api/users/{id}",
        method: "DELETE",
      },
    ],
  );
});

test("OpenAPI endpoint schema rejects unsupported HTTP methods", () => {
  const page = createPage({
    openApiEndpoints: [
      {
        path: "/api/users",
        method: "INVALID",
      },
    ],
  });

  const error = page.validateSync();

  assert.ok(error, "invalid HTTP methods should fail validation");
  assert.ok(error.errors["openApiEndpoints.0.method"]);
});

test("OpenAPI endpoint schema rejects malformed paths", () => {
  const page = createPage({
    openApiEndpoints: [
      {
        path: "//outside.example/path",
        method: "GET",
      },
    ],
  });

  const error = page.validateSync();

  assert.ok(error, "malformed paths should fail validation");
  assert.ok(error.errors["openApiEndpoints.0.path"]);
});

test("repository exposes a dedicated OpenAPI metadata update method", () => {
  assert.equal(typeof crawlPageRepository.updateOpenApiEndpoints, "function");
});

test("input schema defines the expected metadata fields", () => {
  const inputsPath = CrawlPage.schema.path("inputs");

  assert.ok(inputsPath, "inputs should exist");
  assert.ok(inputsPath.schema, "inputs should use a subdocument schema");

  for (const field of [
    "tag",
    "name",
    "type",
    "pattern",
    "min",
    "max",
    "step",
    "minlength",
    "maxlength",
    "readonly",
    "multiple",
    "accept",
    "options",
  ]) {
    assert.ok(
      inputsPath.schema.path(field),
      `input metadata field "${field}" should exist`,
    );
  }
});

test("input schema accepts validation and control metadata", () => {
  const page = createPage({
    inputs: [
      {
        tag: "input",
        name: "age",
        type: "number",
        min: "18",
        max: "120",
        step: "1",
        required: true,
        readonly: false,
        multiple: false,
        minlength: 1,
        maxlength: 3,
        pattern: "[0-9]+",
        accept: [],
        options: [],
      },
    ],
  });

  assert.equal(page.validateSync(), undefined);

  const input = page.inputs[0];

  assert.equal(input.name, "age");
  assert.equal(input.min, "18");
  assert.equal(input.max, "120");
  assert.equal(input.step, "1");
  assert.equal(input.minlength, 1);
  assert.equal(input.maxlength, 3);
  assert.equal(input.pattern, "[0-9]+");
  assert.equal(input.required, true);
});

test("select options preserve static labels and default selected state", () => {
  const page = createPage({
    inputs: [
      {
        tag: "select",
        name: "country",
        options: [
          {
            value: "et",
            label: "Ethiopia",
            selected: true,
          },
          {
            value: "ke",
            label: "Kenya",
            selected: false,
          },
        ],
      },
    ],
  });

  assert.equal(page.validateSync(), undefined);

  assert.deepEqual(
    page.inputs[0].options.map(({ value, label, selected }) => ({
      value,
      label,
      selected,
    })),
    [
      {
        value: "et",
        label: "Ethiopia",
        selected: true,
      },
      {
        value: "ke",
        label: "Kenya",
        selected: false,
      },
    ],
  );
});

test("input schema rejects more than 100 select options", () => {
  const page = createPage({
    inputs: [
      {
        tag: "select",
        options: Array.from({ length: 101 }, (_, index) => ({
          value: `option-${index}`,
          label: `Option ${index}`,
          selected: false,
        })),
      },
    ],
  });

  const error = page.validateSync();

  assert.ok(error, "excessive select options should fail validation");
  assert.ok(error.errors["inputs.0.options"]);
});

test("input schema rejects more than 32 accept patterns", () => {
  const page = createPage({
    inputs: [
      {
        tag: "input",
        type: "file",
        accept: Array.from({ length: 33 }, (_, index) => `.type${index}`),
      },
    ],
  });

  const error = page.validateSync();

  assert.ok(error, "excessive accept patterns should fail validation");
  assert.ok(error.errors["inputs.0.accept"]);
});

test("input schema rejects negative minlength and maxlength", () => {
  const page = createPage({
    inputs: [
      {
        tag: "input",
        minlength: -1,
        maxlength: -2,
      },
    ],
  });

  const error = page.validateSync();

  assert.ok(error, "negative input lengths should fail validation");
  assert.ok(error.errors["inputs.0.minlength"]);
  assert.ok(error.errors["inputs.0.maxlength"]);
});

test("form inputs accept the same metadata as standalone inputs", () => {
  const page = createPage({
    forms: [
      {
        action: "https://example.com/search",
        method: "GET",
        id: "search-form",
        inputs: [
          {
            tag: "input",
            name: "query",
            type: "search",
            pattern: "[a-zA-Z]+",
            readonly: true,
          },
        ],
      },
    ],
  });

  assert.equal(page.validateSync(), undefined);
  assert.equal(page.forms[0].inputs[0].pattern, "[a-zA-Z]+");
  assert.equal(page.forms[0].inputs[0].readonly, true);
});
