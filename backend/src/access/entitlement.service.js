// STATUS: UPDATED

import {
  getPlan,
  getPlanName,
} from './plan.service.js';

const hasReportFormatAccess = (
  format,
  planName,
) => {
  const plan = getPlan(planName);

  return plan.allowedReportFormats.includes(
    format,
  );
};

const getScannerEntitlements = (
  planName,
) => {
  const plan = getPlan(planName);

  return {
    canRunReconScans: true,

    canRunSecurityScans: true,

    maxScannersPerScan:
      plan.maxScannersPerScan,

    maxConcurrentScans:
      plan.maxConcurrentScans,

    maxCrawlPaths:
      plan.maxCrawlPaths,

    maxCrawlDepth:
      plan.maxCrawlDepth,

    authenticationScanning:
      plan.authenticationScanning,
  };
};

const getAIEntitlements = (
  planName,
) => {
  const plan = getPlan(planName);

  return {
    analysis:
      plan.ai.analysis,

    recommendations:
      plan.ai.recommendations,

    remediation:
      plan.ai.remediation,
  };
};

const getIntegrationEntitlements = (
  planName,
) => {
  const plan = getPlan(planName);

  return {
    github:
      plan.integrations.github,

    companyRules:
      plan.integrations.companyRules,
  };
};

const getEntitlements = (
  planName,
) => {
  const plan = getPlan(planName);

  return {
    plan: getPlanName(planName),

    scanning: {
      canScan: true,

      canRunReconScans: true,

      canRunSecurityScans: true,

      maxScannersPerScan:
        plan.maxScannersPerScan,

      maxConcurrentScans:
        plan.maxConcurrentScans,

      maxCrawlPaths:
        plan.maxCrawlPaths,

      maxCrawlDepth:
        plan.maxCrawlDepth,

      authenticationScanning:
        plan.authenticationScanning,
    },

    reports: {
      maxReportsPerScan:
        plan.maxReportsPerScan,

      allowedFormats: [
        ...plan.allowedReportFormats,
      ],
    },

    ai: {
      analysis:
        plan.ai.analysis,

      recommendations:
        plan.ai.recommendations,

      remediation:
        plan.ai.remediation,
    },

    integrations: {
      github:
        plan.integrations.github,

      companyRules:
        plan.integrations.companyRules,
    },

    rateLimit: {
      requestsPerSecond:
        plan.requestRateLimit,
    },
  };
};

const assertReportFormatAccess = (
  format,
  planName,
) => {
  if (
    typeof format !== 'string' ||
    !hasReportFormatAccess(
      format,
      planName,
    )
  ) {
    const error = new Error(
      'The selected report format is not available for this plan.',
    );

    error.statusCode = 403;
    error.code =
      'REPORT_FORMAT_NOT_ALLOWED';

    throw error;
  }

  return true;
};

const assertScanningAccess = (
  planName,
) => {
  const plan = getPlan(planName);

  if (
    plan.maxConcurrentScans !== null &&
    plan.maxConcurrentScans <= 0
  ) {
    const error = new Error(
      'Scanning is not available for this plan.',
    );

    error.statusCode = 403;
    error.code =
      'SCANNING_NOT_ALLOWED';

    throw error;
  }

  return true;
};

const assertAuthenticationScanningAccess = (
  planName,
) => {
  const plan = getPlan(planName);

  if (!plan.authenticationScanning) {
    const error = new Error(
      'Authentication scanning is not available for this plan.',
    );

    error.statusCode = 403;
    error.code =
      'AUTHENTICATION_SCANNING_NOT_ALLOWED';

    throw error;
  }

  return true;
};

const assertAIAnalysisAccess = (
  planName,
) => {
  const plan = getPlan(planName);

  if (!plan.ai.analysis) {
    const error = new Error(
      'AI analysis is not available for this plan.',
    );

    error.statusCode = 403;
    error.code =
      'AI_ANALYSIS_NOT_ALLOWED';

    throw error;
  }

  return true;
};

const assertAIRecommendationAccess = (
  planName,
) => {
  const plan = getPlan(planName);

  if (!plan.ai.recommendations) {
    const error = new Error(
      'AI recommendations are not available for this plan.',
    );

    error.statusCode = 403;
    error.code =
      'AI_RECOMMENDATIONS_NOT_ALLOWED';

    throw error;
  }

  return true;
};

const assertAIRemediationAccess = (
  planName,
) => {
  const plan = getPlan(planName);

  if (!plan.ai.remediation) {
    const error = new Error(
      'AI remediation is not available for this plan.',
    );

    error.statusCode = 403;
    error.code =
      'AI_REMEDIATION_NOT_ALLOWED';

    throw error;
  }

  return true;
};

const assertGitHubAccess = (
  planName,
) => {
  const plan = getPlan(planName);

  if (!plan.integrations.github) {
    const error = new Error(
      'GitHub integration is not available for this plan.',
    );

    error.statusCode = 403;
    error.code =
      'GITHUB_INTEGRATION_NOT_ALLOWED';

    throw error;
  }

  return true;
};

const assertCompanyRulesAccess = (
  planName,
) => {
  const plan = getPlan(planName);

  if (!plan.integrations.companyRules) {
    const error = new Error(
      'Company rules are not available for this plan.',
    );

    error.statusCode = 403;
    error.code =
      'COMPANY_RULES_NOT_ALLOWED';

    throw error;
  }

  return true;
};

export {
  hasReportFormatAccess,
  getScannerEntitlements,
  getAIEntitlements,
  getIntegrationEntitlements,
  getEntitlements,
  assertReportFormatAccess,
  assertScanningAccess,
  assertAuthenticationScanningAccess,
  assertAIAnalysisAccess,
  assertAIRecommendationAccess,
  assertAIRemediationAccess,
  assertGitHubAccess,
  assertCompanyRulesAccess,
};