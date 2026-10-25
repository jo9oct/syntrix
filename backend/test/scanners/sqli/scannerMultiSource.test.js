/*
 * STATUS: CREATED
 * File: test/scanners/sqli/scannerMultiSource.test.js
 */

process.env.NODE_ENV ??= "test";
process.env.MONGODB_URI ??= "mongodb://localhost:27017/test";
process.env.REDIS_URL ??= "redis://localhost:6379";

import test from "node:test";
import assert from "node:assert/strict";

const { default: scanner } =
  await import("../../../src/scanners/sqli/scanner.js");

// Use public IP to satisfy assertSafeUrl SSRF check without DNS lookup dependencies
const BASE_TARGET = "https://93.184.216.34";

test("SQLi Scanner: detects error-based SQLi in URL query parameter and identifies inputSource", async () => {
  const targetUrl = `${BASE_TARGET}/search?item=widget`;

  const requestClient = async (options) => {
    const urlStr = options.url || "";
    if (urlStr.includes("item=%27") || urlStr.includes("item='")) {
      return {
        status: 500,
        data: 'pg_query(): Query failed: ERROR: syntax error at or near "\'"',
        headers: { "content-type": "text/html" },
      };
    }

    return {
      status: 200,
      data: "<html><body>Search Results: 10 items found</body></html>",
      headers: { "content-type": "text/html" },
    };
  };

  const result = await scanner.run({
    targetUrl,
    requestClient,
  });

  assert.ok(result.findings.length >= 1);
  const queryFinding = result.findings.find(
    (f) =>
      f.metadata?.inputSource === "query" && f.metadata?.parameter === "item",
  );
  assert.ok(queryFinding, "Expected a finding for query parameter 'item'");
  assert.equal(queryFinding.metadata.technique, "error-based");
  assert.ok(queryFinding.title.includes("QUERY"));

  const queryEvidence = result.evidence.find(
    (e) =>
      (e.inputSource === "query" || e.metadata?.inputSource === "query") &&
      (e.parameter === "item" || e.metadata?.parameter === "item"),
  );
  assert.ok(
    queryEvidence,
    "Expected evidence identifying inputSource as query",
  );
  assert.equal(queryEvidence.metadata.inputSource, "query");
  assert.ok(result.data.testedInputSources.includes("query"));
});

test("SQLi Scanner: detects boolean-based SQLi in HTML form fields", async () => {
  const targetUrl = `${BASE_TARGET}/login`;

  const requestClient = async (options) => {
    // Initial baseline returns HTML form
    if (options.method === "GET" && options.url === targetUrl) {
      return {
        status: 200,
        data: `
          <html>
            <body>
              <form action="/login" method="POST">
                <input name="username" value="guest" />
                <input name="password" value="pass123" />
                <button type="submit">Login</button>
              </form>
            </body>
          </html>
        `,
        headers: { "content-type": "text/html" },
      };
    }

    // POST form requests
    if (options.method === "POST") {
      const bodyStr = String(options.body || options.data || "");

      // True payload produces standard authenticated welcome page
      if (
        bodyStr.includes("1%27%3D%271") ||
        bodyStr.includes("1'='1") ||
        bodyStr.includes("1=1") ||
        bodyStr.includes("1%3D1")
      ) {
        return {
          status: 200,
          data: "<html><body>Welcome back, Authorized User! Your account is active. Full dashboard view with lots of profile data.</body></html>",
          headers: { "content-type": "text/html" },
        };
      }

      // False payload or baseline POST produces failed login message
      return {
        status: 200,
        data: "<html><body>Invalid credentials. Please try again.</body></html>",
        headers: { "content-type": "text/html" },
      };
    }

    return {
      status: 200,
      data: "<html><body>Login page</body></html>",
      headers: { "content-type": "text/html" },
    };
  };

  const result = await scanner.run({
    targetUrl,
    requestClient,
  });

  const formFinding = result.findings.find(
    (f) =>
      f.metadata?.inputSource === "form" &&
      f.metadata?.parameter === "username",
  );
  assert.ok(formFinding, "Expected finding on form input 'username'");
  assert.equal(formFinding.metadata.technique, "boolean-based");
  assert.ok(result.data.testedInputSources.includes("form"));

  const formEvidence = result.evidence.find(
    (e) =>
      (e.inputSource === "form" || e.metadata?.inputSource === "form") &&
      (e.parameter === "username" || e.metadata?.parameter === "username"),
  );
  assert.ok(formEvidence, "Expected form evidence");
  assert.equal(formEvidence.request.method, "POST");
});

