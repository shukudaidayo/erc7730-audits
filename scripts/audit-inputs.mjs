import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { Transaction } from "ethers";

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateTooling = ajv.compile(JSON.parse(readFileSync(
  new URL("../schemas/audit-tools-v1.schema.json", import.meta.url), "utf8",
)));

export function loadRunnerPin(toolingPath) {
  const tooling = JSON.parse(readFileSync(toolingPath, "utf8"));
  if (!validateTooling(tooling)) {
    throw new Error(`Invalid audit tooling manifest: ${ajv.errorsText(validateTooling.errors)}`);
  }
  return { ...tooling.sourcifyRunner, commit: tooling.sourcifyRunner.commit.toLowerCase() };
}

function addChainId(chainIds, value, label) {
  if (value === null || value === undefined) throw new Error(`${label} is missing`);
  try {
    const chainId = BigInt(value);
    if (chainId < 0n || chainId > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error();
    chainIds.add(Number(chainId));
  } catch {
    throw new Error(`${label} is not a supported chain ID: ${value}`);
  }
}

export function fixtureChainIds(tests) {
  const chainIds = new Set();
  for (const test of tests.tests ?? []) {
    if (test.rawTx) {
      addChainId(chainIds, Transaction.from(test.rawTx).chainId, `${test.description} transaction chainId`);
    } else if (test.data) {
      addChainId(chainIds, test.data.domain?.chainId, `${test.description} EIP-712 domain chainId`);
    }
  }
  for (const chainId of tests.additionalChainInfoChainIds ?? []) {
    addChainId(chainIds, chainId, "additionalChainInfoChainIds entry");
  }
  if (!chainIds.size) {
    throw new Error("No chain IDs could be derived from the fixtures or additionalChainInfoChainIds");
  }
  return [...chainIds].sort((left, right) => left - right);
}
