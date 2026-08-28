#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { fixtureChainIds } from "./audit-inputs.mjs";
import {
  effectiveAuditStatus,
  listAuditEventFiles,
  sortAuditEvents,
} from "./audit-events.mjs";
import {
  FunctionFragment,
  Transaction,
  getAddress,
  keccak256,
  toUtf8Bytes,
} from "ethers";
import {
  ERC8176_SCHEMA_UID,
  validateAttestationReport,
  validateEasAttestation,
} from "./eas-attestation.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const auditsRoot = join(root, "audits");
const errors = [];

function findAuditFiles(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...findAuditFiles(path));
    else if (entry.name === "audit.json") files.push(path);
  }
  return files.sort();
}

function parseJson(path, label = path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`${label}: invalid JSON (${error.message})`);
    return null;
  }
}

function fail(path, message) {
  errors.push(`${path}: ${message}`);
}

function compileSchema(filename) {
  const schema = parseJson(join(root, "schemas", filename), filename);
  if (!schema) return null;
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

const validateAudit = compileSchema("audit-result-v1.schema.json");
const validateDeployments = compileSchema("deployments-v1.schema.json");
const validateDependencies = compileSchema("dependencies-v1.schema.json");
const validateTests = compileSchema("tests-v1.schema.json");
const validateTestResults = compileSchema("test-results-v1.schema.json");
const validateChainInfo = compileSchema("chain-info-v1.schema.json");
const validateAuditEvent = compileSchema("audit-event-v1.schema.json");
if (
  !validateAudit
  || !validateDeployments
  || !validateDependencies
  || !validateTests
  || !validateTestResults
  || !validateChainInfo
  || !validateAuditEvent
) {
  process.exit(1);
}

function validateWith(schema, value, path) {
  if (schema(value)) return true;
  for (const error of schema.errors ?? []) {
    fail(path, `schema ${error.instancePath || "/"} ${error.message}`);
  }
  return false;
}

function resolveInside(directory, reference, sourcePath) {
  const path = resolve(directory, reference);
  if (path !== directory && !path.startsWith(`${directory}${sep}`)) {
    fail(sourcePath, `reference escapes the audit dossier: ${reference}`);
    return null;
  }
  return path;
}

function resolveInsideRepository(directory, reference, sourcePath) {
  const path = resolve(directory, reference);
  if (path !== root && !path.startsWith(`${root}${sep}`)) {
    fail(sourcePath, `reference escapes the repository: ${reference}`);
    return null;
  }
  return path;
}

function calculateDescriptorHash(descriptorPath, auditPath) {
  const result = spawnSync("clearsig", ["descriptor-hash", descriptorPath], { encoding: "utf8" });
  if (result.error?.code === "ENOENT") {
    fail(auditPath, "clearsig is required to recompute ERC-8176 descriptor hashes");
    return null;
  }
  if (result.status !== 0) {
    fail(auditPath, `clearsig descriptor-hash failed: ${(result.stderr || result.stdout).trim()}`);
    return null;
  }
  const match = `${result.stdout}\n${result.stderr}`.match(/0x[0-9a-fA-F]{64}/);
  if (!match) {
    fail(auditPath, "clearsig output did not contain a descriptor hash");
    return null;
  }
  return match[0].toLowerCase();
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
    .join(",")}}`;
}

function contentHash(value) {
  return keccak256(toUtf8Bytes(canonicalize(value))).toLowerCase();
}

function verifySnapshotHash(snapshotPath, expected, evidencePath) {
  if (!existsSync(snapshotPath)) {
    fail(evidencePath, `missing snapshot ${basename(snapshotPath)}`);
    return null;
  }
  const value = parseJson(snapshotPath);
  if (!value) return null;
  const actual = contentHash(value);
  if (actual !== expected.toLowerCase()) {
    fail(evidencePath, `${basename(snapshotPath)} hash is ${actual}, expected ${expected}`);
  }
  return value;
}

function verifyFileHash(snapshotPath, expected, evidencePath) {
  if (!existsSync(snapshotPath)) {
    fail(evidencePath, `missing snapshot ${basename(snapshotPath)}`);
    return;
  }
  const actual = `0x${createHash("sha256").update(readFileSync(snapshotPath)).digest("hex")}`;
  if (actual !== expected.toLowerCase()) {
    fail(evidencePath, `${basename(snapshotPath)} SHA-256 is ${actual}, expected ${expected}`);
  }
}

function verifyAttestation(audit, dossier, auditPath) {
  const attestationPath = resolveInside(dossier, audit.attestation.file, auditPath);
  if (!attestationPath) return;
  if (!existsSync(attestationPath)) {
    fail(auditPath, `missing attestation file ${audit.attestation.file}`);
    return null;
  }
  const wrapper = parseJson(attestationPath, attestationPath);
  if (!wrapper) return null;
  if (audit.attestation.schemaUID.toLowerCase() !== ERC8176_SCHEMA_UID) {
    fail(attestationPath, "audit.json does not identify the canonical ERC-8176 EAS schema");
  }
  const result = validateEasAttestation(wrapper, {
    auditorId: audit.auditor.id,
    descriptorHash: audit.descriptor.hash.value,
    reviewedAt: audit.reviewedAt,
    expectedUID: audit.attestation.uid,
    schemaUID: audit.attestation.schemaUID,
  });
  for (const message of result.errors) fail(attestationPath, message);
  return result.details;
}

function verifyAttestationReport(audit, details, reportPath) {
  if (!details || !reportPath || !existsSync(reportPath)) return;
  const report = readFileSync(reportPath, "utf8");
  for (const message of validateAttestationReport(report, audit)) fail(reportPath, message);
}

function sameMembers(left, right) {
  if (left.size !== right.size) return false;
  return [...left].every((item) => right.has(item));
}

function verifyUnique(values, normalize, path, label) {
  const seen = new Set();
  for (const value of values) {
    const key = normalize(value);
    if (seen.has(key)) fail(path, `duplicate ${label}: ${value}`);
    seen.add(key);
  }
}

function containsPlaceholder(value) {
  return typeof value === "string"
    ? value.includes("REPLACE_")
    : JSON.stringify(value).includes("REPLACE_");
}

function eventFilenamePrefix(recordedAt, eventPath) {
  const timestamp = new Date(recordedAt);
  if (Number.isNaN(timestamp.getTime())) return null;
  const canonical = timestamp.toISOString().replace(/\.000Z$/, "Z");
  if (canonical !== recordedAt) {
    fail(eventPath, "recordedAt must use canonical UTC seconds without fractional seconds");
  }
  return canonical.replaceAll("-", "").replaceAll(":", "");
}

function timestampValue(value) {
  return new Date(value).getTime();
}

function verifyAuditEvents(audit, dossier, auditPath, attestationDetails) {
  const eventsDirectory = join(dossier, "events");
  if (existsSync(eventsDirectory)) {
    for (const entry of readdirSync(eventsDirectory, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        fail(eventsDirectory, `unexpected event entry ${entry.name}`);
      }
    }
  }

  const events = [];
  for (const eventPath of listAuditEventFiles(dossier)) {
    const event = parseJson(eventPath);
    if (!event || !validateWith(validateAuditEvent, event, eventPath)) continue;
    events.push(event);

    if (containsPlaceholder(event)) {
      fail(eventPath, "event contains an unresolved REPLACE_ placeholder");
    }
    const expectedName = `${eventFilenamePrefix(event.recordedAt, eventPath)}-${event.type}.json`;
    if (basename(eventPath) !== expectedName) {
      fail(eventPath, `event filename must be ${expectedName}`);
    }
    if (["draft", "ready-for-attestation"].includes(audit.status)) {
      fail(eventPath, `${audit.status} audits cannot have lifecycle events`);
    }
    if (event.descriptorHash.toLowerCase() !== audit.descriptor.hash.value.toLowerCase()) {
      fail(eventPath, "descriptorHash does not match audit.json");
    }
    if (event.auditor.toLowerCase() !== audit.auditor.id.toLowerCase()) {
      fail(eventPath, "auditor does not match audit.json");
    }
    if (audit.reviewedAt && timestampValue(event.recordedAt) < timestampValue(audit.reviewedAt)) {
      fail(eventPath, "event predates the completed audit");
    }

    const reviewedFormats = new Set(audit.scope.formatsReviewed.map((format) => format.signature));
    for (const format of event.affectedFormats ?? []) {
      if (!reviewedFormats.has(format)) {
        fail(eventPath, `affected format is outside the audit scope: ${format}`);
      }
    }
    const knownDeployments = new Set(audit.scope.deployments.map((deployment) => deployment.toLowerCase()));
    for (const limitation of audit.limitations) {
      for (const deployment of limitation.deployments ?? []) {
        knownDeployments.add(deployment.toLowerCase());
      }
    }
    for (const deployment of event.affectedDeployments ?? []) {
      if (!knownDeployments.has(deployment.toLowerCase())) {
        fail(eventPath, `affected deployment is not recorded by the audit: ${deployment}`);
      }
    }

    if (["revocation", "supersession"].includes(event.type) && audit.status !== "approved") {
      fail(eventPath, `${event.type} events require an approved base audit`);
    }

    if (event.type === "revocation") {
      if (event.revocation.attestationUID.toLowerCase() !== audit.attestation?.uid?.toLowerCase()) {
        fail(eventPath, "revoked attestation UID does not match audit.json");
      }
      if (timestampValue(event.revocation.revokedAt) > timestampValue(event.recordedAt)) {
        fail(eventPath, "revokedAt cannot be later than recordedAt");
      }
      if (
        attestationDetails
        && event.revocation.chainId !== attestationDetails.chainId
      ) {
        fail(eventPath, "EAS revocation chain does not match the attestation domain");
      }
      if (
        attestationDetails?.contract
        && event.revocation.contract.toLowerCase() !== attestationDetails.contract
      ) {
        fail(eventPath, "EAS revocation contract does not match the attestation domain");
      }
    }

    if (event.type === "supersession") {
      const replacementDossier = resolveInside(root, event.replacement.dossier, eventPath);
      const replacementAuditPath = replacementDossier
        ? join(replacementDossier, "audit.json")
        : null;
      if (
        replacementDossier
        && replacementDossier !== auditsRoot
        && !replacementDossier.startsWith(`${auditsRoot}${sep}`)
      ) {
        fail(eventPath, "replacement dossier must be inside audits/");
      } else if (replacementDossier === dossier) {
        fail(eventPath, "an audit cannot supersede itself");
      } else if (!replacementAuditPath || !existsSync(replacementAuditPath)) {
        fail(eventPath, "replacement dossier does not contain audit.json");
      } else {
        const replacementAudit = parseJson(replacementAuditPath);
        if (replacementAudit && validateWith(validateAudit, replacementAudit, replacementAuditPath)) {
          if (replacementAudit.status !== "approved") {
            fail(eventPath, "replacement dossier must contain an approved audit");
          }
          if (
            replacementAudit.descriptor.hash.value.toLowerCase()
            !== event.replacement.descriptorHash.toLowerCase()
          ) {
            fail(eventPath, "replacement descriptor hash does not match its audit.json");
          }
          if (
            event.replacement.attestationUID
            && replacementAudit.attestation?.uid?.toLowerCase()
              !== event.replacement.attestationUID.toLowerCase()
          ) {
            fail(eventPath, "replacement attestation UID does not match its audit.json");
          }
          if (timestampValue(replacementAudit.reviewedAt) > timestampValue(event.recordedAt)) {
            fail(eventPath, "supersession event predates the replacement audit");
          }
        }
      }
    }

    if (event.type === "correction") {
      for (const reference of event.correction.affectedFiles) {
        const affectedPath = resolveInside(root, reference, eventPath);
        if (
          affectedPath
          && affectedPath !== dossier
          && !affectedPath.startsWith(`${dossier}${sep}`)
        ) {
          fail(eventPath, `corrected file must be inside the audit dossier: ${reference}`);
        } else if (affectedPath && !existsSync(affectedPath)) {
          fail(eventPath, `corrected file does not exist: ${reference}`);
        }
      }
    }
  }

  let sawSupersession = false;
  let sawRevocation = false;
  for (const event of sortAuditEvents(events)) {
    if (event.type === "supersession") {
      if (sawSupersession) fail(auditPath, "audit has more than one supersession event");
      if (sawRevocation) fail(auditPath, "a revoked audit cannot later be superseded");
      sawSupersession = true;
    }
    if (event.type === "revocation") {
      if (sawRevocation) fail(auditPath, "audit has more than one revocation event");
      sawRevocation = true;
    }
  }

  return {
    events,
    effectiveStatus: effectiveAuditStatus(audit.status, events),
  };
}

function jsonPointerValue(value, pointer) {
  let current = value;
  for (const token of pointer.slice(1).split("/")) {
    const key = token.replaceAll("~1", "/").replaceAll("~0", "~");
    if (current === null || typeof current !== "object" || !Object.hasOwn(current, key)) {
      return { found: false };
    }
    current = current[key];
  }
  return { found: true, value: current };
}

function verifySource(source, path, label) {
  if (source.sourcify.status === "not-verified") {
    fail(path, `${label} is not verified through Sourcify`);
  }
}

function currentPolicyVersion() {
  const policyPath = join(root, "auditor", "AUDIT_POLICY.md");
  const match = readFileSync(policyPath, "utf8").match(/^Policy version: `([^`]+)`$/m);
  if (!match) {
    fail(policyPath, "missing Policy version line");
    return null;
  }
  return match[1];
}

