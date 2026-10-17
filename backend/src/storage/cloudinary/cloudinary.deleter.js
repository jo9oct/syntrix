// STATUS: UPDATED
// File: src/storage/cloudinary/cloudinary.deleter.js

import { cloudinary } from './cloudinary.client.js';
import environment from '../../config/environment.js';

import {
  CLOUDINARY_DEFAULTS,
  CLOUDINARY_RESOURCE_TYPES,
} from './cloudinary.constants.js';

const normalizePublicId = (publicId) => {
  if (
    typeof publicId !== 'string' ||
    publicId.trim().length === 0
  ) {
    throw new Error(
      'publicId is required to delete a Cloudinary report.',
    );
  }

  return publicId
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
};

const normalizeResourceType = (resourceType) => {
  if (
    typeof resourceType !== 'string' ||
    resourceType.trim().length === 0
  ) {
    throw new Error(
      'resourceType is required to delete a Cloudinary report.',
    );
  }

  const normalized = resourceType.trim();

  const allowedResourceTypes = new Set(
    Object.values(CLOUDINARY_RESOURCE_TYPES),
  );

  if (!allowedResourceTypes.has(normalized)) {
    throw new Error(
      'Unsupported Cloudinary resource type.',
    );
  }

  return normalized;
};

const resolvePublicId = (publicId) => {
  const configuredFolder =
    environment.cloudinary.folder?.trim()
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');

  const normalizedPublicId =
    normalizePublicId(publicId);

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

const deleteReport = async ({
  publicId,
  resourceType = CLOUDINARY_RESOURCE_TYPES.RAW,
}) => {
  const normalizedResourceType =
    normalizeResourceType(resourceType);

  const finalPublicId =
    resolvePublicId(publicId);

  const result =
    await cloudinary.uploader.destroy(
      finalPublicId,
      {
        resource_type: normalizedResourceType,
        type: CLOUDINARY_DEFAULTS.uploadType,
        invalidate: CLOUDINARY_DEFAULTS.invalidate,
      },
    );

  const deletionResult = result?.result;

  if (
    deletionResult !== 'ok' &&
    deletionResult !== 'not found'
  ) {
    const error = new Error(
      'Cloudinary did not confirm report deletion.',
    );

    error.code = 'CLOUDINARY_DELETE_UNCONFIRMED';
    error.details = {
      publicId: finalPublicId,
      resourceType: normalizedResourceType,
      result: deletionResult ?? null,
    };

    throw error;
  }

  return {
    storageProvider: 'cloudinary',
    publicId: finalPublicId,
    resourceType: normalizedResourceType,
    result: deletionResult,
    deleted: deletionResult === 'ok',
    alreadyMissing: deletionResult === 'not found',
  };
};

export {
  deleteReport,
};
