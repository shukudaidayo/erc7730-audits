#!/usr/bin/env node

// Example:
// node scripts/run-audit-tests.mjs audits/weth/calldata-weth/0x20de898a28022b1678a43f6c2ee75d3dd700ddfbd48f7770897c05472871dae7

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { fixtureChainIds, loadRunnerPin } from "./audit-inputs.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDirectory, "..");
const auditsRoot = join(root, "audits");

function exitWith(message, exitCode = 1) {
  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${message}\n`);
  process.exit(exitCode);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: options.inherit ? "inherit" : "pipe",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (!options.inherit) process.stderr.write(result.stderr || result.stdout);
    throw new Error(`${command} exited with status ${result.status}`);
  }
  return (result.stdout ?? "").trim();
}

function parseJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Could not parse ${label}: ${error.message}`);
  }
}

const runnerPin = loadRunnerPin(join(root, "audit-tools.json"));

const settings = Object.freeze({
  runnerRepository: runnerPin.repository,
  runnerCommit: runnerPin.commit,
  runnerPackage: runnerPin.package,
  runnerVersion: runnerPin.version,
  chainMetadataUrl: "https://chainid.network/chains_mini.json",
  runnerCache: join(root, ".cache", "sourcify-test-runner"),
});

function ensureRunner() {
  const checkout = join(settings.runnerCache, settings.runnerCommit);
  if (!existsSync(join(checkout, ".git"))) {
    mkdirSync(settings.runnerCache, { recursive: true });
    run("git", [
      "clone",
      "--filter=blob:none",
      "--no-checkout",
      settings.runnerRepository,
      checkout,
    ], { inherit: true });
    run("git", ["-C", checkout, "checkout", "--detach", settings.runnerCommit], {
      inherit: true,
    });
  }

  const actualCommit = run("git", ["-C", checkout, "rev-parse", "HEAD"]);
  if (actualCommit !== settings.runnerCommit) {
    throw new Error(`Runner cache is at ${actualCommit}, expected ${settings.runnerCommit}`);
  }
  const trackedChanges = run("git", [
    "-C",
    checkout,
    "status",
    "--porcelain",
    "--untracked-files=no",
  ]);
  if (trackedChanges) {
    throw new Error("The pinned runner checkout has tracked local changes; remove its cache and run again");
  }

  const runnerPackage = parseJson(join(checkout, "package.json"), "runner package.json");
  if (
    runnerPackage.name !== settings.runnerPackage
    || runnerPackage.version !== settings.runnerVersion
  ) {
    throw new Error(
      `Pinned runner identifies as ${runnerPackage.name}@${runnerPackage.version}, expected ${settings.runnerPackage}@${settings.runnerVersion}`,
    );
  }

  const cli = join(checkout, "dist", "cli.js");
  const implementationPackage = join(
    checkout,
    "node_modules",
    "@ethereum-sourcify",
    "clear-signing",
    "package.json",
  );
  if (!existsSync(cli) || !existsSync(implementationPackage)) {
    run("npm", ["ci"], { cwd: checkout, inherit: true });
    run("npm", ["run", "build"], { cwd: checkout, inherit: true });
  }
  if (!existsSync(cli)) throw new Error("The pinned Sourcify runner did not build dist/cli.js");
  return { checkout, cli, runnerPackage };
}

async function fetchChainMetadata() {
  const response = await fetch(settings.chainMetadataUrl, {
    headers: { "user-agent": "erc7730-audits reproducible test wrapper" },
  });
  if (!response.ok) {
    throw new Error(`Chain metadata request failed with HTTP ${response.status}`);
  }
  const body = await response.text();
  JSON.parse(body);
  return body;
}

function projectChainInfo(rawMetadata, chainIds) {
  const rawEntries = JSON.parse(rawMetadata);
  const entriesByChainId = new Map();
  for (const entry of rawEntries) {
    if (!chainIds.includes(entry.chainId)) continue;
    if (!entry.name || !entry.nativeCurrency) {
      throw new Error(`Chain metadata for ${entry.chainId} has no name or native currency`);
    }
    if (entriesByChainId.has(entry.chainId)) {
      throw new Error(`Chain metadata contains duplicate chain ID ${entry.chainId}`);
    }
    entriesByChainId.set(entry.chainId, {
      chainId: entry.chainId,
      name: entry.name,
      nativeCurrency: {
        name: entry.nativeCurrency.name,
        symbol: entry.nativeCurrency.symbol,
        decimals: entry.nativeCurrency.decimals,
      },
    });
  }
  const missing = chainIds.filter((chainId) => !entriesByChainId.has(chainId));
  if (missing.length) {
    throw new Error(`Chain metadata has no usable entry for chain ID(s): ${missing.join(", ")}`);
  }
  return {
    formatVersion: "1.0.0",
    source: settings.chainMetadataUrl,
    chainIds,
    entries: chainIds.map((chainId) => entriesByChainId.get(chainId)),
  };
}

