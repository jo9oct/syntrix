// STATUS: UPDATED

import {
  analyzeFinding,
} from './findingAnalyzer.js';

const analyzeScanFindings = async ({
  findings = [],
  evidence = [],
  target = null,
}) => {
  if (
    !Array.isArray(findings) ||
    findings.length === 0
  ) {
    return {
      enabled: false,
      status: 'no_findings',
      analyses: [],
    };
  }

  const results = [];

  for (
    const finding
    of findings
  ) {
    const findingEvidence =
      Array.isArray(evidence)
        ? evidence.filter(
            (item) =>
              item?.findingId &&
              finding?._id &&
              String(
                item.findingId,
              ) ===
                String(
                  finding._id,
                ),
          )
        : [];

    const result =
      await analyzeFinding({
        finding,
        evidence:
          findingEvidence,
        target,
      });

    results.push({
      findingId:
        finding?._id ??
        null,

      fingerprint:
        finding?.fingerprint ??
        null,

      ...result,
    });
  }

  const hasCompleted =
    results.some(
      (result) =>
        result.status ===
        'completed',
    );

  const hasFailed =
    results.some(
      (result) =>
        result.status ===
        'failed',
    );

  const hasEnabled =
    results.some(
      (result) =>
        result.enabled === true,
    );

  let status =
    'disabled';

  if (hasCompleted) {
    status =
      'completed';
  } else if (hasFailed) {
    status =
      'failed';
  } else if (!hasEnabled) {
    status =
      'disabled';
  }

  return {
    enabled:
      hasEnabled,

    status,

    analyses:
      results,
  };
};

export {
  analyzeScanFindings,
};