test("SQLi Scanner: detects error-based SQLi in JSON request body", async () => {
  const targetUrl = `${BASE_TARGET}/api/v1/profile`;

  const requestClient = async (options) => {
    // Initial baseline request
    if (options.method === "GET") {
      return {
        status: 200,
        data: { id: "100", query: "user_info" },
        headers: { "content-type": "application/json" },
      };
    }

    if (options.method === "POST") {
      let body = options.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }

      if (
        body?.id &&
        (String(body.id).includes("'") || String(body.id).includes('"'))
      ) {
        return {
          status: 500,
          data: JSON.stringify({
            error: "ORA-00933: SQL command not properly ended",
          }),
          headers: { "content-type": "application/json" },
        };
      }

      return {
        status: 200,
        data: JSON.stringify({
          id: body?.id || "100",
          query: body?.query || "user_info",
        }),
        headers: { "content-type": "application/json" },
      };
    }

    return {
      status: 200,
      data: JSON.stringify({ status: "ok" }),
      headers: { "content-type": "application/json" },
    };
  };

  const result = await scanner.run({
    targetUrl,
    requestClient,
  });

  const jsonFinding = result.findings.find(
    (f) => f.metadata?.inputSource === "json" && f.metadata?.parameter === "id",
  );
  assert.ok(jsonFinding, "Expected finding on JSON parameter 'id'");
  assert.equal(jsonFinding.metadata.technique, "error-based");
  assert.ok(result.data.testedInputSources.includes("json"));

  const jsonEvidence = result.evidence.find(
    (e) =>
      (e.inputSource === "json" || e.metadata?.inputSource === "json") &&
      (e.parameter === "id" || e.metadata?.parameter === "id"),
  );
  assert.ok(jsonEvidence);
  assert.equal(jsonEvidence.request.method, "POST");
});

test("SQLi Scanner: detects union-based SQLi in Cookies", async () => {
  const targetUrl = `${BASE_TARGET}/account`;

  const requestClient = async (options) => {
    if (!options.headers?.cookie) {
      return {
        status: 200,
        data: "<html><body>Welcome to your account</body></html>",
        headers: {
          "content-type": "text/html",
          "set-cookie": "session_id=sess_valid_123; Path=/",
        },
      };
    }

    const cookieHeader = options.headers.cookie || "";
    if (cookieHeader.includes("jo_sqli_union_probe_7f3a")) {
      return {
        status: 200,
        data: "<html><body>Data returned: jo_sqli_union_probe_7f3a for session</body></html>",
        headers: { "content-type": "text/html" },
      };
    }

    return {
      status: 200,
      data: "<html><body>Welcome to your account</body></html>",
      headers: { "content-type": "text/html" },
    };
  };

  const result = await scanner.run({
    targetUrl,
    requestClient,
  });

  const cookieFinding = result.findings.find(
    (f) =>
      f.metadata?.inputSource === "cookie" &&
      f.metadata?.parameter === "session_id",
  );
  assert.ok(
    cookieFinding,
    "Expected finding for cookie parameter 'session_id'",
  );
  assert.equal(cookieFinding.metadata.technique, "union-based");
  assert.ok(result.data.testedInputSources.includes("cookie"));

  const cookieEvidence = result.evidence.find(
    (e) =>
      (e.inputSource === "cookie" || e.metadata?.inputSource === "cookie") &&
      (e.parameter === "session_id" || e.metadata?.parameter === "session_id"),
  );
  assert.ok(cookieEvidence);
  assert.equal(cookieEvidence.metadata.inputSource, "cookie");
  assert.equal(cookieEvidence.metadata.parameter, "session_id");
  assert.equal(cookieEvidence.request.headers.cookie, "[REDACTED]");
});