function sha256(value) {
  return `0x${createHash("sha256").update(value).digest("hex")}`;
}

function utcSeconds() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

if (process.argv.length !== 3 || ["-h", "--help"].includes(process.argv[2])) {
  exitWith(
    "Usage: node scripts/run-audit-tests.mjs audits/<project>/<descriptor>/<descriptor-hash>",
    ["-h", "--help"].includes(process.argv[2]) ? 0 : 1,
  );
}

const dossier = resolve(root, process.argv[2]);
if (dossier === auditsRoot || !dossier.startsWith(`${auditsRoot}${sep}`)) {
  exitWith("The audit dossier must be a directory below audits/.");
}

const auditPath = join(dossier, "audit.json");
const testsPath = join(dossier, "tests.json");
if (!existsSync(auditPath) || !existsSync(testsPath)) {
  exitWith("The audit dossier must contain audit.json and tests.json.");
}

const outputPath = join(dossier, "test-results.json");
const temporaryOutput = join(dossier, `.test-results.${process.pid}.tmp.json`);
const chainInfoPath = join(dossier, "test-chain-info.json");

try {
  const { checkout, cli, runnerPackage } = ensureRunner();
  const chainMetadataBefore = await fetchChainMetadata();

  run(process.execPath, [cli, testsPath, "--output", temporaryOutput, "--verbose"], {
    cwd: checkout,
    inherit: true,
  });
  if (!existsSync(temporaryOutput)) {
    throw new Error("The Sourcify runner did not create its results file");
  }

  const chainMetadataAfter = await fetchChainMetadata();
  if (chainMetadataBefore !== chainMetadataAfter) {
    throw new Error("chainid.network metadata changed while the test run was in progress; run again");
  }

  const tests = parseJson(testsPath, "tests.json");
  const results = parseJson(temporaryOutput, "the Sourcify results");
  const chainInfo = projectChainInfo(chainMetadataBefore, fixtureChainIds(tests));
  const chainInfoSnapshot = `${JSON.stringify(chainInfo, null, 2)}\n`;
  const fixtureDescriptions = new Set(tests.tests?.map((test) => test.description));
  const resultDescriptions = new Set(results.cases?.map((test) => test.description));
  if (
    !Array.isArray(tests.tests)
    || !Array.isArray(results.cases)
    || fixtureDescriptions.size !== tests.tests.length
    || resultDescriptions.size !== results.cases.length
    || fixtureDescriptions.size !== resultDescriptions.size
    || [...fixtureDescriptions].some((description) => !resultDescriptions.has(description))
  ) {
    throw new Error("The Sourcify results do not map one-to-one to the test fixtures");
  }

  renameSync(temporaryOutput, outputPath);
  writeFileSync(chainInfoPath, chainInfoSnapshot);

  const implementationPackage = parseJson(
    join(checkout, "node_modules", "@ethereum-sourcify", "clear-signing", "package.json"),
    "installed clear-signing package.json",
  );
  const audit = parseJson(auditPath, "audit.json");
  const commandDossier = relative(root, dossier).split(sep).join("/");
  const allPassed = results.cases.length === tests.tests.length
    && results.cases.every((test) => test.status === "pass");
  audit.testing = {
    fixture: "tests.json",
    result: allPassed ? "pass" : "fail",
    results: "test-results.json",
    tool: runnerPackage.name,
    toolVersion: `${runnerPackage.name}@${runnerPackage.version} / ${implementationPackage.name}@${implementationPackage.version}`,
    toolCommit: settings.runnerCommit,
    command: `node scripts/run-audit-tests.mjs ${commandDossier}`,
    externalData: [
      {
        name: "Resolved chain information used by rendering tests",
        format: "chain-info-v1",
        source: settings.chainMetadataUrl,
        snapshot: "test-chain-info.json",
        capturedAt: utcSeconds(),
        hash: {
          algorithm: "sha256",
          value: sha256(chainInfoSnapshot),
        },
      },
    ],
  };
  writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);

  process.stdout.write(`Preserved ${relative(root, outputPath)}\n`);
  process.stdout.write(`Preserved ${relative(root, chainInfoPath)}\n`);
  if (!allPassed) exitWith("One or more Sourcify rendering tests failed.");
  process.stdout.write("All Sourcify rendering tests passed.\n");
} catch (error) {
  rmSync(temporaryOutput, { force: true });
  exitWith(`Error: ${error.message}`);
}
