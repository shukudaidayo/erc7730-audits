#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { Transaction } from "ethers";
import { fixtureChainIds, loadRunnerPin } from "./audit-inputs.mjs";
import { createDossier, isSafePathComponent, shellQuote } from "./new-audit.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bytes32 = `0x${"00".repeat(32)}`;
const address = `0x${"11".repeat(20)}`;
const erc8176SchemaUID = "0xe023eef113c1670774801c34b377fdf612dd8a4d2fa92fe382e15bd91fafb5c2";

function validator(filename) {
  const schema = JSON.parse(readFileSync(join(root, "schemas", filename), "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectValid(validate, value, label) {
  if (!validate(value)) {
    throw new Error(`${label} should be valid: ${JSON.stringify(validate.errors)}`);
  }
}

function expectInvalid(validate, value, label) {
  if (validate(value)) throw new Error(`${label} should be invalid`);
}

const validateAudit = validator("audit-result-v1.schema.json");
const validateAuditTools = validator("audit-tools-v1.schema.json");
const validateDeployments = validator("deployments-v1.schema.json");
const validateDependencies = validator("dependencies-v1.schema.json");
const validateTestsV1 = validator("tests-v1.schema.json");
const validateTestsV2 = validator("tests-v2.schema.json");
const validateTestResults = validator("test-results-v1.schema.json");
const validateChainInfo = validator("chain-info-v1.schema.json");
const validateAuditEvent = validator("audit-event-v1.schema.json");

const auditTools = JSON.parse(readFileSync(join(root, "audit-tools.json"), "utf8"));
expectValid(validateAuditTools, auditTools, "repository audit tool pins");

for (const component of [
  "calldata-weth",
  "calldata-mev_capital-USUALUSDC+",
  "Hyper Discipline",
  ".hidden",
  "日本語",
  "calldata-O'Reilly+<V2>",
]) {
  assert(isSafePathComponent(component), `accept safe case-sensitive path component: ${component}`);
}
for (const component of [
  "", ".", "..", "../descriptor", "project/descriptor", "project\\descriptor",
  "line\nbreak", "nul\0byte", "control\u0085character",
]) {
  assert(!isSafePathComponent(component), `reject unsafe path component: ${component}`);
}
assert.equal(shellQuote("audits/O'Reilly/$descriptor"), "'audits/O'\\''Reilly/$descriptor'");

const abbreviatedRunnerCommit = clone(auditTools);
abbreviatedRunnerCommit.sourcifyRunner.commit = "dae3cda";
expectInvalid(validateAuditTools, abbreviatedRunnerCommit, "abbreviated runner commit");

const draftAudit = {
  formatVersion: "1.0.0",
  policyVersion: "1.0.0",
  status: "draft",
  auditor: {
    id: `eip155:1:${address}`,
    profile: "../../../../auditor/profile.json",
  },
  descriptor: {
    source: {
      repository: "https://example.com/registry",
      commit: "a".repeat(40),
      path: "registry/example/calldata-example.json",
    },
    erc7730Version: "2.0.0",
    hash: {
      standard: "ERC-8176",
      algorithm: "keccak256-rfc8785-jcs",
      value: bytes32,
    },
    snapshot: "descriptor.json",
  },
  scope: { deployments: [], formatsReviewed: [] },
  findings: [],
  limitations: [],
  testing: {
    fixture: "tests.json",
    result: "not-run",
    tool: "clearsig",
    toolVersion: "0.0.0",
    command: "clearsig translate ...",
  },
  evidence: {
    deployments: "deployments.json",
    dependencies: "dependencies.json",
    report: "REPORT.md",
  },
  createdAt: "2026-08-28T00:00:00Z",
};
expectValid(validateAudit, draftAudit, "unfinished audit draft");

const draftWithoutAuditorProfile = clone(draftAudit);
delete draftWithoutAuditorProfile.auditor.profile;
expectInvalid(validateAudit, draftWithoutAuditorProfile, "audit without an auditor profile");

const datedDraft = clone(draftAudit);
datedDraft.reviewedAt = "2026-08-28T01:00:00Z";
expectInvalid(validateAudit, datedDraft, "draft with a completed-review timestamp");

const auditWithoutCommand = clone(draftAudit);
delete auditWithoutCommand.testing.command;
expectInvalid(validateAudit, auditWithoutCommand, "audit without an exact test command");

const unsupportedNeedsChanges = clone(draftAudit);
unsupportedNeedsChanges.status = "needs-changes";
unsupportedNeedsChanges.reviewedAt = "2026-08-28T01:00:00Z";
expectInvalid(validateAudit, unsupportedNeedsChanges, "needs-changes without a blocking finding");

const needsChanges = clone(unsupportedNeedsChanges);
needsChanges.findings = [
  {
    id: "F-001",
    severity: "high",
    blocking: true,
    status: "open",
    title: "Incorrect recipient",
    description: "The display identifies the wrong recipient.",
  },
];
expectValid(validateAudit, needsChanges, "needs-changes with evidence");

const emptyApproval = clone(draftAudit);
emptyApproval.status = "approved";
emptyApproval.reviewedAt = "2026-08-28T01:00:00Z";
emptyApproval.testing.result = "pass";
emptyApproval.testing.results = "test-results.json";
emptyApproval.attestation = {
  type: "eas-offchain",
  schemaUID: erc8176SchemaUID,
  uid: bytes32,
  file: "attestation.json",
};
expectInvalid(validateAudit, emptyApproval, "approval without reviewed formats");

const approvalWithoutSchema = clone(emptyApproval);
approvalWithoutSchema.scope.formatsReviewed = [
  {
    signature: "deposit()",
    selector: "0xd0e30db0",
    result: "pass",
    boundaryRationale: "Zero-value and nonzero-value transactions cover native value handling.",
  },
];
expectInvalid(validateAudit, approvalWithoutSchema, "approval without schema snapshot");

const completeApproval = clone(approvalWithoutSchema);
completeApproval.descriptor.schema = {
  declaredReference: "../../specs/erc7730-v2.schema.json",
  snapshot: "erc7730-schema.json",
  hash: {
    standard: "ERC-8176",
    algorithm: "keccak256-rfc8785-jcs",
    value: bytes32,
  },
};
expectValid(validateAudit, completeApproval, "approval identity");

const readyForAttestation = clone(completeApproval);
readyForAttestation.status = "ready-for-attestation";
delete readyForAttestation.attestation;
expectValid(validateAudit, readyForAttestation, "completed review awaiting attestation");

const readyWithAttestation = clone(readyForAttestation);
readyWithAttestation.attestation = clone(completeApproval.attestation);
expectInvalid(validateAudit, readyWithAttestation, "ready review with an attestation");

const readyWithoutResults = clone(readyForAttestation);
delete readyWithoutResults.testing.results;
expectInvalid(validateAudit, readyWithoutResults, "ready review without preserved test results");

const approvalWithWrongAttestationSchema = clone(completeApproval);
approvalWithWrongAttestationSchema.attestation.schemaUID = bytes32;
expectInvalid(
  validateAudit,
  approvalWithWrongAttestationSchema,
  "approval with a non-ERC-8176 attestation schema",
);

const approvalWithoutBoundaryRationale = clone(completeApproval);
delete approvalWithoutBoundaryRationale.scope.formatsReviewed[0].boundaryRationale;
expectInvalid(
  validateAudit,
  approvalWithoutBoundaryRationale,
  "approval without a boundary-case rationale",
);

const sourcifyResultWithoutExternalData = clone(draftAudit);
sourcifyResultWithoutExternalData.testing = {
  fixture: "tests.json",
  result: "pass",
  results: "test-results.json",
  tool: "@ethereum-sourcify/clear-signing-test-runner",
  toolVersion: "@ethereum-sourcify/clear-signing-test-runner@0.1.0 / @ethereum-sourcify/clear-signing@0.2.2",
  toolCommit: "b".repeat(40),
  command: "node scripts/run-audit-tests.mjs audits/example/example/hash",
};
expectInvalid(
  validateAudit,
  sourcifyResultWithoutExternalData,
  "Sourcify result without its external data",
);

const sourcifyResult = clone(sourcifyResultWithoutExternalData);
sourcifyResult.testing.externalData = [
  {
    name: "Chain metadata",
    format: "chain-info-v1",
    source: "https://chainid.network/chains_mini.json",
    snapshot: "test-chain-info.json",
    capturedAt: "2026-08-28T00:00:00Z",
    hash: { algorithm: "sha256", value: bytes32 },
  },
];
expectValid(validateAudit, sourcifyResult, "Sourcify result with preserved external data");

const omittedDeploymentWithoutAddress = clone(draftAudit);
omittedDeploymentWithoutAddress.limitations = [
  {
    id: "L-001",
    type: "omitted-deployment",
    impact: "No clear signing is available on the omitted chain.",
  },
];
expectInvalid(validateAudit, omittedDeploymentWithoutAddress, "omitted deployment without CAIP-10 ID");

const omittedDeployment = clone(draftAudit);
omittedDeployment.limitations = [
  {
    id: "L-001",
    type: "omitted-deployment",
    reason: "compatible-not-included",
    deployments: [`eip155:10:${address}`],
    sources: ["https://example.com/deployments"],
    impact: "No clear signing is available on the omitted chain.",
  },
];
expectValid(validateAudit, omittedDeployment, "omitted deployment limitation");

const omittedDeploymentWithUnknownReason = clone(omittedDeployment);
omittedDeploymentWithUnknownReason.limitations[0].reason = "unclear";
expectInvalid(validateAudit, omittedDeploymentWithUnknownReason, "unknown omission reason");

const omittedFunctionWithDeploymentReason = clone(draftAudit);
omittedFunctionWithDeploymentReason.limitations = [
  {
    id: "L-001",
    type: "omitted-function",
    reason: "compatible-not-included",
    impact: "The function is outside the descriptor.",
  },
];
expectInvalid(
  validateAudit,
  omittedFunctionWithDeploymentReason,
  "deployment reason on a non-deployment limitation",
);

const immutableDeployment = {
  formatVersion: "1.0.0",
  descriptorHash: bytes32,
  capturedAt: "2026-08-28T00:00:00Z",
  deployments: [
    {
      id: `eip155:1:${address}`,
      preFilter: "pass-direct",
      observedAtBlock: 1,
      observedAtBlockHash: bytes32,
      runtimeCodeHash: bytes32,
      sourceVerification: {
        sourcify: {
          status: "verified",
          url: "https://repo.sourcify.dev/1/example",
          evidence: "Verified source and ABI inspected.",
        },
      },
      proxy: {
        type: "none",
        upgradeability: "not-proxy",
        evidence: "No delegatecall or proxy dispatch was found.",
      },
      displayBindings: [
        {
          formats: ["deposit()"],
          result: "not-required",
          rationale: "No mutable value changes the displayed meaning.",
        },
      ],
    },
  ],
};
expectValid(validateDeployments, immutableDeployment, "immutable deployment evidence");

const immutableDeploymentWithEmptyImplementations = clone(immutableDeployment);
immutableDeploymentWithEmptyImplementations.deployments[0].proxy.implementations = [];
expectValid(
  validateDeployments,
  immutableDeploymentWithEmptyImplementations,
  "non-proxy with an explicit empty implementation list",
);

const emptyDeploymentDraft = clone(immutableDeployment);
emptyDeploymentDraft.capturedAt = null;
emptyDeploymentDraft.deployments = [];
expectValid(validateDeployments, emptyDeploymentDraft, "empty draft deployment evidence");

const missingBlockHash = clone(immutableDeployment);
delete missingBlockHash.deployments[0].observedAtBlockHash;
expectInvalid(validateDeployments, missingBlockHash, "deployment without block hash");

const incompleteProxy = clone(immutableDeployment);
incompleteProxy.deployments[0].proxy = {
  type: "eip1967",
  upgradeability: "administrator-controlled",
  evidence: "EIP-1967 implementation slot inspected.",
};
expectInvalid(validateDeployments, incompleteProxy, "proxy without implementation evidence");

const missingConstraint = clone(immutableDeployment);
missingConstraint.deployments[0].displayBindings[0].result = "enforced";
expectInvalid(validateDeployments, missingConstraint, "enforced binding without descriptor path");

const diamondWithoutSelectors = clone(immutableDeployment);
diamondWithoutSelectors.deployments[0].proxy = {
  type: "eip2535",
  upgradeability: "immutable",
  evidence: "Diamond loupe inspected at the observation block.",
  implementations: [
    {
      address: `0x${"22".repeat(20)}`,
      runtimeCodeHash: bytes32,
      sourceVerification: {
        sourcify: {
          status: "verified",
          url: "https://repo.sourcify.dev/1/facet",
          evidence: "Facet source verified.",
        },
      },
    },
  ],
};
expectInvalid(validateDeployments, diamondWithoutSelectors, "diamond facet without selectors");

const diamondWithSelectors = clone(diamondWithoutSelectors);
diamondWithSelectors.deployments[0].proxy.implementations[0].selectors = ["0xd0e30db0"];
expectValid(validateDeployments, diamondWithSelectors, "diamond facet selector mapping");

const noDependencies = {
  formatVersion: "1.0.0",
  descriptorHash: bytes32,
  dependencies: [],
};
expectValid(validateDependencies, noDependencies, "descriptor without includes");

const mutableDependency = clone(noDependencies);
mutableDependency.dependencies.push({
  declaredReference: "common.json",
  resolvedReference: "https://example.com/common.json",
  hash: {
    standard: "ERC-8176",
    algorithm: "keccak256-rfc8785-jcs",
    value: bytes32,
  },
});
expectInvalid(validateDependencies, mutableDependency, "dependency without snapshot or immutable source");

const snapshotWithoutCommit = clone(noDependencies);
snapshotWithoutCommit.dependencies.push({
  declaredReference: "common.json",
  resolvedReference: "https://example.com/common.json",
  snapshot: "dependency-snapshots/common.json",
  hash: {
    standard: "ERC-8176",
    algorithm: "keccak256-rfc8785-jcs",
    value: bytes32,
  },
});
expectInvalid(validateDependencies, snapshotWithoutCommit, "dependency snapshot without source commit");

const snapshotWithCommit = clone(snapshotWithoutCommit);
snapshotWithCommit.dependencies[0].commit = "b".repeat(40);
expectValid(validateDependencies, snapshotWithCommit, "dependency snapshot with source commit");

const renderingTests = {
  descriptor: "./descriptor.json",
  tests: [
    {
      description: "Example",
      caseType: "typical",
      rawTx: "0x01",
      expected: { intent: "Example", fields: [] },
    },
  ],
};
expectValid(validateTestsV1, renderingTests, "v1 rendering fixture");
expectValid(validateTestsV2, renderingTests, "v2 rendering fixture");

const crossChainRenderingTests = clone(renderingTests);
crossChainRenderingTests.additionalChainInfoChainIds = [10, 42161];
expectValid(validateTestsV2, crossChainRenderingTests, "rendering fixture with extra chain lookups");

const duplicateChainInfoIds = clone(crossChainRenderingTests);
duplicateChainInfoIds.additionalChainInfoChainIds = [10, 10];
expectInvalid(validateTestsV2, duplicateChainInfoIds, "duplicate extra chain lookups");

const chainInfo = {
  formatVersion: "1.0.0",
  source: "https://chainid.network/chains_mini.json",
  chainIds: [1],
  entries: [
    {
      chainId: 1,
      name: "Ethereum Mainnet",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    },
  ],
};
expectValid(validateChainInfo, chainInfo, "resolved chain information");

const chainInfoWithRpcData = clone(chainInfo);
chainInfoWithRpcData.entries[0].rpc = ["https://example.com"];
expectInvalid(validateChainInfo, chainInfoWithRpcData, "chain information with unused RPC data");

const passingResults = {
  runner: "@ethereum-sourcify/clear-signing-test-runner",
  implementation: "@ethereum-sourcify/clear-signing@0.2.2",
  cases: [
    {
      description: "Example",
      status: "pass",
      rendered: { intent: "Example", fields: [] },
    },
  ],
};
expectValid(validateTestResults, passingResults, "rendering results");

const passingResultsWithoutRenderedOutput = clone(passingResults);
delete passingResultsWithoutRenderedOutput.cases[0].rendered;
expectInvalid(
  validateTestResults,
  passingResultsWithoutRenderedOutput,
  "passing result without rendered output",
);

const errorResults = clone(passingResults);
errorResults.cases[0] = {
  description: "Example",
  status: "error",
  message: "The formatter rejected the input.",
};
expectValid(validateTestResults, errorResults, "error rendering result");

const negativeRenderingTest = clone(renderingTests);
negativeRenderingTest.tests[0].caseType = "negative";
delete negativeRenderingTest.tests[0].expected;
negativeRenderingTest.tests[0].expectedError = "The formatter rejects the unsupported path.";
expectValid(validateTestsV1, negativeRenderingTest, "v1 negative rendering fixture");
expectInvalid(validateTestsV2, negativeRenderingTest, "v2 negative rendering fixture");

const expectedErrorRenderingTest = clone(renderingTests);
delete expectedErrorRenderingTest.tests[0].expected;
expectedErrorRenderingTest.tests[0].expectedError = "The formatter rejects the unsupported path.";
expectInvalid(validateTestsV2, expectedErrorRenderingTest, "v2 fixture with expected error");

const eventBase = {
  formatVersion: "1.0.0",
  descriptorHash: bytes32,
  auditor: `eip155:1:${address}`,
  recordedAt: "2026-08-28T02:00:00Z",
  reason: "The audit lifecycle changed after publication.",
};

const revocationTemplate = JSON.parse(readFileSync(
  join(root, "templates/audit-events/revocation.json"), "utf8",
));
assert.equal(revocationTemplate.type, "revocation");
assert(!existsSync(join(root, "templates/audit-events/withdrawal.json")));
const revocationEvent = {
  ...revocationTemplate,
  ...eventBase,
  revocation: {
    service: "eas",
    chainId: 1,
    contract: address,
    attestationUID: bytes32,
    transactionHash: bytes32,
    revokedAt: "2026-08-28T01:59:00Z",
    url: "https://example.com/revocation",
  },
};
expectValid(validateAuditEvent, revocationEvent, "revocation event");

const revocationWithoutEvidence = clone(revocationEvent);
delete revocationWithoutEvidence.revocation;
expectInvalid(validateAuditEvent, revocationWithoutEvidence, "revocation without EAS evidence");

const revocationWithReplacement = clone(revocationEvent);
revocationWithReplacement.replacement = {
  descriptorHash: bytes32,
  dossier: `audits/example/example/${bytes32}`,
};
expectInvalid(validateAuditEvent, revocationWithReplacement, "revocation with replacement payload");

const legacyEventType = { ...revocationEvent, type: "withdrawal" };
expectInvalid(validateAuditEvent, legacyEventType, "legacy event type");
const revokedBaseAudit = { ...completeApproval, status: "revoked" };
expectInvalid(validateAudit, revokedBaseAudit, "revoked is derived, not a base audit status");

const supersessionEvent = {
  ...eventBase,
  type: "supersession",
  replacement: {
    descriptorHash: bytes32,
    dossier: `audits/example/example/${bytes32}`,
    attestationUID: bytes32,
  },
};
expectValid(validateAuditEvent, supersessionEvent, "supersession event");

const correctionEvent = {
  ...eventBase,
  type: "correction",
  correction: {
    summary: "The report now identifies the correct source URL.",
    affectedFiles: [`audits/example/example/${bytes32}/REPORT.md`],
  },
};
expectValid(validateAuditEvent, correctionEvent, "correction event");

const correctionWithRevocation = clone(correctionEvent);
correctionWithRevocation.revocation = clone(revocationEvent.revocation);
expectInvalid(validateAuditEvent, correctionWithRevocation, "correction with revocation payload");

const rawTx = Transaction.from({ type: 2, chainId: 1, to: address }).unsignedSerialized;
assert.deepEqual(fixtureChainIds({
  tests: [
    { description: "Calldata", rawTx },
    { description: "Typed data", data: { domain: { chainId: "0xa" } } },
    { description: "Duplicate", data: { domain: { chainId: 10 } } },
  ],
  additionalChainInfoChainIds: [137, 1, 0],
}), [0, 1, 10, 137]);
assert.deepEqual(fixtureChainIds({ additionalChainInfoChainIds: [11155111] }), [11155111]);
assert.throws(() => fixtureChainIds({ tests: [] }), /No chain IDs/);
assert.throws(() => fixtureChainIds({ tests: [{ rawTx: "0x01" }] }));
for (const chainId of [undefined, null, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "invalid"]) {
  assert.throws(() => fixtureChainIds({ tests: [{ data: { domain: { chainId } } }] }),
    /is missing|not a supported chain ID/);
  assert.throws(() => fixtureChainIds({ additionalChainInfoChainIds: [chainId] }),
    /is missing|not a supported chain ID/);
}

const temporary = mkdtempSync(join(tmpdir(), "erc7730-dossier-test-"));
try {
  const toolingPath = join(temporary, "audit-tools.json");
  const uppercasePin = clone(auditTools);
  uppercasePin.sourcifyRunner.commit = uppercasePin.sourcifyRunner.commit.toUpperCase();
  writeFileSync(toolingPath, JSON.stringify(uppercasePin));
  const runnerPin = loadRunnerPin(toolingPath);
  assert.deepEqual(runnerPin, auditTools.sourcifyRunner, "normalize commit case consistently");
  for (const fields of [
    { repository: "http://example.com/runner" },
    { repository: "not-a-url" },
    { commit: "abc123" },
    { package: "another-runner" },
    { version: "latest" },
    { unexpected: true },
  ]) {
    const invalid = { ...auditTools, sourcifyRunner: { ...runnerPin, ...fields } };
    expectInvalid(validateAuditTools, invalid, "invalid runner pin");
    writeFileSync(toolingPath, JSON.stringify(invalid));
    assert.throws(() => loadRunnerPin(toolingPath), /Invalid audit tooling manifest/);
  }

  const descriptorBytes = '{\r\n  "description": "REPLACE_VERSION 0xREPLACE_DESCRIPTOR_HASH café"\r\n}\r\n';
  const schemaBytes = '{ "version": "2.0.0", "description": "REPLACE_PROJECT REPLACE_DESCRIPTOR" }\n';
  const options = {
    project: "Hyper Discipline", slug: "calldata-O'Reilly+<V2>", commit: "a".repeat(40),
    inputDescriptor: join(temporary, "input-descriptor.json"),
    auditor: `eip155:1:${address}`, hash: bytes32,
    schema: {
      path: join(temporary, "input-schema.json"), version: "2.0.0",
      declaredReference: '../../specs/REPLACE_VERSION-"quoted"\\schema.json',
    },
    schemaHash: `0x${"22".repeat(32)}`, policyVersion: "1.0.0", runnerPin,
  };
  writeFileSync(options.inputDescriptor, descriptorBytes);
  writeFileSync(options.schema.path, schemaBytes);
  const dossier = join(temporary, options.project, options.slug, bytes32);
  createDossier(dossier, options);
  assert.deepEqual(readdirSync(dossier).sort(), [
    "REPORT.md", "audit.json", "dependencies.json", "deployments.json",
    "descriptor.json", "erc7730-schema.json", "tests.json",
  ].sort(), "generate evidence and report files only");
  assert.deepEqual(readFileSync(join(dossier, "descriptor.json")), Buffer.from(descriptorBytes));
  assert.deepEqual(readFileSync(join(dossier, "erc7730-schema.json")), Buffer.from(schemaBytes));
  assert.deepEqual(readFileSync(join(dossier, "tests.json")),
    readFileSync(join(root, "templates/audit-dossier/tests.json")));
  const generatedTests = JSON.parse(readFileSync(join(dossier, "tests.json"), "utf8"));
  assert.equal(generatedTests.$schema, "../../../../schemas/tests-v2.schema.json");
  generatedTests.tests = clone(renderingTests.tests);
  expectValid(validateTestsV2, generatedTests, "generated v2 rendering fixture");
  const generated = JSON.parse(readFileSync(join(dossier, "audit.json"), "utf8"));
  expectValid(validateAudit, generated, "generated draft");
  assert.equal(generated.status, "draft");
  assert.equal(generated.policyVersion, options.policyVersion);
  assert.equal(generated.auditor.id, options.auditor);
  assert.equal(generated.descriptor.hash.value, options.hash);
  assert.equal(generated.descriptor.schema.hash.value, options.schemaHash);
  assert.equal(generated.descriptor.schema.declaredReference, options.schema.declaredReference);
  assert.equal(generated.descriptor.erc7730Version, options.schema.version);
  assert.deepEqual(generated.descriptor.source, {
    repository: "https://github.com/ethereum/clear-signing-erc7730-registry",
    commit: options.commit, path: "registry/Hyper Discipline/calldata-O'Reilly+<V2>.json",
  });
  assert.deepEqual(generated.testing, {
    fixture: "tests.json", result: "not-run", tool: runnerPin.package,
    toolVersion: `${runnerPin.package}@${runnerPin.version}`, toolCommit: runnerPin.commit,
    command: `node scripts/run-audit-tests.mjs 'audits/Hyper Discipline/calldata-O'\\''Reilly+<V2>/${bytes32}'`,
  });
  for (const [filename, validate] of [
    ["dependencies.json", validateDependencies], ["deployments.json", validateDeployments],
  ]) {
    const record = JSON.parse(readFileSync(join(dossier, filename), "utf8"));
    expectValid(validate, record, `generated ${filename}`);
    assert.equal(record.descriptorHash, bytes32);
  }
  const report = readFileSync(join(dossier, "REPORT.md"), "utf8");
  assert.match(report, /^# ERC-7730 Descriptor Audit: <code>calldata-O'Reilly\+&lt;V2&gt;<\/code>\n/);
  assert(report.includes("| Project | <code>Hyper Discipline</code> |"));
  assert(report.includes("<code>registry/Hyper Discipline/calldata-O'Reilly+&lt;V2&gt;.json</code>"));
  assert.deepEqual([...new Set(report.match(/REPLACE_[A-Z_]+/g))].sort(),
    ["REPLACE_FUNCTION_SIGNATURE", "REPLACE_REVIEWED_AT"]);
  assert(report.includes(bytes32) && report.includes(options.schemaHash));
  assert.throws(() => createDossier(dossier, options), /already exists/);
  assert.deepEqual(readFileSync(join(dossier, "descriptor.json")), Buffer.from(descriptorBytes));
  const failedDossier = join(temporary, "failed-dossier");
  assert.throws(() => createDossier(failedDossier, {
    ...options, inputDescriptor: join(temporary, "missing-descriptor.json"),
  }), /ENOENT/);
  assert(!existsSync(failedDossier), "remove only the new dossier when generation fails");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

process.stdout.write("Schema, input, and dossier generation tests passed.\n");
