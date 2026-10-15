import test from "node:test";
import assert from "node:assert/strict";

import {
  discoverPageInputs,
  mergeDiscoveryResults,
} from "../../src/discovery/inputDiscovery.js";

const pageUrl = "https://example.com/search?page=2&category=books";

test("discovers HTML form controls and basic metadata", () => {
  const result = discoverPageInputs({
    pageUrl,
    html: `
      <form id="search-form" action="/search" method="post">
        <label for="keyword">Keyword</label>
        <input id="keyword" name="q" type="search"
          placeholder="Search here" required autocomplete="off">
        <textarea name="description" aria-label="Description"></textarea>
        <button type="submit" name="submitAction">Search</button>
      </form>
    `,
  });

  assert.equal(result.forms.length, 1);
  assert.equal(result.forms[0].id, "search-form");
  assert.equal(result.forms[0].action, "https://example.com/search");
  assert.equal(result.forms[0].method, "POST");

  const keyword = result.inputs.find((item) => item.name === "q");
  assert.ok(keyword);
  assert.equal(keyword.tag, "input");
  assert.equal(keyword.type, "search");
  assert.equal(keyword.id, "keyword");
  assert.equal(keyword.label, "Keyword");
  assert.equal(keyword.placeholder, "Search here");
  assert.equal(keyword.required, true);
  assert.equal(keyword.autocomplete, "off");

  const description = result.inputs.find((item) => item.name === "description");
  assert.equal(description.ariaLabel, "Description");
});

test("discovers external controls associated through the form attribute", () => {
  const result = discoverPageInputs({
    pageUrl,
    html: `
      <form id="login-form" action="/login">
        <input name="username">
      </form>
      <input form="login-form" name="externalField" type="email">
    `,
  });

  const form = result.forms.find((item) => item.id === "login-form");

  assert.ok(form);
  assert.ok(form.inputs.some((item) => item.name === "username"));
  assert.ok(form.inputs.some((item) => item.name === "externalField"));
  assert.ok(result.inputs.some((item) => item.name === "externalField"));
});

test("discovers validation attributes and input constraints", () => {
  const result = discoverPageInputs({
    pageUrl,
    html: `
      <form>
        <input name="email" type="email" required
          pattern=".+@example\\.com" minlength="5" maxlength="80">
        <input name="age" type="number" min="18" max="120" step="1">
        <input name="upload" type="file" accept=".pdf,.txt" multiple>
        <input name="readonlyField" readonly>
        <input name="disabledField" disabled>
      </form>
    `,
  });

  const byName = Object.fromEntries(
    result.inputs.map((item) => [item.name, item]),
  );

  assert.equal(byName.email.pattern, ".+@example\\.com");
  assert.equal(byName.email.minlength, 5);
  assert.equal(byName.email.maxlength, 80);

  assert.equal(byName.age.min, "18");
  assert.equal(byName.age.max, "120");
  assert.equal(byName.age.step, "1");

  assert.equal(byName.upload.type, "file");
  assert.deepEqual(byName.upload.accept, [".pdf", ".txt"]);
  assert.equal(byName.upload.multiple, true);

  assert.equal(byName.readonlyField.readonly, true);
  assert.equal(byName.disabledField.disabled, true);
});

test("discovers select options and selected values", () => {
  const result = discoverPageInputs({
    pageUrl,
    html: `
      <form>
        <select name="category" required>
          <option value="">Choose one</option>
          <option value="books" selected>Books</option>
          <option value="music">Music</option>
        </select>
        <select name="tags" multiple>
          <option value="new" selected>New</option>
          <option value="popular">Popular</option>
        </select>
      </form>
    `,
  });

  const category = result.inputs.find((item) => item.name === "category");
  const tags = result.inputs.find((item) => item.name === "tags");

  assert.deepEqual(category.options, [
    { value: "", label: "Choose one", selected: false },
    { value: "books", label: "Books", selected: true },
    { value: "music", label: "Music", selected: false },
  ]);
  assert.equal(category.required, true);
  assert.equal(category.multiple, false);
  assert.equal(tags.multiple, true);
  assert.deepEqual(
    tags.options
      .filter((option) => option.selected)
      .map((option) => option.value),
    ["new"],
  );
});

test("collects query parameter names without exposing their values", () => {
  const result = discoverPageInputs({
    pageUrl:
      "https://example.com/search?q=private-value&page=3&q=another-value",
    html: "<p>Search results</p>",
  });

  assert.deepEqual(result.queryParameterNames, ["q", "page"]);
  assert.equal(JSON.stringify(result).includes("private-value"), false);
  assert.equal(JSON.stringify(result).includes("another-value"), false);
});

test("does not discover cross-origin links or form actions", () => {
  const result = discoverPageInputs({
    pageUrl,
    html: `
      <form id="safe" action="/submit">
        <input name="safeField">
      </form>
      <form id="unsafe" action="https://evil.example/collect">
        <input name="unsafeField">
      </form>
      <a href="/results?page=4">Results</a>
      <a href="https://evil.example/collect">External</a>
    `,
  });

  assert.ok(result.forms.some((form) => form.id === "safe"));
  assert.ok(!result.forms.some((form) => form.id === "unsafe"));
  assert.ok(
    result.discoveredLinks.every(
      (link) => new URL(link).origin === new URL(pageUrl).origin,
    ),
  );
});

test("deduplicates repeated inputs and query parameter names", () => {
  const result = discoverPageInputs({
    pageUrl: "https://example.com/items?id=1&id=2",
    html: `
      <form>
        <input name="item">
        <input name="item">
      </form>
    `,
  });

  assert.equal(result.inputs.filter((item) => item.name === "item").length, 1);
  assert.deepEqual(result.queryParameterNames, ["id"]);
});

test("merges static and dynamic discoveries without duplicate inputs", () => {
  const staticDiscovery = {
    pageUrl,
    inputs: [{ tag: "input", name: "email", type: "email" }],
    forms: [],
    discoveredLinks: [],
    queryParameterNames: ["page"],
    apiRequests: [],
  };

  const dynamicDiscovery = {
    pageUrl,
    inputs: [
      { tag: "input", name: "email", type: "email" },
      { tag: "input", name: "token", type: "hidden" },
    ],
    forms: [],
    discoveredLinks: [],
    queryParameterNames: ["page", "filter"],
    apiRequests: [],
  };

  const result = mergeDiscoveryResults(staticDiscovery, dynamicDiscovery);

  assert.equal(result.inputs.filter((item) => item.name === "email").length, 1);
  assert.ok(result.inputs.some((item) => item.name === "token"));
  assert.deepEqual(result.queryParameterNames, ["page", "filter"]);
});

test("handles missing or invalid input safely", () => {
  const empty = discoverPageInputs();
  assert.deepEqual(empty.forms, []);
  assert.deepEqual(empty.inputs, []);
  assert.deepEqual(empty.queryParameterNames, []);
  assert.deepEqual(empty.discoveredLinks, []);
  assert.deepEqual(empty.apiRequests, []);
});
