// STATUS: UPDATED
// File: src/storage/cloudinary/cloudinary.constants.js

const CLOUDINARY_RESOURCE_TYPES = Object.freeze({
  IMAGE: 'image',
  VIDEO: 'video',
  RAW: 'raw',
  AUTO: 'auto',
});

const CLOUDINARY_UPLOAD_TYPES = Object.freeze({
  UPLOAD: 'upload',
  AUTHENTICATED: 'authenticated',
  PRIVATE: 'private',
});

const CLOUDINARY_DEFAULTS = Object.freeze({
  resourceType: CLOUDINARY_RESOURCE_TYPES.RAW,
  uploadType: CLOUDINARY_UPLOAD_TYPES.UPLOAD,
  secure: true,
  overwrite: true,
  invalidate: true,
});

export {
  CLOUDINARY_RESOURCE_TYPES,
  CLOUDINARY_UPLOAD_TYPES,
  CLOUDINARY_DEFAULTS,
};
