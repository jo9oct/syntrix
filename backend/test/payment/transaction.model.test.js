// STATUS: CREATE
// FILE: test/payment/transaction.model.test.js

import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import { Transaction } from "../../src/models/Transaction.js";

const validTransaction = () => ({
  userId: new mongoose.Types.ObjectId(),
  tx_ref: `stx-${"a".repeat(36)}`,
  amount: 2500,
  currency: "ETB",
  tier: "pro",
  billingCycle: "monthly",
  status: "pending",
  activationStatus: "pending",
  customerEmail: "customer@example.com",
  customerName: "Test Customer",
});

test("accepts a valid pending transaction", () => {
  const transaction = new Transaction(validTransaction());

  assert.equal(transaction.validateSync(), undefined);
  assert.equal(transaction.status, "pending");
  assert.equal(transaction.activationStatus, "pending");
});

test("rejects a missing user ID", () => {
  const data = validTransaction();
  delete data.userId;

  const error = new Transaction(data).validateSync();

  assert.ok(error?.errors.userId);
});

test("rejects an invalid transaction reference", () => {
  const data = validTransaction();
  data.tx_ref = "invalid-reference";

  const error = new Transaction(data).validateSync();

  assert.ok(error?.errors.tx_ref);
});

test("rejects zero or negative payment amounts", () => {
  for (const amount of [0, -1]) {
    const transaction = new Transaction({
      ...validTransaction(),
      amount,
    });

    assert.ok(transaction.validateSync()?.errors.amount);
  }
});

test("rejects non-finite payment amounts", () => {
  const transaction = new Transaction({
    ...validTransaction(),
    amount: Infinity,
  });

  assert.ok(transaction.validateSync()?.errors.amount);
});

test("rejects currencies other than ETB", () => {
  const transaction = new Transaction({
    ...validTransaction(),
    currency: "USD",
  });

  assert.ok(transaction.validateSync()?.errors.currency);
});

test("rejects the free tier as a paid transaction", () => {
  const transaction = new Transaction({
    ...validTransaction(),
    tier: "free",
  });

  assert.ok(transaction.validateSync()?.errors.tier);
});

test("rejects unsupported billing cycles", () => {
  const transaction = new Transaction({
    ...validTransaction(),
    billingCycle: "weekly",
  });

  assert.ok(transaction.validateSync()?.errors.billingCycle);
});

test("rejects unsupported transaction statuses", () => {
  const transaction = new Transaction({
    ...validTransaction(),
    status: "refunded",
  });

  assert.ok(transaction.validateSync()?.errors.status);
});

test("rejects unsupported activation statuses", () => {
  const transaction = new Transaction({
    ...validTransaction(),
    activationStatus: "activated",
  });

  assert.ok(transaction.validateSync()?.errors.activationStatus);
});

test("rejects missing customer email and name", () => {
  const data = validTransaction();
  delete data.customerEmail;
  delete data.customerName;

  const error = new Transaction(data).validateSync();

  assert.ok(error?.errors.customerEmail);
  assert.ok(error?.errors.customerName);
});

test("uses pending statuses by default", () => {
  const data = validTransaction();
  delete data.status;
  delete data.activationStatus;

  const transaction = new Transaction(data);

  assert.equal(transaction.status, "pending");
  assert.equal(transaction.activationStatus, "pending");
});

test("declares a unique transaction reference index", () => {
  const index = Transaction.schema
    .indexes()
    .find(([keys, options]) => keys.tx_ref === 1 && options.unique === true);

  assert.ok(index, "tx_ref should have a unique index");
});
