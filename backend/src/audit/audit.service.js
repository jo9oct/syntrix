import {
  AUDIT_ACTOR_TYPES
} from "./audit.constants.js";

const auditLog = async ({
  ownerId,
  action,
  actorType =
    AUDIT_ACTOR_TYPES.SYSTEM,
  actorId = null,
  resourceType = null,
  resourceId = null,
  requestId = null,
  metadata = {}
}) => {
  if (!ownerId) {
    throw new Error(
      "ownerId is required for audit logging."
    );
  }

  if (!action) {
    throw new Error(
      "Audit action is required."
    );
  }

  const entry = {
    ownerId,
    action,
    actorType,
    actorId,
    resourceType,
    resourceId,
    requestId,
    metadata,
    timestamp:
      new Date().toISOString()
  };

  /*
   * Audit persistence is intentionally kept behind
   * this service boundary. No new audit collection is
   * introduced because the authoritative database
   * structure does not define an audit model.
   *
   * Structured output allows the existing centralized
   * application logging system to consume the event.
   */
  console.info(
    JSON.stringify({
      event: "audit",
      ...entry
    })
  );

  return entry;
};

export {
  auditLog
};