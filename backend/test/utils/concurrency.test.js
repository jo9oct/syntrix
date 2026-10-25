/*
 * STATUS: CREATED
 * File: test/utils/concurrency.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";
import { runConcurrent } from "../../src/utils/concurrency.js";

test("runConcurrent processes items in order and never exceeds concurrency limit", async () => {
  const items = Array.from({ length: 30 }, (_, i) => i);
  let activeWorkers = 0;
  let maxObservedActive = 0;

  const results = await runConcurrent(items, 10, async (item) => {
    activeWorkers += 1;
    maxObservedActive = Math.max(maxObservedActive, activeWorkers);

    // Simulate async network request
    await new Promise((resolve) => setTimeout(resolve, 15));

    activeWorkers -= 1;
    return item * 2;
  });

  assert.equal(results.length, 30);
  assert.deepEqual(
    results,
    items.map((i) => i * 2),
  );
  assert.ok(maxObservedActive <= 10, `Observed ${maxObservedActive} > 10`);
  assert.ok(
    maxObservedActive >= 2,
    `Observed only ${maxObservedActive} active workers`,
  );
});

test("runConcurrent handles empty array gracefully", async () => {
  const results = await runConcurrent([], 10, async (x) => x);
  assert.deepEqual(results, []);
});

test("runConcurrent handles abort signal", async () => {
  const items = Array.from({ length: 50 }, (_, i) => i);
  const controller = new AbortController();
  let processed = 0;

  const promise = runConcurrent(
    items,
    10,
    async (item) => {
      processed += 1;
      if (item === 12) {
        controller.abort();
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
      return item;
    },
    controller.signal,
  );

  await promise;
  assert.ok(processed < 50, `Expected early abort, but processed ${processed}`);
});
