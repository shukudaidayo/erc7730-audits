#!/usr/bin/env node

// Example: node scripts/new-audit.mjs weth calldata-weth

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRunnerPin } from "./audit-inputs.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");

// Repository-wide defaults. Change these only if the local registry layout or
// canonical upstream repository changes. Auditor identity is read separately
// from auditor/profile.json.
const settings = Object.freeze({
  registryCheckout: resolve(root, "../source/clear-signing-erc7730-registry"),
  registryRepository: "https://github.com/ethereum/clear-signing-erc7730-registry",
  auditorProfile: join(root, "auditor", "profile.json"),
  auditPolicy: join(root, "auditor", "AUDIT_POLICY.md"),
  auditTooling: join(root, "audit-tools.json"),
});

function usage(message, exitCode = 1) {
  if (message) process.stderr.write(`Error: ${message}\n\n`);
  process.stderr.write(`Usage:
  node scripts/new-audit.mjs <project> <descriptor-slug>

Example:
  node scripts/new-audit.mjs weth calldata-weth

The descriptor is loaded from:
  <registry checkout>/registry/<project>/<descriptor-slug>.json

The auditor account is loaded from:
  auditor/profile.json
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  if (argv.length === 1 && ["-h", "--help"].includes(argv[0])) usage(undefined, 0);
  if (argv.length !== 2) usage("Expected a project and descriptor slug.");
  return { project: argv[0], slug: argv[1] };
}

export function isSafePathComponent(value) {
  return typeof value === "string"
    && value.length > 0
    && value !== "."
    && value !== ".."
    && !value.includes("/")
    && !value.includes("\\")
    && !/\p{Cc}/u.test(value);
}

function validatePathComponent(value, label) {
  if (!isSafePathComponent(value)) {
    usage(`${label} must be one printable path component without slashes or backslashes, and cannot be a single or double dot.`);
  }
}

export function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function markdownCode(value) {
  const escaped = value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<code>${escaped}</code>`;
}

function descriptorHash(path) {
  const result = spawnSync("clearsig", ["descriptor-hash", path], {
    encoding: "utf8",
  });
  if (result.error?.code === "ENOENT") {
    usage("clearsig is not installed; install the pinned version from requirements.txt.");
  }
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    usage("clearsig could not hash the descriptor.");
  }
  const match = `${result.stdout}\n${result.stderr}`.match(/0x[0-9a-fA-F]{64}/);
  if (!match) usage("clearsig output did not contain an ERC-8176 descriptor hash.");
  return match[0].toLowerCase();
}

function descriptorSchema(descriptorPath, registryCheckout) {
  let descriptor;
  try {
    descriptor = JSON.parse(readFileSync(descriptorPath, "utf8"));
  } catch (error) {
    usage(`Could not parse the descriptor: ${error.message}`);
  }

  const schemaReference = descriptor.$schema;
  if (typeof schemaReference !== "string" || !schemaReference) {
    usage("Descriptor does not declare an ERC-7730 schema.");
  }

  let schemaPath;
  try {
    const url = new URL(schemaReference);
    schemaPath = join(registryCheckout, "specs", url.pathname.split("/").at(-1));
  } catch {
    schemaPath = resolve(dirname(descriptorPath), schemaReference);
  }

  if (!existsSync(schemaPath)) usage(`Could not find the declared ERC-7730 schema: ${schemaPath}`);

  let schema;
  try {
    schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  } catch (error) {
    usage(`Could not parse the declared ERC-7730 schema: ${error.message}`);
  }

  if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/.test(schema.version ?? "")) {
    usage(`Declared ERC-7730 schema does not contain a semantic version: ${schemaPath}`);
  }
  return {
    declaredReference: schemaReference,
    path: schemaPath,
    version: schema.version,
  };
}

function policyVersion(policyPath) {
  if (!existsSync(policyPath)) usage(`Missing audit policy: ${policyPath}`);
  const policy = readFileSync(policyPath, "utf8");
  const match = policy.match(/^Policy version: `([^`]+)`$/m);
  if (!match) usage("AUDIT_POLICY.md does not contain a Policy version line.");
  return match[1];
}

function gitOutput(args, errorMessage) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.error?.code === "ENOENT") usage("git is not installed.");
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    usage(errorMessage);
  }
  return result.stdout.trim();
}

function registryCommit(checkout, sourcePath) {
  const commit = gitOutput(
    ["-C", checkout, "rev-parse", "--verify", "HEAD"],
    `Could not read a Git commit from the registry checkout: ${checkout}`,
  );
  if (!/^[0-9a-fA-F]{40}$/.test(commit)) usage("Registry HEAD is not a full 40-character Git SHA.");

  const status = gitOutput(
    ["-C", checkout, "status", "--porcelain", "--", sourcePath],
    `Could not inspect the descriptor's Git status: ${sourcePath}`,
  );
  if (status) {
    usage(`Descriptor has uncommitted changes, so registry HEAD would be incorrect provenance: ${sourcePath}`);
  }
  return commit;
}

