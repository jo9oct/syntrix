// STATUS: UPDATED

import axios from 'axios';

import environment from '../config/environment.js';

import {
  buildFindingPrompt,
} from './promptBuilder.js';

import {
  ensureRemediation,
} from './remediation.js';

const MAX_RESPONSE_LENGTH =
  20_000;

const parseJsonResponse = (
  value,
) => {
  if (
    typeof value !== 'string'
  ) {
    return value;
  }

  const text =
    value
      .trim()
      .slice(
        0,
        MAX_RESPONSE_LENGTH,
      );

  try {
    return JSON.parse(text);
  } catch {
    const fenced =
      text
        .replace(
          /^```json\s*/i,
          '',
        )
        .replace(
          /^```\s*/i,
          '',
        )
        .replace(
          /```\s*$/i,
          '',
        )
        .trim();

    try {
      return JSON.parse(
        fenced,
      );
    } catch {
      return {
        summary:
          text,

        impact:
          null,

        rootCause:
          null,

        uncertainty:
          null,

        remediation:
          null,
      };
    }
  }
};

const normalizeAnalysis = ({
  finding,
  response,
}) => {
  const data =
    response &&
    typeof response === 'object'
      ? response
      : {};

  return {
    summary:
      typeof data.summary ===
      'string'
        ? data.summary.trim()
        : null,

    impact:
      typeof data.impact ===
      'string'
        ? data.impact.trim()
        : null,

    rootCause:
      typeof data.rootCause ===
      'string'
        ? data.rootCause.trim()
        : null,

    uncertainty:
      typeof data.uncertainty ===
      'string'
        ? data.uncertainty.trim()
        : null,

    remediation:
      ensureRemediation(
        data.remediation,
        finding,
      ),
  };
};

const createProviderRequest = ({
  system,
  user,
}) => {
  if (
    environment.ai.provider ===
    'openai'
  ) {
    return {
      url:
        'https://api.openai.com/v1/chat/completions',

      headers: {
        Authorization:
          `Bearer ${environment.ai.apiKey}`,

        'Content-Type':
          'application/json',
      },

      data: {
        model:
          environment.ai.model,

        temperature:
          0.1,

        response_format: {
          type:
            'json_object',
        },

        messages: [
          {
            role:
              'system',

            content:
              system,
          },

          {
            role:
              'user',

            content:
              user,
          },
        ],
      },
    };
  }

  if (
    environment.ai.provider ===
    'groq'
  ) {
    return {
      url:
        'https://api.groq.com/openai/v1/chat/completions',

      headers: {
        Authorization:
          `Bearer ${environment.ai.apiKey}`,

        'Content-Type':
          'application/json',
      },

      data: {
        model:
          environment.ai.model,

        temperature:
          0.1,

        response_format: {
          type:
            'json_object',
        },

        messages: [
          {
            role:
              'system',

            content:
              system,
          },

          {
            role:
              'user',

            content:
              user,
          },
        ],
      },
    };
  }

  throw new Error(
    `Unsupported AI provider: ${environment.ai.provider}`,
  );
};

const callProvider = async ({
  system,
  user,
}) => {
  const request =
    createProviderRequest({
      system,
      user,
    });

  const response =
    await axios.post(
      request.url,

      request.data,

      {
        headers:
          request.headers,

        timeout:
          environment.http
            .timeoutMs,
      },
    );

  return (
    response?.data?.choices?.[0]
      ?.message?.content ??
    null
  );
};

const analyzeFinding = async ({
  finding,
  evidence = [],
  target = null,
}) => {
  if (!finding) {
    throw new Error(
      'finding is required for AI analysis.',
    );
  }

  if (
    !environment.ai.enabled
  ) {
    return {
      enabled:
        false,

      status:
        'disabled',

      provider:
        null,

      model:
        null,

      analysis:
        null,
    };
  }

  if (
    !environment.ai.provider ||
    !environment.ai.apiKey ||
    !environment.ai.model
  ) {
    return {
      enabled:
        false,

      status:
        'not_configured',

      provider:
        environment.ai.provider ||
        null,

      model:
        environment.ai.model ||
        null,

      analysis:
        null,
    };
  }

  const prompt =
    buildFindingPrompt({
      finding,
      evidence,
      target,
    });

  try {
    const raw =
      await callProvider(
        prompt,
      );

    const parsed =
      parseJsonResponse(
        raw,
      );

    const analysis =
      normalizeAnalysis({
        finding,
        response:
          parsed,
      });

    return {
      enabled:
        true,

      status:
        'completed',

      provider:
        environment.ai.provider,

      model:
        environment.ai.model,

      analysis,
    };
  } catch (error) {
    return {
      enabled:
        true,

      status:
        'failed',

      provider:
        environment.ai.provider,

      model:
        environment.ai.model,

      analysis:
        null,

      error:
        error.message,
    };
  }
};

export {
  analyzeFinding,
  normalizeAnalysis,
  parseJsonResponse,
};