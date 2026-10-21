
import test from "node:test";
import assert from "node:assert/strict";

import {
  getSqlErrorSignature,
  identifyDatabaseFamily,
  isMeaningfulBooleanDifference,
  normalizeBody,
  normalizeComparableBody,
  summarizeResponse,
} from "../../../src/scanners/sqli/helpers.js";

test("normalizes string response bodies", () => {
  assert.equal(normalizeBody("hello world"), "hello world");
});

test("normalizes object response bodies", () => {
  assert.equal(
    normalizeBody({ message: "hello" }),
    '{"message":"hello"}',
  );
});

test("normalizes whitespace for comparison", () => {
  assert.equal(
    normalizeComparableBody("  hello\n\tworld  "),
    "hello world",
  );
});

test("normalizes changing timestamps", () => {
  const first = normalizeComparableBody(
    "Welcome. Time: 2026-10-19T10:00:00Z",
  );
  const second = normalizeComparableBody(
    "Welcome. Time: 2026-10-19T10:00:01Z",
  );

  assert.equal(first, second);
});

test("returns no SQL error signature for ordinary content", () => {
  assert.equal(
    getSqlErrorSignature("<html><body>Welcome</body></html>"),
    null,
  );
});

test("recognizes a PostgreSQL-style syntax error", () => {
  assert.notEqual(
    getSqlErrorSignature(
      'ERROR: syntax error at or near "SELECT"',
    ),
    null,
  );
});

test("identifies a tentative PostgreSQL family hint", () => {
  assert.equal(
    identifyDatabaseFamily(
      'ERROR: syntax error at or near "SELECT"',
    ),
    "postgresql",
  );
});

test("does not identify a database from ordinary content", () => {
  assert.equal(
    identifyDatabaseFamily("Welcome to the store"),
    null,
  );
});

test("does not guess when database fingerprints are ambiguous", () => {
  assert.equal(
    identifyDatabaseFamily(
      "ORA-12345: Oracle error. SQLite error.",
    ),
    null,
  );
});

test("summarizes response status, body, and duration", () => {
  assert.deepEqual(
    summarizeResponse({
      status: 200,
      data: "Welcome",
      durationMs: 25,
    }),
    {
      status: 200,
      body: "Welcome",
      durationMs: 25,
    },
  );
});

test("does not flag identical Boolean responses", () => {
  const baseline = {
    status: 200,
    data: "<html><body>Welcome to the store</body></html>",
  };

  assert.equal(
    isMeaningfulBooleanDifference(
      baseline,
      { ...baseline },
      { ...baseline },
    ),
    false,
  );
});

test("does not flag empty Boolean response bodies", () => {
  assert.equal(
    isMeaningfulBooleanDifference(
      { status: 200, data: "" },
      { status: 200, data: "" },
      { status: 200, data: "A different response body" },
    ),
    false,
  );
});

test("does not treat two error responses as a Boolean differential", () => {
  assert.equal(
    isMeaningfulBooleanDifference(
      { status: 500, data: "Internal server error" },
      { status: 500, data: "Database error A" },
      { status: 500, data: "Database error B" },
    ),
    false,
  );
});

test("does not automatically flag unrelated status changes", () => {
  assert.equal(
    isMeaningfulBooleanDifference(
      {
        status: 200,
        data: "Baseline page content that is long enough",
      },
      { status: 302, data: "Redirected page content" },
      { status: 404, data: "Missing page content" },
    ),
    false,
  );
});

test("does not flag small dynamic numeric changes", () => {
  const baseline = {
    status: 200,
    data: "<html><body>Welcome to the store. Request ID: 12345</body></html>",
  };

  const trueResponse = {
    status: 200,
    data: "<html><body>Welcome to the store. Request ID: 12346</body></html>",
  };

  const falseResponse = {
    status: 200,
    data: "<html><body>Welcome to the store. Request ID: 12347</body></html>",
  };

  assert.equal(
    isMeaningfulBooleanDifference(
      baseline,
      trueResponse,
      falseResponse,
    ),
    false,
  );
});

test("detects a clear Boolean response difference against baseline", () => {
  const baseline = {
    status: 200,
    data: "<html><body>Welcome to the store. Products available.</body></html>",
  };

  const trueResponse = { ...baseline };

  const falseResponse = {
    status: 200,
    data: "<html><body>No products found.</body></html>",
  };

  assert.equal(
    isMeaningfulBooleanDifference(
      baseline,
      trueResponse,
      falseResponse,
    ),
    true,
  );
});
