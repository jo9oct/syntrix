/* STATUS: UPDATED
 * FILE: src/controllers/scope.controller.js
 */

import {
  createScope,
  listScopes,
  getScope,
  updateScope,
  deleteScope,
} from "../services/scope.service.js";

import { getOwnerId } from "../middleware/authorization.middleware.js";

const createScopeController = async (req, res, next) => {
  try {
    const scope = await createScope({
      ...req.body,
      // Never trust ownerId supplied by the client.
      ownerId: getOwnerId(req),
    });

    return res.status(201).json({
      success: true,
      data: { scope },
    });
  } catch (error) {
    return next(error);
  }
};

const listScopesController = async (req, res, next) => {
  try {
    const scopes = await listScopes({
      ownerId: getOwnerId(req),
    });

    return res.status(200).json({
      success: true,
      data: { scopes },
    });
  } catch (error) {
    return next(error);
  }
};

const getScopeController = async (req, res, next) => {
  try {
    const scope = await getScope({
      ownerId: getOwnerId(req),
      scopeId: req.params.scopeId,
    });

    return res.status(200).json({
      success: true,
      data: { scope },
    });
  } catch (error) {
    return next(error);
  }
};

const updateScopeController = async (req, res, next) => {
  try {
    const scope = await updateScope({
      ownerId: getOwnerId(req),
      scopeId: req.params.scopeId,
      updates: req.body,
    });

    return res.status(200).json({
      success: true,
      data: { scope },
    });
  } catch (error) {
    return next(error);
  }
};

const deleteScopeController = async (req, res, next) => {
  try {
    const result = await deleteScope({
      ownerId: getOwnerId(req),
      scopeId: req.params.scopeId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export {
  createScopeController,
  listScopesController,
  getScopeController,
  updateScopeController,
  deleteScopeController,
};