test("SQLi Scanner: detects error-based SQLi in URL path parameters", async () => {
  const targetUrl = `${BASE_TARGET}/api/users/999`;

  const requestClient = async (options) => {
    const urlStr = options.url || "";
    if (urlStr.includes("/users/999%27") || urlStr.includes("/users/999'")) {
      return {
        status: 500,
        data: "You have an error in your SQL syntax near ''' at line 1",
        headers: { "content-type": "text/html" },
      };
    }

    return {
      status: 200,
      data: JSON.stringify({ userId: 999, name: "Test User" }),
      headers: { "content-type": "application/json" },
    };
  };

  const result = await scanner.run({
    targetUrl,
    requestClient,
  });

  const pathFinding = result.findings.find(
    (f) => f.metadata?.inputSource === "path",
  );
  assert.ok(pathFinding, "Expected finding on URL path parameter");
  assert.equal(pathFinding.metadata.technique, "error-based");
  assert.ok(result.data.testedInputSources.includes("path"));

  const pathEvidence = result.evidence.find(
    (e) => e.inputSource === "path" || e.metadata?.inputSource === "path",
  );
  assert.ok(pathEvidence);
  assert.equal(pathEvidence.metadata.inputSource, "path");
});

test("SQLi Scanner: detects error-based SQLi in HTTP headers (User-Agent)", async () => {
  const targetUrl = `${BASE_TARGET}/analytics`;

  const requestClient = async (options) => {
    const userAgent = options.headers?.["User-Agent"] || "";
    if (userAgent.includes("'") || userAgent.includes('"')) {
      return {
        status: 500,
        data: "Microsoft SQL Server: Syntax error at or near ''' in log_visitor.",
        headers: { "content-type": "text/html" },
      };
    }

    return {
      status: 200,
      data: "<html><body>Visitor Analytics Logged</body></html>",
      headers: { "content-type": "text/html" },
    };
  };

  const result = await scanner.run({
    targetUrl,
    requestClient,
  });

  const headerFinding = result.findings.find(
    (f) =>
      f.metadata?.inputSource === "header" &&
      f.metadata?.parameter === "User-Agent",
  );
  assert.ok(headerFinding, "Expected finding for User-Agent header injection");
  assert.equal(headerFinding.metadata.technique, "error-based");
  assert.ok(result.data.testedInputSources.includes("header"));

  const headerEvidence = result.evidence.find(
    (e) =>
      (e.inputSource === "header" || e.metadata?.inputSource === "header") &&
      (e.parameter === "User-Agent" || e.metadata?.parameter === "User-Agent"),
  );
  assert.ok(headerEvidence);
  assert.equal(headerEvidence.parameter, "User-Agent");
});

test("SQLi Scanner: enforces request limits and respects cancellation", async () => {
  const targetUrl = `${BASE_TARGET}/page?id=1`;
  const controller = new AbortController();

  let calls = 0;
  const requestClient = async () => {
    calls++;
    if (calls >= 3) {
      controller.abort();
    }
    return {
      status: 200,
      data: "<html><body>Standard page</body></html>",
      headers: { "content-type": "text/html" },
    };
  };

  const result = await scanner.run({
    targetUrl,
    signal: controller.signal,
    requestClient,
  });

  assert.equal(result.metadata.cancelled, true);
  assert.ok(calls <= 5);
});
