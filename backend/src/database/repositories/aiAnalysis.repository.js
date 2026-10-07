// STATUS: UPDATED

import AiAnalysis from '../models/aiAnalysis.model.js';

const create = async (
  data,
) =>
  AiAnalysis.create(data);

const findById = async (
  ownerId,
  analysisId,
) =>
  AiAnalysis.findOne({
    _id: analysisId,
    ownerId,
  }).lean();

const findByFindingId = async (
  ownerId,
  findingId,
) =>
  AiAnalysis.find({
    ownerId,
    findingId,
  })
    .sort({
      createdAt: -1,
    })
    .lean();

const findByScanId = async (
  ownerId,
  scanId,
) =>
  AiAnalysis.find({
    ownerId,
    scanId,
  })
    .sort({
      createdAt: -1,
    })
    .lean();

const updateStatus = async (
  ownerId,
  analysisId,
  status,
  fields = {},
) =>
  AiAnalysis.findOneAndUpdate(
    {
      _id: analysisId,
      ownerId,
    },
    {
      $set: {
        status,
        ...fields,
        ...(status === 'completed' ||
        status === 'failed'
          ? {
              completedAt:
                new Date(),
            }
          : {}),
      },
    },
    {
      new: true,
    },
  );

const deleteByOwnerId = async (
  ownerId,
) =>
  AiAnalysis.deleteMany({
    ownerId,
  });

export {
  create,
  findById,
  findByFindingId,
  findByScanId,
  updateStatus,
  deleteByOwnerId,
};