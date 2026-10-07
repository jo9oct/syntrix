const createProgressTracker = ({
  total = 0,
  onProgress = null,
} = {}) => {
  let completed = 0;
  let started = 0;
  let failed = 0;

  const scannerStates = new Map();

  const safeTotal =
    Number.isInteger(total) && total >= 0
      ? total
      : 0;

  const getProgress = () => {
    if (safeTotal === 0) {
      return 0;
    }

    return Math.min(
      Math.round(
        (completed / safeTotal) * 100,
      ),
      100,
    );
  };

  const getState = () => ({
    completed,
    total: safeTotal,
    started,
    failed,
    progress: getProgress(),
    scanners: Object.fromEntries(
      scannerStates.entries(),
    ),
  });

  const notify = () => {
    const state = getState();

    if (typeof onProgress === 'function') {
      onProgress(state);
    }

    return state;
  };

  const start = (scannerId) => {
    if (
      typeof scannerId !== 'string' ||
      scannerId.trim().length === 0
    ) {
      return notify();
    }

    const normalizedScannerId =
      scannerId.trim();

    const currentState =
      scannerStates.get(
        normalizedScannerId,
      );

    if (
      currentState === 'running' ||
      currentState === 'completed' ||
      currentState === 'failed'
    ) {
      return notify();
    }

    scannerStates.set(
      normalizedScannerId,
      'running',
    );

    started += 1;

    return notify();
  };

  const complete = (scannerId) => {
    if (
      typeof scannerId !== 'string' ||
      scannerId.trim().length === 0
    ) {
      return notify();
    }

    const normalizedScannerId =
      scannerId.trim();

    const currentState =
      scannerStates.get(
        normalizedScannerId,
      );

    if (currentState === 'completed') {
      return notify();
    }

    if (currentState === 'failed') {
      return notify();
    }

    scannerStates.set(
      normalizedScannerId,
      'completed',
    );

    completed = Math.min(
      completed + 1,
      safeTotal,
    );

    return notify();
  };

  const fail = (scannerId) => {
    if (
      typeof scannerId !== 'string' ||
      scannerId.trim().length === 0
    ) {
      return notify();
    }

    const normalizedScannerId =
      scannerId.trim();

    const currentState =
      scannerStates.get(
        normalizedScannerId,
      );

    if (
      currentState === 'completed' ||
      currentState === 'failed'
    ) {
      return notify();
    }

    scannerStates.set(
      normalizedScannerId,
      'failed',
    );

    failed += 1;

    completed = Math.min(
      completed + 1,
      safeTotal,
    );

    return notify();
  };

  const increment = (
    amount = 1,
  ) => {
    const safeAmount =
      Number.isInteger(amount) &&
      amount > 0
        ? amount
        : 1;

    completed = Math.min(
      completed + safeAmount,
      safeTotal,
    );

    return notify();
  };

  const setCompleted = (
    value,
  ) => {
    completed = Math.min(
      Math.max(
        Number.isInteger(value)
          ? value
          : 0,
        0,
      ),
      safeTotal,
    );

    return notify();
  };

  const reset = () => {
    completed = 0;
    started = 0;
    failed = 0;
    scannerStates.clear();

    return notify();
  };

  return {
    start,
    complete,
    fail,
    increment,
    setCompleted,
    reset,
    getProgress,
    getState,
  };
};

export {
  createProgressTracker,
};