function auditorId(profilePath) {
  if (!existsSync(profilePath)) {
    usage("Missing auditor/profile.json. Copy auditor/profile.example.json and set its id first.");
  }

  let profile;
  try {
    profile = JSON.parse(readFileSync(profilePath, "utf8"));
  } catch (error) {
    usage(`Could not parse auditor/profile.json: ${error.message}`);
  }

  if (!/^eip155:[0-9]+:0x[0-9a-fA-F]{40}$/.test(profile.id ?? "")) {
    usage("auditor/profile.json id must be a CAIP-10 EVM account.");
  }
  if (/^eip155:[0-9]+:0x0{40}$/i.test(profile.id)) {
    usage("auditor/profile.json still contains the zero-address placeholder.");
  }
  return profile.id;
}

export function createDossier(destination, {
  project, slug, inputDescriptor, commit, auditor, hash, schema, schemaHash,
  policyVersion, runnerPin,
}) {
  if (existsSync(destination)) throw new Error(`Audit dossier already exists: ${destination}`);
  const template = join(root, "templates", "audit-dossier");
  const sourcePath = `registry/${project}/${slug}.json`;
  const audit = JSON.parse(readFileSync(join(template, "audit.json"), "utf8"));
  audit.descriptor.source = { repository: settings.registryRepository, commit, path: sourcePath };
  audit.descriptor.hash.value = hash;
  audit.descriptor.erc7730Version = schema.version;
  audit.descriptor.schema.declaredReference = schema.declaredReference;
  audit.descriptor.schema.hash.value = schemaHash;
  audit.policyVersion = policyVersion;
  audit.auditor.id = auditor;
  audit.createdAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  audit.testing.tool = runnerPin.package;
  audit.testing.toolVersion = `${runnerPin.package}@${runnerPin.version}`;
  audit.testing.toolCommit = runnerPin.commit;
  const dossierPath = `audits/${project}/${slug}/${hash}`;
  audit.testing.command = `node scripts/run-audit-tests.mjs ${shellQuote(dossierPath)}`;

  mkdirSync(destination, { recursive: true });
  try {
    writeFileSync(join(destination, "audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
    for (const filename of ["dependencies.json", "deployments.json"]) {
      const record = JSON.parse(readFileSync(join(template, filename), "utf8"));
      record.descriptorHash = hash;
      writeFileSync(join(destination, filename), `${JSON.stringify(record, null, 2)}\n`);
    }

    // Substitute only report identity fields, never JSON or copied evidence.
    const replacements = {
      REPLACE_PROJECT: markdownCode(project),
      REPLACE_DESCRIPTOR: markdownCode(slug),
      REPLACE_FULL_COMMIT: commit,
      REPLACE_SOURCE_PATH: markdownCode(sourcePath),
      REPLACE_VERSION: schema.version,
      "0xREPLACE_SCHEMA_HASH": schemaHash,
      REPLACE_POLICY_VERSION: policyVersion,
      "0xREPLACE_DESCRIPTOR_HASH": hash,
      "eip155:1:0xREPLACE_AUDITOR": auditor,
      REPLACE_CREATED_AT: audit.createdAt,
    };
    const report = readFileSync(join(template, "REPORT.md"), "utf8").replace(
      new RegExp(Object.keys(replacements).join("|"), "g"),
      (placeholder) => replacements[placeholder],
    );
    writeFileSync(join(destination, "REPORT.md"), report);
    copyFileSync(join(template, "tests.json"), join(destination, "tests.json"));
    copyFileSync(inputDescriptor, join(destination, "descriptor.json"));
    copyFileSync(schema.path, join(destination, "erc7730-schema.json"));
  } catch (error) {
    rmSync(destination, { recursive: true, force: true });
    throw error;
  }
}

function main() {
  const { project, slug } = parseArgs(process.argv.slice(2));
  validatePathComponent(project, "project");
  validatePathComponent(slug, "slug");
  const sourcePath = `registry/${project}/${slug}.json`;
  const inputDescriptor = join(settings.registryCheckout, ...sourcePath.split("/"));
  if (!existsSync(inputDescriptor)) usage(`Descriptor not found: ${inputDescriptor}`);

  const commit = registryCommit(settings.registryCheckout, sourcePath);
  const auditor = auditorId(settings.auditorProfile);
  const hash = descriptorHash(inputDescriptor);
  const schema = descriptorSchema(inputDescriptor, settings.registryCheckout);
  const schemaHash = descriptorHash(schema.path);
  const destination = join(root, "audits", project, slug, hash);
  createDossier(destination, {
    project, slug, inputDescriptor, commit, auditor, hash, schema, schemaHash,
    policyVersion: policyVersion(settings.auditPolicy),
    runnerPin: loadRunnerPin(settings.auditTooling),
  });
  process.stdout.write(`Created ${destination}\nDescriptor hash: ${hash}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    usage(error.message);
  }
}
