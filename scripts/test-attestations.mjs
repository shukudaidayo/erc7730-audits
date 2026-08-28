#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateAttestationReport,
  validateEasAttestation,
} from "./eas-attestation.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dossier = join(
  root,
  "audits/weth/calldata-weth/0x20de898a28022b1678a43f6c2ee75d3dd700ddfbd48f7770897c05472871dae7",
);
const audit = JSON.parse(readFileSync(join(dossier, "audit.json"), "utf8"));
const wrapper = JSON.parse(readFileSync(join(dossier, audit.attestation.file), "utf8"));
const validationOptions = {
  auditorId: audit.auditor.id,
  descriptorHash: audit.descriptor.hash.value,
  reviewedAt: audit.reviewedAt,
  expectedUID: audit.attestation.uid,
  schemaUID: audit.attestation.schemaUID,
};

const valid = validateEasAttestation(wrapper, validationOptions);
assert.deepEqual(valid.errors, []);
assert.equal(valid.details.uid, audit.attestation.uid);
assert.equal(valid.details.attestedAt, "2026-08-28T08:19:30Z");

function expectInvalidExport(mutate, expectedError) {
  const candidate = structuredClone(wrapper);
  const options = structuredClone(validationOptions);
  mutate(candidate, options);
  const result = validateEasAttestation(candidate, options);
  assert(
    result.errors.some((message) => message.includes(expectedError)),
    `expected ${expectedError}, received ${JSON.stringify(result.errors)}`,
  );
  assert.equal(result.details, null);
}

const otherAddress = "0x1111111111111111111111111111111111111111";
const zeroHash = `0x${"00".repeat(32)}`;
for (const [mutate, expectedError] of [
  [(candidate) => { delete candidate.sig; }, "expected an unmodified EAS offchain export"],
  [(candidate) => { candidate.signer = otherAddress; }, "wrapper signer does not match audit auditor ID"],
  [(candidate) => { candidate.sig.domain.chainId = "11155111"; }, "EAS domain is not the canonical Ethereum mainnet domain"],
  [(candidate) => { candidate.sig.message.version = 1; }, "offchain attestation must use EAS version 2"],
  [(candidate) => { candidate.sig.primaryType = "Attestation"; }, "EAS primary type must be Attest"],
  [(candidate) => { candidate.sig.types.Attest.pop(); }, "EAS Attest type definition is not canonical"],
  [(candidate) => { candidate.sig.message.schema = zeroHash; }, "EAS schema UID does not match the canonical ERC-8176 schema"],
  [(candidate) => { candidate.sig.message.data = zeroHash; }, "EAS data does not equal the ERC-8176 descriptor hash"],
  [(candidate) => { candidate.sig.message.recipient = otherAddress; }, "ERC-8176 attestation recipient must be the zero address"],
  [(candidate) => { candidate.sig.message.expirationTime = "1"; }, "ERC-8176 attestation must not expire"],
  [(candidate) => { candidate.sig.message.refUID = audit.attestation.uid; }, "ERC-8176 attestation must not reference another attestation"],
  [(candidate) => { candidate.sig.message.revocable = false; }, "offchain attestation must be revocable"],
  [(_candidate, options) => { options.reviewedAt = "2026-08-28T08:19:31Z"; }, "offchain attestation predates the completed review"],
  [(_candidate, options) => { options.expectedUID = zeroHash; }, "offchain attestation UID does not match audit.json"],
]) {
  expectInvalidExport(mutate, expectedError);
}
expectInvalidExport((candidate, options) => {
  candidate.sig.uid = zeroHash;
  options.expectedUID = zeroHash;
}, "offchain attestation UID is");
expectInvalidExport((candidate) => {
  candidate.sig.signature.v = Number(candidate.sig.signature.v) === 27 ? 28 : 27;
}, "signature recovers");

const report = readFileSync(join(dossier, "REPORT.md"), "utf8");
assert.deepEqual(validateAttestationReport(report, audit), []);
for (const [label, value] of [
  ["attester", audit.auditor.id.split(":").at(-1)],
  ["ERC-8176 schema UID", audit.attestation.schemaUID],
  ["attestation UID", audit.attestation.uid],
  ["descriptor hash", audit.descriptor.hash.value],
  ["raw attestation file", audit.attestation.file],
]) {
  const missingValue = report.replaceAll(value, "omitted");
  const errors = validateAttestationReport(missingValue, audit);
  assert(errors.includes(`approved report does not identify the ${label}: ${value}`));
}

process.stdout.write("Attestation validation tests passed.\n");
