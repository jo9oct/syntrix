/*
 * STATUS: CREATED
 * File: test/scanners/sqli/inputDiscovery.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  discoverQueryInputs,
  discoverFormInputs,
  discoverJsonInputs,
  discoverCookieInputs,
  discoverPathInputs,
  discoverHeaderInputs,
  discoverAllInputs,
} from "../../../src/scanners/sqli/inputDiscovery.js";

test("discoverQueryInputs: extracts query parameters from URL", () => {
  const inputs = discoverQueryInputs(
    "https://example.com/search?category=books&page=1",
  );

  assert.equal(inputs.length, 2);
  assert.equal(inputs[0].source, "query");
  assert.equal(inputs[0].parameter, "category");
  assert.equal(inputs[0].originalValue, "books");

  const req = inputs[0].createRequest("' OR 1=1--");
  assert.equal(req.method, "GET");
  assert.ok(
    req.url.includes("category=%27+OR+1%3D1--") ||
      req.url.includes("category=' OR 1=1--") ||
      req.url.includes("category=%27%20OR%201%3D1--"),
  );
});

test("discoverQueryInputs: provides fallback query parameters if URL has none", () => {
  const inputs = discoverQueryInputs("https://example.com/items");

  assert.ok(inputs.length >= 2);
  assert.ok(inputs.some((i) => i.parameter === "id"));
  assert.ok(inputs.some((i) => i.parameter === "q"));
});

test("discoverFormInputs: parses HTML form inputs and builds form-encoded POST requests", () => {
  const html = `
    <html>
      <body>
        <form action="/login" method="POST">
          <input name="username" type="text" value="admin" />
          <input name="password" type="password" value="secret" />
          <button type="submit">Log In</button>
        </form>
      </body>
    </html>
  `;

  const inputs = discoverFormInputs("https://example.com/login", html);

  assert.ok(inputs.length >= 2);
  const usernameInput = inputs.find((i) => i.parameter === "username");
  assert.ok(usernameInput);
  assert.equal(usernameInput.source, "form");
  assert.equal(usernameInput.method, "POST");

  const req = usernameInput.createRequest("admin'--");
  assert.equal(req.method, "POST");
  assert.equal(
    req.headers["content-type"],
    "application/x-www-form-urlencoded",
  );
  assert.ok(req.body.includes("username=admin%27--"));
  assert.ok(req.body.includes("password=secret"));
});

test("discoverFormInputs: handles GET forms", () => {
  const html = `
    <form action="/search" method="GET">
      <input name="q" type="text" value="shoes" />
    </form>
  `;

  const inputs = discoverFormInputs("https://example.com/search", html);
  assert.equal(inputs.length, 1);
  assert.equal(inputs[0].method, "GET");

  const req = inputs[0].createRequest("test'--");
  assert.equal(req.method, "GET");
  assert.ok(req.url.includes("q=test%27--") || req.url.includes("q=test'--"));
});

test("discoverFormInputs: falls back for login endpoint without HTML form", () => {
  const inputs = discoverFormInputs("https://example.com/api/login", "");

  assert.ok(inputs.length >= 1);
  assert.equal(inputs[0].parameter, "username");
  assert.equal(inputs[0].source, "form");
});

test("discoverJsonInputs: detects API endpoint and extracts parameters from JSON response body", () => {
  const targetUrl = "https://example.com/api/v1/user";
  const response = {
    headers: { "content-type": "application/json" },
    data: { id: "101", username: "alice", role: "user" },
  };

  const inputs = discoverJsonInputs(targetUrl, response);

  assert.ok(inputs.length >= 2);
  const idInput = inputs.find((i) => i.parameter === "id");
  assert.ok(idInput);
  assert.equal(idInput.source, "json");
  assert.equal(idInput.method, "POST");

  const req = idInput.createRequest("101' OR '1'='1");
  assert.equal(req.method, "POST");
  assert.equal(req.headers["content-type"], "application/json");

  const parsedBody = JSON.parse(req.body);
  assert.equal(parsedBody.id, "101' OR '1'='1");
  assert.equal(parsedBody.username, "alice");
});

test("discoverCookieInputs: extracts cookies from Set-Cookie and request headers", () => {
  const targetUrl = "https://example.com/dashboard";
  const response = {
    headers: { "set-cookie": "session_id=abc12345; Path=/; HttpOnly" },
  };
  const requestHeaders = {
    cookie: "tracking_id=track987",
  };

  const inputs = discoverCookieInputs(targetUrl, response, requestHeaders);

  assert.ok(inputs.length >= 2);
  const sessionInput = inputs.find((i) => i.parameter === "session_id");
  assert.ok(sessionInput);
  assert.equal(sessionInput.source, "cookie");

  const req = sessionInput.createRequest("abc' OR 1=1--");
  assert.equal(req.method, "GET");
  assert.ok(req.headers.cookie.includes("session_id=abc' OR 1=1--"));
  assert.ok(req.headers.cookie.includes("tracking_id=track987"));
});

test("discoverPathInputs: identifies numeric ID and UUID in path", () => {
  const numericInputs = discoverPathInputs("https://example.com/api/users/42");
  assert.equal(numericInputs.length, 1);
  assert.equal(numericInputs[0].source, "path");
  assert.equal(numericInputs[0].originalValue, "42");

  const numericReq = numericInputs[0].createRequest("42'--");
  assert.ok(
    numericReq.url.includes("/api/users/42%27--") ||
      numericReq.url.includes("/api/users/42'--"),
  );

  const uuidInputs = discoverPathInputs(
    "https://example.com/orders/550e8400-e29b-41d4-a716-446655440000",
  );
  assert.equal(uuidInputs.length, 1);
  assert.equal(uuidInputs[0].source, "path");
  assert.equal(
    uuidInputs[0].originalValue,
    "550e8400-e29b-41d4-a716-446655440000",
  );
});

test("discoverHeaderInputs: creates User-Agent and X-Forwarded-For injection inputs", () => {
  const inputs = discoverHeaderInputs("https://example.com/profile");

  assert.equal(inputs.length, 2);
  const ua = inputs.find((i) => i.parameter === "User-Agent");
  const xff = inputs.find((i) => i.parameter === "X-Forwarded-For");

  assert.ok(ua);
  assert.ok(xff);
  assert.equal(ua.source, "header");
  assert.equal(xff.source, "header");

  const uaReq = ua.createRequest("Mozilla/5.0 ' OR 1=1--");
  assert.equal(uaReq.headers["User-Agent"], "Mozilla/5.0 ' OR 1=1--");
});

test("discoverAllInputs: aggregates inputs across all 6 sources and respects bounding", () => {
  const targetUrl = "https://example.com/api/products/42?category=shoes";
  const baselineResponse = {
    headers: {
      "content-type": "application/json",
      "set-cookie": "session_id=sid123",
    },
    data: {
      id: "42",
      name: "Sneakers",
    },
  };

  const inputs = discoverAllInputs({
    targetUrl,
    baselineResponse,
    requestHeaders: { cookie: "pref=dark" },
  });

  const sources = new Set(inputs.map((i) => i.source));

  assert.ok(sources.has("query"));
  assert.ok(sources.has("json"));
  assert.ok(sources.has("cookie"));
  assert.ok(sources.has("path"));
  assert.ok(sources.has("header"));
  assert.ok(inputs.length <= 10);
});
