// STATUS: CREATED
// File: backend/test/scanners/fileUpload/scanner.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { evaluateFileTypeValidation } from "../../../src/scanners/fileUpload/fileTypeChecks.js";
import { evaluateFilenameHandling } from "../../../src/scanners/fileUpload/filenameChecks.js";
import { evaluateUploadRestrictions } from "../../../src/scanners/fileUpload/restrictionChecks.js";

test("fileUpload - fileTypeChecks flags file inputs without accept", () => {
  const inputs = ['<input type="file" name="avatar">'];
  const res = evaluateFileTypeValidation(inputs);
  assert.equal(res.unrestricted.length, 1);
  assert.equal(res.findings.length, 1);
  assert.equal(
    res.findings[0].title,
    "File Upload Input Without Client-Side Type Restriction",
  );
});

test("fileUpload - filenameChecks flags missing multipart/form-data", () => {
  const html =
    '<form action="/upload" method="post"><input type="file" name="doc"></form>';
  const res = evaluateFilenameHandling(html);
  assert.equal(res.findings.length, 1);
  assert.ok(res.findings[0].title.includes("multipart/form-data"));
});

test("fileUpload - restrictionChecks flags GET method for upload form", () => {
  const html =
    '<form action="/upload" method="get"><input type="file" name="doc"></form>';
  const res = evaluateUploadRestrictions(html);
  assert.equal(res.findings.length, 1);
  assert.ok(res.findings[0].title.includes("HTTP GET"));
});
