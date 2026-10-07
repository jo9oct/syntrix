// STATUS: UPDATED

import Joi from 'joi';

const scannerNamePattern =
  /^[a-zA-Z0-9_-]+$/;

const scannerName = Joi.string()
  .trim()
  .pattern(scannerNamePattern)
  .max(128);

const scannerSelection = Joi.array()
  .items(scannerName)
  .max(100)
  .unique();

const companyRuleId = Joi.string()
  .trim()
  .hex()
  .length(24);

const companyRuleIds = Joi.array()
  .items(companyRuleId)
  .max(100)
  .unique()
  .optional();

const targetUrl = Joi.string()
  .trim()
  .uri({
    scheme: [
      'http',
      'https',
    ],
    allowRelative: false,
  })
  .max(2048)
  .custom((value, helpers) => {
    let parsedUrl;

    try {
      parsedUrl = new URL(value);
    } catch {
      return helpers.error(
        'any.invalid',
      );
    }

    if (
      !['http:', 'https:'].includes(
        parsedUrl.protocol,
      )
    ) {
      return helpers.error(
        'any.invalid',
      );
    }

    if (
      !parsedUrl.hostname ||
      parsedUrl.hostname.length > 253
    ) {
      return helpers.error(
        'any.invalid',
      );
    }

    if (
      parsedUrl.username ||
      parsedUrl.password
    ) {
      return helpers.error(
        'any.invalid',
      );
    }

    return value;
  });

const credentialsSchema = Joi.object({
  username: Joi.string()
    .trim()
    .min(1)
    .max(512)
    .required(),

  password: Joi.string()
    .min(1)
    .max(4096)
    .required(),
}).required();

const scanSelectionSchema = Joi.object({
  recon:
    scannerSelection.default([]),

  security:
    scannerSelection.default([]),
})
  .required()
  .custom((value, helpers) => {
    const reconCount =
      value.recon?.length ?? 0;

    const securityCount =
      value.security?.length ?? 0;

    if (
      reconCount === 0 &&
      securityCount === 0
    ) {
      return helpers.error(
        'any.custom',
      );
    }

    return value;
  })
  .messages({
    'any.custom':
      'At least one recon or security scanner must be selected.',
  });

const createScanSchema = Joi.object({
  targetUrl:
    targetUrl.required(),

  scanSelection:
    scanSelectionSchema,

  companyRuleIds,

  credentials:
    credentialsSchema.optional(),

  idempotencyKey:
    Joi.string()
      .trim()
      .min(8)
      .max(256)
      .pattern(
        /^[a-zA-Z0-9._:-]+$/,
      )
      .optional(),
}).required();

const scanIdSchema = Joi.object({
  scanId:
    Joi.string()
      .trim()
      .hex()
      .length(24)
      .required(),
}).required();

const cancelScanSchema =
  scanIdSchema;

const listScanQuerySchema =
  Joi.object({
    status:
      Joi.string()
        .valid(
          'pending',
          'running',
          'completed',
          'failed',
          'cancelled',
        )
        .optional(),

    limit:
      Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(50),

    skip:
      Joi.number()
        .integer()
        .min(0)
        .max(100_000)
        .default(0),
  });

const normalizeSelection = (
  selection,
) => ({
  recon: [
    ...new Set(
      selection?.recon ?? [],
    ),
  ],

  security: [
    ...new Set(
      selection?.security ?? [],
    ),
  ],
});

const normalizeCompanyRuleIds = (
  ruleIds,
) => [
  ...new Set(
    Array.isArray(ruleIds)
      ? ruleIds
      : [],
  ),
];

const getSelectedScannerIds = (
  selection,
) => {
  const normalized =
    normalizeSelection(
      selection,
    );

  return [
    ...normalized.recon,
    ...normalized.security,
  ];
};

export {
  targetUrl,
  scannerName,
  scannerSelection,
  companyRuleId,
  companyRuleIds,
  scanSelectionSchema,
  createScanSchema,
  scanIdSchema,
  cancelScanSchema,
  listScanQuerySchema,
  normalizeSelection,
  normalizeCompanyRuleIds,
  getSelectedScannerIds,
};