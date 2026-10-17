
 // STATUS: UPDATED
 // File: src/reports/reportStorage.js

import {
  uploadReport,
} from '../storage/cloudinary/cloudinary.uploader.js';

import {
  deleteReport,
} from '../storage/cloudinary/cloudinary.deleter.js';

import {
  CLOUDINARY_RESOURCE_TYPES,
} from '../storage/cloudinary/cloudinary.constants.js';

const REPORT_RESOURCE_TYPE = CLOUDINARY_RESOURCE_TYPES.RAW;

const SUPPORTED_FORMATS = new Set([
  'json',
  'html',
  'pdf',
]);

const createStorageError = (
  message,
  code,
  statusCode = 500,
) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
};

const requireNonEmptyString = (value, fieldName) => {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0
  ) {
    throw createStorageError(
      `${fieldName} must be a non-empty string.`,
      'INVALID_REPORT_STORAGE_ARGUMENT',
      400,
    );
  }

  return value.trim();
};

const validateFormat = (format) => {
  const normalizedFormat =
    requireNonEmptyString(format, 'format').toLowerCase();

  if (!SUPPORTED_FORMATS.has(normalizedFormat)) {
    throw createStorageError(
      'Unsupported report format.',
      'UNSUPPORTED_REPORT_FORMAT',
      400,
    );
  }

  return normalizedFormat;
};

const buildReportPublicId = ({
  ownerId,
  scanId,
  reportId,
  format,
}) => {
  const normalizedOwnerId =
    requireNonEmptyString(String(ownerId ?? ''), 'ownerId');

  const normalizedScanId =
    requireNonEmptyString(String(scanId ?? ''), 'scanId');

  const normalizedReportId =
    requireNonEmptyString(String(reportId ?? ''), 'reportId');

  validateFormat(format);

  return [
    normalizedOwnerId,
    normalizedScanId,
    normalizedReportId,
  ].join('/');
};

const storeReport = async ({
  ownerId,
  scanId,
  reportId,
  format,
  content,
  contentType,
}) => {
  const normalizedFormat = validateFormat(format);

  if (content === undefined || content === null) {
    throw createStorageError(
      'Report content is required.',
      'REPORT_CONTENT_REQUIRED',
      400,
    );
  }

  if (
    contentType !== undefined &&
    (
      typeof contentType !== 'string' ||
      contentType.trim().length === 0
    )
  ) {
    throw createStorageError(
      'contentType must be a non-empty string when provided.',
      'INVALID_REPORT_CONTENT_TYPE',
      400,
    );
  }

  const requestedPublicId = buildReportPublicId({
    ownerId,
    scanId,
    reportId,
    format: normalizedFormat,
  });

  const buffer = Buffer.isBuffer(content)
    ? content
    : Buffer.from(String(content), 'utf8');

  if (buffer.length === 0) {
    throw createStorageError(
      'Report content is empty.',
      'EMPTY_REPORT_CONTENT',
      400,
    );
  }

  const result = await uploadReport({
    buffer,
    publicId: requestedPublicId,
    resourceType: REPORT_RESOURCE_TYPE,
    format: normalizedFormat,
    contentType: contentType?.trim(),
  });

  if (!result || typeof result !== 'object') {
    throw createStorageError(
      'Cloudinary returned an invalid upload response.',
      'INVALID_REPORT_UPLOAD_RESPONSE',
    );
  }

  // Support the normalized uploader response and the
  // original Cloudinary response field names.
  const returnedPublicId =
    result.publicId ?? result.public_id;

  const storagePublicId = requireNonEmptyString(
    returnedPublicId ?? requestedPublicId,
    'Cloudinary public ID',
  );

  const storageUrl =
    result.url ?? result.secureUrl ?? result.secure_url;

  if (
    typeof storageUrl !== 'string' ||
    !/^https:\/\//i.test(storageUrl)
  ) {
    throw createStorageError(
      'Cloudinary did not return a valid HTTPS report URL.',
      'INVALID_REPORT_STORAGE_URL',
    );
  }

  return {
    storageProvider: 'cloudinary',
    storagePublicId,
    storageUrl,
    format: normalizedFormat,
    contentType:
      result.contentType ??
      result.content_type ??
      contentType?.trim() ??
      null,
    fileSize:
      result.fileSize ??
      result.bytes ??
      buffer.length,
  };
};

const removeStoredReport = async ({ publicId }) => {
  const normalizedPublicId =
    requireNonEmptyString(publicId, 'publicId');

  return deleteReport({
    publicId: normalizedPublicId,
    resourceType: REPORT_RESOURCE_TYPE,
  });
};

export {
  REPORT_RESOURCE_TYPE,
  buildReportPublicId,
  storeReport,
  removeStoredReport,
};
