const sleep = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const createRateLimiter = ({ requestsPerSecond = 2 } = {}) => {
  if (!Number.isFinite(requestsPerSecond) || requestsPerSecond <= 0) {
    throw new TypeError("requestsPerSecond must be greater than zero.");
  }

  const intervalMs = 1000 / requestsPerSecond;

  let nextAvailableAt = Date.now();

  const wait = async () => {
    const now = Date.now();

    const waitMs = Math.max(nextAvailableAt - now, 0);

    nextAvailableAt = Math.max(nextAvailableAt, now) + intervalMs;

    if (waitMs > 0) {
      await sleep(waitMs);
    }
  };

  const acquire = async () => {
    await wait();
  };

  const reset = () => {
    nextAvailableAt = Date.now();
  };

  return {
    wait,
    acquire,
    reset,
  };
};

export { createRateLimiter };
