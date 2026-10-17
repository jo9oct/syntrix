// STATUS: UPDATED
// File: src/storage/cloudinary/cloudinary.uploader.js

import { cloudinary } from './cloudinary.client.js';

import environment from '../../config/environment.js';

import {
  CLOUDINARY_DEFAULTS,
  CLOUDINARY_RESOURCE_TYPES,
  CLOUDINARY_UPLOAD_TYPES,
} from './cloudinary.constants.js';

const uploadBuffer = (buffer, uploadOptions) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result || typeof result !== 'object') {
          reject(
            new Error(
              'Cloudinary returned no valid upload result.',
            ),
          );
          return;
        }

        resolve(result);
      },
    );

    uploadStream.end(buffer);
  });

const normalizePublicId = (publicId) => {
  if (
    typeof publicId !== 'string' ||
    publicId.trim().length === 0
  ) {
    throw new Error(
      'publicId is required to upload a report.',
    );
  }

  return publicId
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
};

const normalizeFolder = () => {
  const folder = environment.cloudinary.folder;

  if (typeof folder !== 'string' || !folder.trim()) {
    return '';
  }

  return folder
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
};

const resolvePublicId = (publicId) => {
  const normalizedPublicId =
    normalizePublicId(publicId);

  const configuredFolder = normalizeFolder();

  if (!configuredFolder) {
    return normalizedPublicId;
  }

  if (
    normalizedPublicId === configuredFolder ||
    normalizedPublicId.startsWith(
      `${configuredFolder}/`,
    )
  ) {
    return normalizedPublicId;
  }

  return `${configuredFolder}/${normalizedPublicId}`;
};

const ensureRawFileExtension = (publicId, format) => {
  if (
    typeof format !== 'string' ||
    !format.trim()
  ) {
    throw new Error(
      'A format is required for raw report uploads.',
    );
  }

  const normalizedFormat = format
    .trim()
    .replace(/^\./, '')
    .toLowerCase();

  if (!/^[a-z0-9]+$/.test(normalizedFormat)) {
    throw new Error(
      'Invalid report file extension.',
    );
  }

  const extension = `.${normalizedFormat}`;

  return publicId.toLowerCase().endsWith(extension)
    ? publicId
    : `${publicId}${extension}`;
};

const uploadReport = async ({
  buffer,
  publicId,
  resourceType = CLOUDINARY_RESOURCE_TYPES.RAW,
  format,
  contentType,
}) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError(
      'Report upload buffer is required.',
    );
  }

  if (buffer.length === 0) {
    throw new Error(
      'Report upload buffer cannot be empty.',
    );
  }

  const canonicalPublicId =
    normalizePublicId(publicId);

  const normalizedResourceType =
    resourceType || CLOUDINARY_DEFAULTS.resourceType;

  const resolvedPublicId =
    resolvePublicId(canonicalPublicId);

  const finalPublicId =
    normalizedResourceType === CLOUDINARY_RESOURCE_TYPES.RAW
      ? ensureRawFileExtension(resolvedPublicId, format)
      : resolvedPublicId;

  const uploadOptions = {
    public_id: finalPublicId,
    resource_type: normalizedResourceType,
    type:
      CLOUDINARY_DEFAULTS.uploadType ||
      CLOUDINARY_UPLOAD_TYPES.UPLOAD,
    overwrite: CLOUDINARY_DEFAULTS.overwrite,
    invalidate: CLOUDINARY_DEFAULTS.invalidate,
    ...(normalizedResourceType !== CLOUDINARY_RESOURCE_TYPES.RAW &&
      format
      ? { format }
      : {}),
  };

  const result = await uploadBuffer(
    buffer,
    uploadOptions,
  );

  const actualPublicId =
    normalizePublicId(
      result.public_id || finalPublicId,
    );

  if (actualPublicId !== finalPublicId) {
    const error = new Error(
      'Cloudinary returned an unexpected report public ID.',
    );

    error.code = 'CLOUDINARY_PUBLIC_ID_MISMATCH';
    error.details = {
      expectedPublicId: finalPublicId,
      actualPublicId,
      resourceType: normalizedResourceType,
    };

    throw error;
  }

  const configuredFolder = normalizeFolder();

  // Return a deletion-compatible ID without the configured
  // folder when that folder was automatically prepended.
  const applicationPublicId =
    configuredFolder &&
    actualPublicId.startsWith(`${configuredFolder}/`)
      ? actualPublicId.slice(configuredFolder.length + 1)
      : actualPublicId;

  const secureUrl =
    result.secure_url || result.url || null;

  if (
    typeof secureUrl !== 'string' ||
    !/^https:\/\//i.test(secureUrl)
  ) {
    throw new Error(
      'Cloudinary returned an invalid report URL.',
    );
  }

  return {
    storageProvider: 'cloudinary',
    publicId: applicationPublicId,
    storageKey: actualPublicId,
    url: secureUrl,
    resourceType:
      result.resource_type || normalizedResourceType,
    format: result.format || format || null,
    contentType: contentType ?? null,
    fileSize: result.bytes ?? buffer.length,
  };
};

export {
  uploadReport,
};
