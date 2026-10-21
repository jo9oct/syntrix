// STATUS: CREATE
// FILE: test/payment/chapa.service.test.js

import test from "node:test";
import assert from "node:assert/strict";

import {
  chapaService,
  SUBSCRIPTION_PLANS,
} from "../../src/services/chapa.service.js";

const validParams = () => ({
  amount: 2500,
  currency: "ETB",
  email: "customer@example.com",
  firstName: "Test",
  lastName: "Customer",
  tx_ref: `stx-${"a".repeat(36)}`,
});

test("contains the free, pro, and enterprise plans", () => {
  const ids = SUBSCRIPTION_PLANS.map((plan) => plan.id);

  assert.deepEqual(ids, ["free", "pro", "enterprise"]);
});

test("defines positive prices for paid monthly plans", () => {
  const pro = SUBSCRIPTION_PLANS.find((plan) => plan.id === "pro");
  const enterprise = SUBSCRIPTION_PLANS.find(
    (plan) => plan.id === "enterprise",
  );

  assert.ok(pro.priceETB > 0);
  assert.ok(enterprise.priceETB > 0);
});

test("rejects missing initialization parameters", async () => {
  await assert.rejects(
    chapaService.initializePayment(undefined),
    /Invalid payment initialization parameters/,
  );
});

test("rejects a non-object initialization payload", async () => {
  await assert.rejects(
    chapaService.initializePayment("invalid"),
    /Invalid payment initialization parameters/,
  );
});

test("rejects a zero payment amount", async () => {
  await assert.rejects(
    chapaService.initializePayment({
      ...validParams(),
      amount: 0,
    }),
    /Invalid payment initialization parameters/,
  );
});

test("rejects a negative payment amount", async () => {
  await assert.rejects(
    chapaService.initializePayment({
      ...validParams(),
      amount: -10,
    }),
    /Invalid payment initialization parameters/,
  );
});

test("rejects non-numeric payment amounts", async () => {
  await assert.rejects(
    chapaService.initializePayment({
      ...validParams(),
      amount: "not-a-number",
    }),
    /Invalid payment initialization parameters/,
  );
});

test("rejects unsupported currencies", async () => {
  await assert.rejects(
    chapaService.initializePayment({
      ...validParams(),
      currency: "USD",
    }),
    /Invalid payment initialization parameters/,
  );
});

test("rejects malformed email addresses", async () => {
  await assert.rejects(
    chapaService.initializePayment({
      ...validParams(),
      email: "not-an-email",
    }),
    /Invalid payment initialization parameters/,
  );
});

test("rejects a missing first name", async () => {
  await assert.rejects(
    chapaService.initializePayment({
      ...validParams(),
      firstName: " ",
    }),
    /Invalid payment initialization parameters/,
  );
});

test("rejects a missing last name", async () => {
  await assert.rejects(
    chapaService.initializePayment({
      ...validParams(),
      lastName: "",
    }),
    /Invalid payment initialization parameters/,
  );
});

test("rejects malformed transaction references during initialization", async () => {
  await assert.rejects(
    chapaService.initializePayment({
      ...validParams(),
      tx_ref: "invalid-reference",
    }),
    /Invalid payment initialization parameters/,
  );
});

test("rejects transaction references with the wrong length", async () => {
  await assert.rejects(
    chapaService.initializePayment({
      ...validParams(),
      tx_ref: "stx-aabb",
    }),
    /Invalid payment initialization parameters/,
  );
});

test("rejects malformed transaction references during verification", async () => {
  await assert.rejects(
    chapaService.verifyPayment("invalid-reference"),
    /valid transaction reference is required/i,
  );
});

test("rejects empty transaction references during verification", async () => {
  await assert.rejects(
    chapaService.verifyPayment(""),
    /valid transaction reference is required/i,
  );
});
