/*
 * STATUS: CREATED
 * File: src/utils/concurrency.js
 *
 * Concurrent Worker Pool Utility
 * Runs asynchronous tasks with bounded concurrency (default: 10 at a time).
 */

/**
 * Execute an array of items with bounded concurrency (e.g. 10 at a time).
 *
 * @template T, R
 * @param {T[]} items - List of items to process
 * @param {number} [concurrency=10] - Maximum concurrent workers
 * @param {(item: T, index: number) => Promise<R>} workerFn - Async function to process each item
 * @param {AbortSignal} [signal=null] - Optional cancellation signal
 * @returns {Promise<R[]>} - Array of results in the original item order
 */
export const runConcurrent = async (
  items,
  concurrency = 10,
  workerFn,
  signal = null,
) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  if (typeof workerFn !== "function") {
    throw new TypeError("workerFn must be a function.");
  }

  const results = new Array(items.length);
  let nextIndex = 0;
  const maxWorkers = Math.min(Math.max(1, concurrency), items.length);

  const worker = async () => {
    while (nextIndex < items.length) {
      if (signal?.aborted) {
        break;
      }

      const currentIndex = nextIndex;
      nextIndex += 1;

      try {
        results[currentIndex] = await workerFn(
          items[currentIndex],
          currentIndex,
        );
      } catch (error) {
        if (signal?.aborted) {
          break;
        }
        throw error;
      }
    }
  };

  const workers = Array.from({ length: maxWorkers }, () => worker());
  await Promise.all(workers);

  return results;
};

