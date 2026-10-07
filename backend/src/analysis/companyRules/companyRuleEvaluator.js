// STATUS: UPDATED

import mongoose from 'mongoose';

import * as companyRuleRepository
  from '../../database/repositories/companyRule.repository.js';

import {
  evaluateRule,
} from './ruleHandlers.js';

import {
  normalizeFinding,
} from '../../engine/finding.js';

const assertOwnerId = (
  ownerId,
) => {
  if (
    !mongoose.isValidObjectId(
      ownerId,
    )
  ) {
    const error =
      new Error(
        'Owner ID must be a valid ObjectId.',
      );

    error.statusCode = 400;
    error.code =
      'INVALID_OWNER_ID';

    throw error;
  }

  return new mongoose.Types.ObjectId(
    ownerId,
  );
};

const normalizeRuleIds = (
  ruleIds,
) => {
  if (
    !Array.isArray(
      ruleIds,
    )
  ) {
    return [];
  }

  return [
    ...new Set(
      ruleIds.map(
        (ruleId) =>
          ruleId.toString(),
      ),
    ),
  ].map(
    (ruleId) =>
      new mongoose.Types.ObjectId(
        ruleId,
      ),
  );
};

const buildCompanyRuleFinding = ({
  rule,
  evaluation,
}) => {
  return normalizeFinding({
    scannerId:
      'company-rule',

    category:
      rule.category,

    title:
      rule.name,

    description:
      rule.description,

    impact:
      `Company security policy "${rule.name}" was violated.`,

    severity:
      rule.severity,

    confidence:
      'high',

    status:
      'detected',

    verificationStatus:
      'pending',

    remediation:
      rule.rule?.remediation ??
      `Review and comply with the company security rule "${rule.name}".`,

    tags: [
      'company-rule',
      rule.category,
    ],

    metadata: {
      companyRuleId:
        rule._id?.toString(),

      companyRuleName:
        rule.name,

      companyRuleCategory:
        rule.category,

      ruleDefinition:
        rule.rule,

      evaluation: {
        actual:
          evaluation.actual,

        expected:
          evaluation.expected,

        operator:
          evaluation.operator,

        scannerId:
          evaluation.scannerId,

        source:
          evaluation.source,
      },
    },
  });
};

const evaluateCompanyRules = async ({
  ownerId,
  companyRuleIds = [],
  scannerResults = [],
}) => {
  const normalizedOwnerId =
    assertOwnerId(
      ownerId,
    );

  if (
    !Array.isArray(
      scannerResults,
    )
  ) {
    throw new TypeError(
      'Scanner results must be an array.',
    );
  }

  const normalizedRuleIds =
    normalizeRuleIds(
      companyRuleIds,
    );

  if (
    normalizedRuleIds.length === 0
  ) {
    return {
      rulesEvaluated: 0,

      violatedRules: 0,

      findings: [],

      evaluations: [],
    };
  }

  const rules =
    await companyRuleRepository
      .findByIds(
        normalizedOwnerId,
        normalizedRuleIds,
      );

  if (
    rules.length !==
    normalizedRuleIds.length
  ) {
    const error =
      new Error(
        'One or more selected company security rules were not found or are disabled.',
      );

    error.statusCode = 400;
    error.code =
      'COMPANY_RULE_SELECTION_INVALID';

    throw error;
  }

  const findings = [];
  const evaluations = [];

  for (
    const rule of rules
  ) {
    try {
      const evaluation =
        evaluateRule({
          rule,

          scannerResults,
        });

      evaluations.push({
        ruleId:
          rule._id?.toString(),

        ruleName:
          rule.name,

        supported:
          evaluation.supported,

        violated:
          evaluation.violated,

        actual:
          evaluation.actual,

        expected:
          evaluation.expected,

        operator:
          evaluation.operator,

        scannerId:
          evaluation.scannerId,

        source:
          evaluation.source,
      });

      if (
        evaluation.supported &&
        evaluation.violated
      ) {
        findings.push(
          buildCompanyRuleFinding({
            rule,

            evaluation,
          }),
        );
      }
    } catch (error) {
      evaluations.push({
        ruleId:
          rule._id?.toString(),

        ruleName:
          rule.name,

        supported:
          false,

        violated:
          false,

        error: {
          code:
            error?.code ??
            'COMPANY_RULE_EVALUATION_ERROR',

          message:
            error?.message ??
            'Company rule evaluation failed.',
        },
      });
    }
  }

  return {
    rulesEvaluated:
      rules.length,

    violatedRules:
      findings.length,

    findings,

    evaluations,
  };
};

export {
  evaluateCompanyRules,
};