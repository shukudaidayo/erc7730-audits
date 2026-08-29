#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  effectiveAuditStatus,
  latestAuditTimestamp,
  listAuditEventFiles,
} from "./audit-events.mjs";
import {
  ERC8176_SCHEMA_UID,
  validateEasAttestation,
} from "./eas-attestation.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const auditsRoot = join(root, "audits");
const checkOnly = process.argv.includes("--check");

function findAuditFiles(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...findAuditFiles(path));
    else if (entry.name === "audit.json") files.push(path);
  }
  return files.sort();
}

function posixPath(path) {
  return relative(root, path).split(sep).join("/");
}

function sortObject(object) {
  return Object.fromEntries(Object.entries(object).sort(([left], [right]) => left.localeCompare(right)));
}

const byHash = {};
const byDeployment = {};
let latestRecordAt = null;

for (const auditPath of findAuditFiles(auditsRoot)) {
  const audit = JSON.parse(readFileSync(auditPath, "utf8"));
  if (["draft", "ready-for-attestation"].includes(audit.status)) continue;
  const hash = audit.descriptor.hash.value.toLowerCase();
  const dossierPath = dirname(auditPath);
  const dossier = posixPath(dossierPath);
  const eventPaths = listAuditEventFiles(dossierPath);
  const events = eventPaths.map((path) => JSON.parse(readFileSync(path, "utf8")));
  const status = effectiveAuditStatus(audit.status, events);
  const parts = dossier.split("/");
  const entry = {
    status,
    auditor: audit.auditor.id,
    project: parts[1],
    descriptor: parts[2],
    dossier,
    reviewedAt: audit.reviewedAt,
    deployments: [...audit.scope.deployments].sort(),
  };
  let attestedAt = null;
  if (audit.attestation) {
    if (audit.attestation.schemaUID.toLowerCase() !== ERC8176_SCHEMA_UID) {
      throw new Error(`${posixPath(auditPath)} does not use the canonical ERC-8176 schema`);
    }
    const attestationPath = join(dossierPath, audit.attestation.file);
    const wrapper = JSON.parse(readFileSync(attestationPath, "utf8"));
    const validation = validateEasAttestation(wrapper, {
      auditorId: audit.auditor.id,
      descriptorHash: audit.descriptor.hash.value,
      reviewedAt: audit.reviewedAt,
      expectedUID: audit.attestation.uid,
      schemaUID: audit.attestation.schemaUID,
    });
    if (validation.errors.length) {
      throw new Error(`${posixPath(attestationPath)}: ${validation.errors.join("; ")}`);
    }
    attestedAt = validation.details.attestedAt;
    entry.attestation = {
      file: `${dossier}/${audit.attestation.file}`,
      uid: validation.details.uid,
      attestedAt,
    };
  }
  if (eventPaths.length) entry.events = eventPaths.map(posixPath);
  (byHash[hash] ??= []).push(entry);
  for (const deployment of audit.scope.deployments) {
    (byDeployment[deployment.toLowerCase()] ??= []).push({
      descriptorHash: hash,
      status,
      auditor: audit.auditor.id,
      dossier,
    });
  }
  let latestTimestamp = latestAuditTimestamp(audit.reviewedAt, events);
  if (attestedAt && attestedAt > latestTimestamp) latestTimestamp = attestedAt;
  if (!latestRecordAt || latestTimestamp > latestRecordAt) latestRecordAt = latestTimestamp;
}

for (const entries of Object.values(byHash)) {
  entries.sort((left, right) => left.auditor.localeCompare(right.auditor) || left.reviewedAt.localeCompare(right.reviewedAt));
}
for (const entries of Object.values(byDeployment)) {
  entries.sort((left, right) => left.descriptorHash.localeCompare(right.descriptorHash) || left.auditor.localeCompare(right.auditor));
}

const outputs = new Map([
  [
    join(root, "indexes", "by-descriptor-hash.json"),
    { formatVersion: "1.0.0", latestRecordAt, entries: sortObject(byHash) },
  ],
  [
    join(root, "indexes", "by-deployment.json"),
    { formatVersion: "1.0.0", latestRecordAt, entries: sortObject(byDeployment) },
  ],
]);

let stale = false;
for (const [path, value] of outputs) {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (checkOnly) {
    if (!existsSync(path) || readFileSync(path, "utf8") !== serialized) {
      process.stderr.write(`Stale generated index: ${posixPath(path)}\n`);
      stale = true;
    }
  } else {
    writeFileSync(path, serialized);
    process.stdout.write(`Wrote ${posixPath(path)}\n`);
  }
}

if (stale) process.exit(1);
