import {
  parseResponse,
} from './responseParser.js';

const createBaseline = (
  response,
) => {
  const parsed =
    parseResponse(response);

  return {
    statusCode:
      parsed.statusCode,

    contentType:
      parsed.contentType,

    bodyLength:
      parsed.bodyLength,

    headers: {
      ...parsed.headers,
    },

    body:
      parsed.body,
  };
};

const compareToBaseline = (
  response,
  baseline,
) => {
  const current =
    parseResponse(response);

  return {
    statusChanged:
      current.statusCode !==
      baseline.statusCode,

    contentTypeChanged:
      current.contentType !==
      baseline.contentType,

    bodyLengthDelta:
      current.bodyLength -
      baseline.bodyLength,

    bodyChanged:
      current.body !==
      baseline.body,

    headerChanges:
      getHeaderChanges(
        baseline.headers,
        current.headers,
      ),
  };
};

const getHeaderChanges = (
  baselineHeaders = {},
  currentHeaders = {},
) => {
  const names = new Set([
    ...Object.keys(
      baselineHeaders,
    ),
    ...Object.keys(
      currentHeaders,
    ),
  ]);

  const changes = [];

  for (const name of names) {
    const before =
      baselineHeaders[name] ??
      null;

    const after =
      currentHeaders[name] ??
      null;

    if (before !== after) {
      changes.push({
        name,
        before,
        after,
      });
    }
  }

  return changes;
};

export {
  createBaseline,
  compareToBaseline,
  getHeaderChanges,
};