function archivedPolicyExists(version) {
  const policyPath = join(root, "auditor", "policies", `${version}.md`);
  if (!existsSync(policyPath)) return false;
  const match = readFileSync(policyPath, "utf8").match(/^Policy version: `([^`]+)`$/m);
  if (!match) {
    fail(policyPath, "missing Policy version line");
    return false;
  }
  if (match[1] !== version) {
    fail(policyPath, `records policy version ${match[1]}, expected ${version}`);
    return false;
  }
  return true;
}

function descriptorFormats(descriptor) {
  return new Set(Object.keys(descriptor?.display?.formats ?? {}));
}

function descriptorDeployments(descriptor) {
  const contract = descriptor?.context?.contract;
  const values = contract?.deployments
    ?? contract?.factory?.deployments
    ?? descriptor?.context?.eip712?.deployments;
  if (!Array.isArray(values)) return null;
  return new Set(values.map((item) => `eip155:${item.chainId}:${item.address}`.toLowerCase()));
}

function formatMatchesPrimaryType(signature, primaryType) {
  return signature === primaryType
    || signature.startsWith(`${primaryType}(`)
    || signature.includes(`:${primaryType}(`);
}

function functionSelector(signature) {
  return FunctionFragment.from(signature).selector.toLowerCase();
}

function descriptorPathValue(descriptor, reference) {
  if (!reference.startsWith("$.")) return undefined;
  let current = descriptor;
  for (const key of reference.slice(2).split(".")) {
    if (!current || typeof current !== "object" || !Object.hasOwn(current, key)) return undefined;
    current = current[key];
  }
  return current;
}

function containsContainerValueReference(value, descriptor, seenReferences = new Set()) {
  if (typeof value === "string") {
    return value === "@.value" || value.includes("{@.value}");
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsContainerValueReference(item, descriptor, seenReferences));
  }
  if (value && typeof value === "object") {
    if (typeof value.$ref === "string" && !seenReferences.has(value.$ref)) {
      seenReferences.add(value.$ref);
      const referenced = descriptorPathValue(descriptor, value.$ref);
      if (containsContainerValueReference(referenced, descriptor, seenReferences)) return true;
    }
    return Object.values(value).some((item) => (
      containsContainerValueReference(item, descriptor, seenReferences)
    ));
  }
  return false;
}

function verifyTestCoverage(tests, audit, descriptor, testsPath, requireApprovalCoverage) {
  const descriptions = new Set();
  const calldataTests = new Map();
  const eip712Tests = new Map();
  const reviewedSelectors = new Map();

  for (const test of tests.tests) {
    if (descriptions.has(test.description)) {
      fail(testsPath, `duplicate test description: ${test.description}`);
    }
    descriptions.add(test.description);

    if (test.rawTx) {
      try {
        const transaction = Transaction.from(test.rawTx);
        const selector = transaction.data.slice(0, 10).toLowerCase();
        const entries = calldataTests.get(selector) ?? [];
        entries.push({ test, transaction });
        calldataTests.set(selector, entries);
      } catch (error) {
        fail(testsPath, `could not decode rawTx for ${test.description} (${error.message})`);
      }
    } else {
      const entries = eip712Tests.get(test.data.primaryType) ?? [];
      entries.push(test);
      eip712Tests.set(test.data.primaryType, entries);
    }
  }

  const isCalldata = Boolean(descriptor?.context?.contract);
  for (const format of audit.scope.formatsReviewed) {
    if (isCalldata) {
      let expected;
      try {
        expected = functionSelector(format.signature);
      } catch (error) {
        fail(testsPath, `could not derive selector for ${format.signature} (${error.message})`);
        continue;
      }
      if (reviewedSelectors.has(expected)) {
        fail(
          testsPath,
          `${format.signature} collides with ${reviewedSelectors.get(expected)} at selector ${expected}`,
        );
      } else {
        reviewedSelectors.set(expected, format.signature);
      }
      if (!format.selector) {
        fail(testsPath, `reviewed calldata format ${format.signature} is missing its selector in audit.json`);
      } else if (format.selector.toLowerCase() !== expected) {
        fail(testsPath, `${format.signature} selector is ${format.selector}, expected ${expected}`);
      }
      const matching = calldataTests.get(expected) ?? [];
      if (!matching.length) {
        fail(testsPath, `no test covers ${format.signature}`);
        continue;
      }
      if (
        requireApprovalCoverage
        && !matching.some(({ test }) => test.caseType === "typical" && test.expected)
      ) {
        fail(testsPath, `no typical successful test covers ${format.signature}`);
      }
      const definition = descriptor?.display?.formats?.[format.signature];
      if (requireApprovalCoverage && containsContainerValueReference(definition, descriptor)) {
        if (!matching.some(({ transaction }) => transaction.value === 0n)) {
          fail(testsPath, `${format.signature} uses @.value but has no zero-value test`);
        }
        if (!matching.some(({ transaction }) => transaction.value > 0n)) {
          fail(testsPath, `${format.signature} uses @.value but has no nonzero-value test`);
        }
      }
    } else {
      const matching = [...eip712Tests]
        .filter(([type]) => formatMatchesPrimaryType(format.signature, type))
        .flatMap(([, entries]) => entries);
      if (!matching.length) {
        fail(testsPath, `no EIP-712 test covers ${format.signature}`);
      } else if (
        requireApprovalCoverage
        && !matching.some((test) => test.caseType === "typical" && test.expected)
      ) {
        fail(testsPath, `no typical successful EIP-712 test covers ${format.signature}`);
      }
    }
  }
}

function verifyPreservedTestResults(tests, results, audit, resultsPath) {
  if (results.runner !== audit.testing.tool) {
    fail(resultsPath, `result runner ${results.runner} does not match audit.json tool ${audit.testing.tool}`);
  }
  if (!audit.testing.toolVersion.includes(results.implementation)) {
    fail(resultsPath, `result implementation ${results.implementation} is absent from audit.json toolVersion`);
  }
  const fixturesByDescription = new Map(
    tests.tests.map((test) => [test.description, test]),
  );
  const resultsByDescription = new Map();
  for (const result of results.cases) {
    if (resultsByDescription.has(result.description)) {
      fail(resultsPath, `duplicate result description: ${result.description}`);
    }
    resultsByDescription.set(result.description, result);
  }

  if (!sameMembers(new Set(fixturesByDescription.keys()), new Set(resultsByDescription.keys()))) {
    fail(resultsPath, "preserved results must contain exactly one case for every test fixture");
  }

  for (const [description, fixture] of fixturesByDescription) {
    const result = resultsByDescription.get(description);
    if (!result) continue;
    if (fixture.expected && result.rendered && !isDeepStrictEqual(result.rendered, fixture.expected)) {
      fail(resultsPath, `rendered output does not match the fixture for ${description}`);
    }
  }

  const everyCasePassed = results.cases.length === tests.tests.length
    && results.cases.every((result) => result.status === "pass");
  if (audit.testing.result === "pass" && !everyCasePassed) {
    fail(resultsPath, "audit.json records a test pass, but one or more preserved cases did not pass");
  }
  if (audit.testing.result === "fail" && everyCasePassed) {
    fail(resultsPath, "audit.json records a test failure, but every preserved case passed");
  }
}

function verifyChainInfoSnapshot(chainInfo, snapshot, tests, testsPath, snapshotPath) {
  if (chainInfo.source !== snapshot.source) {
    fail(snapshotPath, "chain information source does not match audit.json");
  }
  const declaredIds = new Set(chainInfo.chainIds);
  const entryIds = new Set(chainInfo.entries.map((entry) => entry.chainId));
  if (entryIds.size !== chainInfo.entries.length) {
    fail(snapshotPath, "chain information contains duplicate entries");
  }
  if (!sameMembers(declaredIds, entryIds)) {
    fail(snapshotPath, "chainIds and entries must identify the same chains");
  }
  if (tests) {
    try {
      const expectedIds = new Set(fixtureChainIds(tests));
      if (!sameMembers(declaredIds, expectedIds)) {
        fail(snapshotPath, "chain information must cover exactly the fixture and explicitly declared chain IDs");
      }
    } catch (error) {
      fail(testsPath, error.message);
    }
  }
}

const policyVersion = currentPolicyVersion();
const auditFiles = findAuditFiles(auditsRoot);
for (const auditPath of auditFiles) {
  const audit = parseJson(auditPath);
  if (!audit || !validateWith(validateAudit, audit, auditPath)) continue;
  const dossier = dirname(auditPath);
  const hash = audit.descriptor.hash.value.toLowerCase();
  const approved = audit.status === "approved";
  const ready = audit.status === "ready-for-attestation";
  const reviewComplete = approved || ready;
  const draft = audit.status === "draft";

  verifyUnique(
    audit.scope.deployments,
    (deployment) => deployment.toLowerCase(),
    auditPath,
    "scope deployment",
  );
  verifyUnique(
    audit.scope.formatsReviewed.map((format) => format.signature),
    (signature) => signature,
    auditPath,
    "reviewed format",
  );
  verifyUnique(
    audit.findings.map((finding) => finding.id),
    (id) => id.toLowerCase(),
    auditPath,
    "finding ID",
  );
  verifyUnique(
    audit.limitations.map((limitation) => limitation.id),
    (id) => id.toLowerCase(),
    auditPath,
    "limitation ID",
  );

  const profilePath = resolveInsideRepository(dossier, audit.auditor.profile, auditPath);
  if (profilePath && !existsSync(profilePath)) {
    fail(auditPath, `missing auditor profile ${audit.auditor.profile}`);
  } else if (profilePath) {
    const profile = parseJson(profilePath);
    if (
      profile
      && (
        typeof profile.id !== "string"
        || profile.id.toLowerCase() !== audit.auditor.id.toLowerCase()
      )
    ) {
      fail(profilePath, "profile ID does not match the audit auditor ID");
    }
    if (profile && (typeof profile.name !== "string" || !profile.name.trim())) {
      fail(profilePath, "auditor profile must contain a non-empty name");
    }
  }

  if (basename(dossier).toLowerCase() !== hash) {
    fail(auditPath, "parent directory must be the full lowercase descriptor hash");
  }
  if (
    !draft
    && policyVersion
    && audit.policyVersion !== policyVersion
    && !archivedPolicyExists(audit.policyVersion)
  ) {
    fail(auditPath, `unknown policyVersion ${audit.policyVersion}; expected the current or an archived policy`);
  }

  const descriptorPath = resolveInside(dossier, audit.descriptor.snapshot, auditPath);
  const deploymentsPath = resolveInside(dossier, audit.evidence.deployments, auditPath);
  const dependenciesPath = resolveInside(dossier, audit.evidence.dependencies, auditPath);
  const reportPath = resolveInside(dossier, audit.evidence.report, auditPath);
  const testsPath = resolveInside(dossier, audit.testing.fixture, auditPath);
  const testResultsPath = audit.testing.results
    ? resolveInside(dossier, audit.testing.results, auditPath)
    : null;
  const externalDataPaths = (audit.testing.externalData ?? []).map((snapshot) => ({
    snapshot,
    path: resolveInside(dossier, snapshot.snapshot, auditPath),
  }));
  const descriptorSchemaPath = audit.descriptor.schema
    ? resolveInside(dossier, audit.descriptor.schema.snapshot, auditPath)
    : null;
  const requiredPaths = [
    descriptorPath,
    descriptorSchemaPath,
    deploymentsPath,
    dependenciesPath,
    reportPath,
    testsPath,
    testResultsPath,
    ...externalDataPaths.map((item) => item.path),
  ].filter(Boolean);
  for (const path of requiredPaths) {
    if (!existsSync(path)) fail(auditPath, `missing referenced evidence ${basename(path)}`);
  }

  const descriptor = descriptorPath && existsSync(descriptorPath) ? parseJson(descriptorPath) : null;
  const deployments = deploymentsPath && existsSync(deploymentsPath) ? parseJson(deploymentsPath) : null;
  const dependencies = dependenciesPath && existsSync(dependenciesPath) ? parseJson(dependenciesPath) : null;
  const tests = testsPath && existsSync(testsPath) ? parseJson(testsPath) : null;
  const testResults = testResultsPath && existsSync(testResultsPath)
    ? parseJson(testResultsPath)
    : null;

  if (reportPath && existsSync(reportPath)) {
    const report = readFileSync(reportPath, "utf8");
    const reportedStatus = report.match(/^Status: \*\*([^*]+)\*\*$/m)?.[1];
    if (!reportedStatus) {
      fail(reportPath, "report must contain a Result status line");
    } else if (reportedStatus !== audit.status) {
      fail(reportPath, `report status ${reportedStatus} does not match audit.json status ${audit.status}`);
    }
  }

  for (const { snapshot, path } of externalDataPaths) {
    if (!path) continue;
    verifyFileHash(path, snapshot.hash.value, auditPath);
    if (snapshot.format === "chain-info-v1" && existsSync(path)) {
      const chainInfo = parseJson(path);
      if (chainInfo && validateWith(validateChainInfo, chainInfo, path)) {
        verifyChainInfoSnapshot(chainInfo, snapshot, tests, testsPath, path);
      }
    }
  }

  if (!draft) {
    for (const [label, value] of [
      ["audit.json", audit],
      ["deployments.json", deployments],
      ["dependencies.json", dependencies],
      ["tests.json", tests],
      ["test-results.json", testResults],
    ]) {
      if (value && containsPlaceholder(value)) {
        fail(auditPath, `${label} contains an unresolved REPLACE_ placeholder`);
      }
    }
    if (reportPath && existsSync(reportPath) && containsPlaceholder(readFileSync(reportPath, "utf8"))) {
      fail(reportPath, "report contains an unresolved REPLACE_ placeholder");
    }
  }

  const deploymentsValid = deployments
    ? validateWith(validateDeployments, deployments, deploymentsPath)
    : false;
  const dependenciesValid = dependencies
    ? validateWith(validateDependencies, dependencies, dependenciesPath)
    : false;

  let effectiveDescriptor = descriptor;
  let effectiveDescriptorPath = descriptorPath;
  if (descriptor?.includes && dependenciesValid && dependencies.resolvedDescriptor) {
    const resolvedPath = resolveInside(dossier, dependencies.resolvedDescriptor.snapshot, dependenciesPath);
    if (resolvedPath) {
      const resolved = verifySnapshotHash(
        resolvedPath,
        dependencies.resolvedDescriptor.hash.value,
        dependenciesPath,
      );
      if (resolved) {
        effectiveDescriptor = resolved;
        effectiveDescriptorPath = resolvedPath;
      }
    }
  }

  if (audit.descriptor.schema && descriptorSchemaPath && existsSync(descriptorSchemaPath)) {
    const declaredSchema = verifySnapshotHash(
      descriptorSchemaPath,
      audit.descriptor.schema.hash.value,
      auditPath,
    );
    if (descriptor && audit.descriptor.schema.declaredReference !== descriptor.$schema) {
      fail(auditPath, "recorded schema reference does not match descriptor.$schema");
    }
    if (declaredSchema?.version !== audit.descriptor.erc7730Version) {
      fail(auditPath, "schema snapshot version does not match descriptor.erc7730Version");
    }
    if (declaredSchema && effectiveDescriptor) {
      if (!`${declaredSchema.$schema ?? ""}`.includes("2020-12")) {
        fail(auditPath, `unsupported JSON Schema draft: ${declaredSchema.$schema ?? "missing"}`);
      } else {
        try {
          const ajv = new Ajv2020({ allErrors: true, strict: false });
          addFormats(ajv);
          ajv.addFormat("eip155", {
            type: "number",
            validate: (value) => Number.isSafeInteger(value) && value >= 0,
          });
          ajv.addFormat("eip55", {
            type: "string",
            validate: (value) => {
              try {
                getAddress(value);
                return true;
              } catch {
                return false;
              }
            },
          });
          const validateDescriptor = ajv.compile(declaredSchema);
          validateWith(validateDescriptor, effectiveDescriptor, descriptorPath);
        } catch (error) {
          fail(auditPath, `could not compile declared ERC-7730 schema (${error.message})`);
        }
      }
    }
  }

  if (descriptor) {
    const declaredMajor = typeof descriptor.$schema === "string"
      ? descriptor.$schema.match(/erc7730-v([0-9]+)\.schema\.json/)?.[1]
      : undefined;
    const recordedMajor = audit.descriptor.erc7730Version.split(".")[0];
    if (declaredMajor && declaredMajor !== recordedMajor) {
      fail(auditPath, `descriptor declares v${declaredMajor}, audit records ${audit.descriptor.erc7730Version}`);
    }

    if (descriptor.includes) {
      if (reviewComplete && !dependencies?.resolvedDescriptor) {
        fail(dependenciesPath, "completed review of a descriptor with includes requires a resolvedDescriptor snapshot");
      }
      if (reviewComplete && !dependencies?.dependencies?.some(
        (item) => item.declaredReference === descriptor.includes,
      )) {
        fail(dependenciesPath, `missing dependency record for ${descriptor.includes}`);
      }
      if (reviewComplete && dependencies?.resolvedDescriptor?.hash.value.toLowerCase() !== hash) {
        fail(dependenciesPath, "resolvedDescriptor hash does not match audit.json");
      }
      if (reviewComplete && effectiveDescriptor?.includes) {
        fail(dependenciesPath, "resolvedDescriptor still contains an includes reference");
      }
    } else if (reviewComplete && dependencies?.dependencies?.length) {
      fail(dependenciesPath, "descriptor has no includes reference but dependencies are recorded");
    }

    if (!descriptor.includes || effectiveDescriptorPath !== descriptorPath) {
      const calculated = calculateDescriptorHash(effectiveDescriptorPath, auditPath);
      if (calculated && calculated !== hash) {
        fail(auditPath, `descriptor hash is ${calculated}, expected ${hash}`);
      }
    }
  }

  if (deploymentsValid) {
    if (deployments.descriptorHash.toLowerCase() !== hash) {
      fail(deploymentsPath, "descriptorHash does not match audit.json");
    }
    const evidenceIds = new Set();
    for (const deployment of deployments.deployments) {
      const deploymentId = deployment.id.toLowerCase();
      if (evidenceIds.has(deploymentId)) fail(deploymentsPath, `duplicate deployment ${deployment.id}`);
      evidenceIds.add(deploymentId);
    }

    const scopeIds = new Set(audit.scope.deployments.map((item) => item.toLowerCase()));
    for (const deployment of scopeIds) {
      if (!evidenceIds.has(deployment)) fail(deploymentsPath, `missing evidence for ${deployment}`);
    }
    if (reviewComplete && !sameMembers(scopeIds, evidenceIds)) {
      fail(deploymentsPath, "completed audit scope and deployment evidence must contain the same deployments");
    }

    if (reviewComplete) {
      if (!deployments.capturedAt) {
        fail(deploymentsPath, "completed deployment evidence must record capturedAt");
      }
      const reviewedFormats = new Set(audit.scope.formatsReviewed.map((item) => item.signature));
      for (const deployment of deployments.deployments) {
        verifySource(deployment.sourceVerification, deploymentsPath, deployment.id);
        if (deployment.preFilter.startsWith("fail-")) {
          fail(deploymentsPath, `${deployment.id} did not pass the deployment pre-filter`);
        }
        if (deployment.proxy.type === "unknown" || deployment.proxy.upgradeability === "unknown") {
          fail(deploymentsPath, `${deployment.id} has unresolved proxy or upgradeability status`);
        }
        if (deployment.proxy.type === "none" && deployment.preFilter !== "pass-direct") {
          fail(deploymentsPath, `${deployment.id} is a direct deployment but has pre-filter result ${deployment.preFilter}`);
        }
        if (
          !["none", "unknown"].includes(deployment.proxy.type)
          && deployment.preFilter !== "pass-bindable-proxy"
        ) {
          fail(deploymentsPath, `${deployment.id} is a proxy but has pre-filter result ${deployment.preFilter}`);
        }
        for (const implementation of deployment.proxy.implementations ?? []) {
          verifySource(
            implementation.sourceVerification,
            deploymentsPath,
            `${deployment.id} implementation ${implementation.address}`,
          );
        }

        if (deployment.proxy.type === "eip2535") {
          const expectedSelectors = new Map();
          for (const format of audit.scope.formatsReviewed) {
            try {
              const selector = functionSelector(format.signature);
              if (expectedSelectors.has(selector)) {
                fail(
                  deploymentsPath,
                  `${format.signature} collides with ${expectedSelectors.get(selector)} at selector ${selector}`,
                );
              } else {
                expectedSelectors.set(selector, format.signature);
              }
            } catch (error) {
              fail(
                deploymentsPath,
                `could not derive selector for ${format.signature} (${error.message})`,
              );
            }
          }
          const mappedSelectors = new Map();
          for (const facet of deployment.proxy.implementations ?? []) {
            for (const selector of facet.selectors ?? []) {
              const normalized = selector.toLowerCase();
              if (!expectedSelectors.has(normalized)) {
                fail(
                  deploymentsPath,
                  `${deployment.id} facet ${facet.address} maps unreviewed selector ${selector}`,
                );
              }
              if (mappedSelectors.has(normalized)) {
                fail(
                  deploymentsPath,
                  `${deployment.id} selector ${selector} is mapped to multiple facets`,
                );
              }
              mappedSelectors.set(normalized, facet.address);
            }
          }
          for (const [selector, format] of expectedSelectors) {
            if (!mappedSelectors.has(selector)) {
              fail(deploymentsPath, `${deployment.id} has no facet mapping for ${format} (${selector})`);
            }
          }
        }

        const bindings = new Map();
        for (const binding of deployment.displayBindings) {
          for (const format of binding.formats) {
            if (!reviewedFormats.has(format)) {
              fail(deploymentsPath, `${deployment.id} has a display binding for unreviewed format ${format}`);
            }
            if (bindings.has(format)) {
              fail(deploymentsPath, `${deployment.id} has multiple display bindings for ${format}`);
            }
            bindings.set(format, binding);
          }
          if (binding.result === "not-enforceable") {
            fail(deploymentsPath, `${deployment.id} has an unenforceable display binding`);
          }
          for (const pointer of binding.descriptorConstraints ?? []) {
            if (!jsonPointerValue(effectiveDescriptor, pointer).found) {
              fail(deploymentsPath, `${deployment.id} constraint does not exist in descriptor: ${pointer}`);
            }
          }
        }
        for (const format of reviewedFormats) {
          if (!bindings.has(format)) {
            fail(deploymentsPath, `${deployment.id} has no display binding for ${format}`);
          }
        }

        if (deployment.proxy.upgradeability === "administrator-controlled") {
          for (const [format, binding] of bindings) {
            if (binding.result !== "enforced") {
              fail(deploymentsPath, `${deployment.id} upgrade can affect ${format} but is not descriptor-constrained`);
            }
          }
        }
        for (const stateRef of deployment.stateRefs ?? []) {
          for (const format of stateRef.affectedFormats) {
            if (bindings.get(format)?.result !== "enforced") {
              fail(deploymentsPath, `${deployment.id} mutable state for ${format} is not descriptor-constrained`);
            }
          }
        }
      }
    }
  }

  if (dependenciesValid) {
    if (dependencies.descriptorHash.toLowerCase() !== hash) {
      fail(dependenciesPath, "descriptorHash does not match audit.json");
    }
    const references = new Set();
    const declaredReferences = new Set(
      dependencies.dependencies.map((dependency) => dependency.declaredReference),
    );
    const resolvedReferences = new Set(
      dependencies.dependencies.map((dependency) => dependency.resolvedReference),
    );
    for (const dependency of dependencies.dependencies) {
      if (references.has(dependency.declaredReference)) {
        fail(dependenciesPath, `duplicate dependency ${dependency.declaredReference}`);
      }
      references.add(dependency.declaredReference);
      if (dependency.snapshot) {
        const snapshotPath = resolveInside(dossier, dependency.snapshot, dependenciesPath);
        if (snapshotPath) {
          const snapshot = verifySnapshotHash(snapshotPath, dependency.hash.value, dependenciesPath);
          if (typeof snapshot?.includes === "string") {
            let nestedReference = snapshot.includes;
            try {
              nestedReference = new URL(snapshot.includes, dependency.resolvedReference).href;
            } catch {
              // A non-URL reference can still be matched by its declared value.
            }
            if (!declaredReferences.has(snapshot.includes) && !resolvedReferences.has(nestedReference)) {
              fail(
                dependenciesPath,
                `missing transitive dependency record for ${snapshot.includes} from ${dependency.resolvedReference}`,
              );
            }
          }
        }
      }
    }
  }

  if (effectiveDescriptor) {
    const formats = descriptorFormats(effectiveDescriptor);
    const reviewed = new Set(audit.scope.formatsReviewed.map((item) => item.signature));
    for (const format of reviewed) {
      if (!formats.has(format)) fail(auditPath, `reviewed format is absent from descriptor: ${format}`);
    }
    if (reviewComplete && !sameMembers(formats, reviewed)) {
      fail(auditPath, "completed audit must review every display format in the descriptor");
    }

    const declaredDeployments = descriptorDeployments(effectiveDescriptor);
    for (const limitation of audit.limitations) {
      if (limitation.type !== "omitted-deployment" || !declaredDeployments) continue;
      for (const deployment of limitation.deployments ?? []) {
        if (declaredDeployments.has(deployment.toLowerCase())) {
          fail(
            auditPath,
            `${deployment} is declared by the descriptor and cannot be treated as an omitted-deployment limitation`,
          );
        }
      }
    }
    if (reviewComplete && declaredDeployments) {
      const scoped = new Set(audit.scope.deployments.map((item) => item.toLowerCase()));
      if (!sameMembers(declaredDeployments, scoped)) {
        fail(auditPath, "completed audit must review every deployment declared by the descriptor");
      }
    }
  }

  if (tests && (audit.testing.result !== "not-run" || reviewComplete)) {
    if (validateWith(validateTests, tests, testsPath)) {
      const declaredTestTarget = resolveInside(dossier, tests.descriptor, testsPath);
      if (declaredTestTarget && effectiveDescriptorPath && declaredTestTarget !== effectiveDescriptorPath) {
        fail(testsPath, "tests must target the exact descriptor snapshot used for review");
      }
      verifyTestCoverage(tests, audit, effectiveDescriptor, testsPath, reviewComplete);
      if (testResults && validateWith(validateTestResults, testResults, testResultsPath)) {
        verifyPreservedTestResults(tests, testResults, audit, testResultsPath);
      }
    }
  }

  if (reviewComplete) {
    if (audit.findings.some((finding) => finding.blocking && finding.status !== "resolved")) {
      fail(auditPath, "completed audits may not have unresolved blocking findings");
    }
  }

  const attestationDetails = audit.attestation
    ? verifyAttestation(audit, dossier, auditPath)
    : null;
  if (audit.attestation) verifyAttestationReport(audit, attestationDetails, reportPath);
  verifyAuditEvents(audit, dossier, auditPath, attestationDetails);
}

if (errors.length) {
  for (const error of errors) process.stderr.write(`ERROR ${error}\n`);
  process.stderr.write(`\n${errors.length} validation error(s).\n`);
  process.exit(1);
}

process.stdout.write(`Verified ${auditFiles.length} audit dossier(s).\n`);
