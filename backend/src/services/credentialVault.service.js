// STATUS: CREATED
// FILE: src/services/credentialVault.service.js

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import environment from "../config/environment.js";
import { redisConnection } from "../config/queue.js";

const CREDENTIAL_TTL_SECONDS = 15 * 60;
const REDIS_KEY_PREFIX = "scan:credential:";

const getEncryptionKey = () => {
  const value = environment.credentialEncryptionKey;

  if (!/^[a-f0-9]{64}$/i.test(value ?? "")) {
    const error = new Error(
      "Credential encryption is not configured correctly.",
    );

    error.code = "CREDENTIAL_ENCRYPTION_KEY_INVALID";
    error.statusCode = 503;

    throw error;
  }

  return Buffer.from(value, "hex");
};

const encryptCredentials = (credentials) => {
  const iv = randomBytes(12);

  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);

  const plaintext = Buffer.from(
    JSON.stringify({
      username: credentials.username,
      password: credentials.password,
    }),
    "utf8",
  );

  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return JSON.stringify({
    version: 1,
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    data: ciphertext.toString("hex"),
  });
};

const decryptCredentials = (value) => {
  const payload = JSON.parse(value);

  if (
    payload?.version !== 1 ||
    !/^[a-f0-9]{24}$/i.test(payload.iv ?? "") ||
    !/^[a-f0-9]{32}$/i.test(payload.tag ?? "") ||
    !/^(?:[a-f0-9]{2})+$/i.test(payload.data ?? "")
  ) {
    throw new Error("Invalid encrypted credential payload.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(payload.iv, "hex"),
  );

  decipher.setAuthTag(Buffer.from(payload.tag, "hex"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "hex")),
    decipher.final(),
  ]);

  const credentials = JSON.parse(plaintext.toString("utf8"));

  if (
    typeof credentials.username !== "string" ||
    typeof credentials.password !== "string"
  ) {
    throw new Error("Invalid decrypted credential data.");
  }

  return credentials;
};

const storeCredentials = async (credentials) => {
  if (
    !credentials ||
    typeof credentials.username !== "string" ||
    typeof credentials.password !== "string"
  ) {
    throw new TypeError("Valid credentials are required.");
  }

  const reference = randomBytes(32).toString("hex");
  const key = `${REDIS_KEY_PREFIX}${reference}`;
  const encryptedValue = encryptCredentials(credentials);

  const result = await redisConnection.set(
    key,
    encryptedValue,
    "EX",
    CREDENTIAL_TTL_SECONDS,
    "NX",
  );

  if (result !== "OK") {
    throw new Error("Could not store temporary credentials.");
  }

  return reference;
};

const getCredentials = async (reference) => {
  if (!/^[a-f0-9]{64}$/i.test(reference ?? "")) {
    return null;
  }

  const encryptedValue = await redisConnection.get(
    `${REDIS_KEY_PREFIX}${reference}`,
  );

  if (!encryptedValue) {
    return null;
  }

  return decryptCredentials(encryptedValue);
};

const deleteCredentials = async (reference) => {
  if (!/^[a-f0-9]{64}$/i.test(reference ?? "")) {
    return;
  }

  await redisConnection.del(`${REDIS_KEY_PREFIX}${reference}`);
};

export {
  CREDENTIAL_TTL_SECONDS,
  storeCredentials,
  getCredentials,
  deleteCredentials,
};
