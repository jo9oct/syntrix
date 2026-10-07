// STATUS: UPDATED

const PLAN_NAMES = Object.freeze({
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
});

const REPORT_FORMATS = Object.freeze({
  JSON: 'json',
  HTML: 'html',
  PDF: 'pdf',
});

const PLANS = Object.freeze({
  [PLAN_NAMES.FREE]: Object.freeze({
    name: PLAN_NAMES.FREE,

    dailyScanLimit: 5,

    monthlyScanLimit: null,

    maxConcurrentScans: 1,

    maxScannersPerScan: 1,

    maxCrawlPaths: 25,

    maxCrawlDepth: 2,

    authenticationScanning: false,

    requestRateLimit: 2,

    maxReportsPerScan: 3,

    allowedReportFormats: Object.freeze([
      REPORT_FORMATS.JSON,
    ]),

    ai: Object.freeze({
      analysis: false,
      recommendations: false,
      remediation: false,
    }),

    integrations: Object.freeze({
      github: false,
      companyRules: false,
    }),
  }),

  [PLAN_NAMES.PRO]: Object.freeze({
    name: PLAN_NAMES.PRO,

    dailyScanLimit: null,

    monthlyScanLimit: 200,

    maxConcurrentScans: 3,

    maxScannersPerScan: null,

    maxCrawlPaths: 250,

    maxCrawlDepth: 5,

    authenticationScanning: true,

    requestRateLimit: 20,

    maxReportsPerScan: 10,

    allowedReportFormats: Object.freeze([
      REPORT_FORMATS.JSON,
      REPORT_FORMATS.HTML,
      REPORT_FORMATS.PDF,
    ]),

    ai: Object.freeze({
      analysis: true,
      recommendations: true,
      remediation: true,
    }),

    integrations: Object.freeze({
      github: false,
      companyRules: false,
    }),
  }),

  [PLAN_NAMES.ENTERPRISE]: Object.freeze({
    name: PLAN_NAMES.ENTERPRISE,

    dailyScanLimit: null,

    monthlyScanLimit: null,

    maxConcurrentScans: null,

    maxScannersPerScan: null,

    maxCrawlPaths: null,

    maxCrawlDepth: null,

    authenticationScanning: true,

    requestRateLimit: 100,

    maxReportsPerScan: null,

    allowedReportFormats: Object.freeze([
      REPORT_FORMATS.JSON,
      REPORT_FORMATS.HTML,
      REPORT_FORMATS.PDF,
    ]),

    ai: Object.freeze({
      analysis: true,
      recommendations: true,
      remediation: true,
    }),

    integrations: Object.freeze({
      github: true,
      companyRules: true,
    }),
  }),
});

const normalizePlanName = (value) => {
  if (typeof value !== 'string') {
    return PLAN_NAMES.FREE;
  }

  const normalized = value.trim().toLowerCase();

  if (Object.hasOwn(PLANS, normalized)) {
    return normalized;
  }

  return PLAN_NAMES.FREE;
};

const getPlan = (planName = process.env.USER_TIER) => {
  const normalizedPlanName = normalizePlanName(planName);

  return PLANS[normalizedPlanName];
};

const getPlanName = (planName = process.env.USER_TIER) =>
  getPlan(planName).name;

const isValidPlan = (planName) => {
  if (typeof planName !== 'string') {
    return false;
  }

  return Object.hasOwn(
    PLANS,
    planName.trim().toLowerCase(),
  );
};

export {
  PLAN_NAMES,
  REPORT_FORMATS,
  PLANS,
  normalizePlanName,
  getPlan,
  getPlanName,
  isValidPlan,
};