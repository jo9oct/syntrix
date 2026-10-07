import {
  getResponseSignature,
} from './responseDetector.js';

const compareResponses = (
  baseline,
  candidate,
) => {
  const baselineSignature =
    getResponseSignature(baseline);

  const candidateSignature =
    getResponseSignature(candidate);

  return {
    changed:
      baselineSignature.status !==
        candidateSignature.status ||
      baselineSignature.contentType !==
        candidateSignature.contentType ||
      baselineSignature.contentLength !==
        candidateSignature.contentLength,

    baseline: baselineSignature,
    candidate: candidateSignature,
  };
};

export {
  compareResponses,
};