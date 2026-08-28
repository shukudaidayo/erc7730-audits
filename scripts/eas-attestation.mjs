import {
  Signature,
  solidityPackedKeccak256,
  toUtf8Bytes,
  verifyTypedData,
} from "ethers";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const ZERO_UID = `0x${"00".repeat(32)}`;
export const ERC8176_SCHEMA_UID =
  "0xe023eef113c1670774801c34b377fdf612dd8a4d2fa92fe382e15bd91fafb5c2";
export const EAS_DOMAIN = Object.freeze({
  name: "EAS Attestation",
  version: "0.26",
  chainId: 1,
  verifyingContract: "0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587",
});
export const EAS_ATTEST_TYPES = Object.freeze({
  Attest: Object.freeze([
    Object.freeze({ name: "version", type: "uint16" }),
    Object.freeze({ name: "schema", type: "bytes32" }),
    Object.freeze({ name: "recipient", type: "address" }),
    Object.freeze({ name: "time", type: "uint64" }),
    Object.freeze({ name: "expirationTime", type: "uint64" }),
    Object.freeze({ name: "revocable", type: "bool" }),
    Object.freeze({ name: "refUID", type: "bytes32" }),
    Object.freeze({ name: "data", type: "bytes" }),
    Object.freeze({ name: "salt", type: "bytes32" }),
  ]),
});

function canonicalize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
    .join(",")}}`;
}

function lowerString(value) {
  return typeof value === "string" ? value.toLowerCase() : null;
}

function expectedSigner(auditorId) {
  return typeof auditorId === "string" ? auditorId.split(":").at(-1).toLowerCase() : null;
}

function isZeroInteger(value) {
  try {
    return BigInt(value) === 0n;
  } catch {
    return false;
  }
}

export function offchainAttestationUID(message) {
  // EAS SDK Offchain.getOffchainUID, OffchainAttestationVersion.Version2.
  return solidityPackedKeccak256(
    [
      "uint16",
      "bytes",
      "address",
      "address",
      "uint64",
      "uint64",
      "bool",
      "bytes32",
      "bytes",
      "bytes32",
      "uint32",
    ],
    [
      message.version,
      toUtf8Bytes(message.schema),
      message.recipient,
      ZERO_ADDRESS,
      message.time,
      message.expirationTime,
      message.revocable,
      message.refUID,
      message.data,
      message.salt,
      0,
    ],
  ).toLowerCase();
}

export function validateEasAttestation(
  wrapper,
  {
    auditorId,
    descriptorHash,
    reviewedAt,
    expectedUID = null,
    schemaUID = ERC8176_SCHEMA_UID,
  },
) {
  const errors = [];
  const signed = wrapper?.sig;
  if (!signed?.domain || !signed?.types || !signed?.message || !signed?.signature) {
    return {
      errors: ["expected an unmodified EAS offchain export with sig.domain/types/message/signature"],
      details: null,
    };
  }

  const signer = expectedSigner(auditorId);
  if (!/^0x[0-9a-f]{40}$/.test(signer ?? "")) {
    errors.push("auditor ID does not identify an EVM signing account");
  } else if (lowerString(wrapper.signer) !== signer) {
    errors.push("wrapper signer does not match audit auditor ID");
  }
  if (lowerString(signed.message.schema) !== lowerString(schemaUID)) {
    errors.push("EAS schema UID does not match the canonical ERC-8176 schema");
  }
  if (lowerString(signed.message.data) !== lowerString(descriptorHash)) {
    errors.push("EAS data does not equal the ERC-8176 descriptor hash");
  }
  if (expectedUID && lowerString(signed.uid) !== lowerString(expectedUID)) {
    errors.push("offchain attestation UID does not match audit.json");
  }
  if (signed.primaryType !== "Attest") {
    errors.push("EAS primary type must be Attest");
  }

  const exportedTypes = { ...signed.types };
  delete exportedTypes.EIP712Domain;
  if (canonicalize(exportedTypes) !== canonicalize(EAS_ATTEST_TYPES)) {
    errors.push("EAS Attest type definition is not canonical");
  }
  if (
    signed.domain.name !== EAS_DOMAIN.name
    || signed.domain.version !== EAS_DOMAIN.version
    || Number(signed.domain.chainId) !== EAS_DOMAIN.chainId
    || lowerString(signed.domain.verifyingContract)
      !== EAS_DOMAIN.verifyingContract.toLowerCase()
  ) {
    errors.push("EAS domain is not the canonical Ethereum mainnet domain");
  }
  if (Number(signed.message.version) !== 2) {
    errors.push("offchain attestation must use EAS version 2");
  }
  if (lowerString(signed.message.recipient) !== ZERO_ADDRESS) {
    errors.push("ERC-8176 attestation recipient must be the zero address");
  }
  if (!isZeroInteger(signed.message.expirationTime)) {
    errors.push("ERC-8176 attestation must not expire");
  }
  if (lowerString(signed.message.refUID) !== ZERO_UID) {
    errors.push("ERC-8176 attestation must not reference another attestation");
  }
  if (signed.message.revocable !== true) {
    errors.push("offchain attestation must be revocable");
  }

  let attestedAt = null;
  try {
    const attestedAtMs = BigInt(signed.message.time) * 1000n;
    const reviewedAtNumber = new Date(reviewedAt).getTime();
    if (!Number.isFinite(reviewedAtNumber)) throw new Error("invalid review time");
    if (attestedAtMs < BigInt(reviewedAtNumber)) {
      errors.push("offchain attestation predates the completed review");
    }
    const maxDateMs = 8_640_000_000_000_000n;
    if (attestedAtMs < 0n || attestedAtMs > maxDateMs) {
      throw new Error("timestamp is outside the supported date range");
    }
    attestedAt = new Date(Number(attestedAtMs)).toISOString().replace(/\.000Z$/, "Z");
  } catch {
    errors.push("offchain attestation time is not a valid Unix timestamp");
  }

  try {
    const calculatedUID = offchainAttestationUID(signed.message);
    if (lowerString(signed.uid) !== calculatedUID) {
      errors.push(`offchain attestation UID is ${signed.uid}, expected ${calculatedUID}`);
    }
  } catch (error) {
    errors.push(`could not derive the offchain attestation UID (${error.message})`);
  }

  try {
    const signature = Signature.from({
      r: signed.signature.r,
      s: signed.signature.s,
      v: Number(signed.signature.v),
    }).serialized;
    const recovered = verifyTypedData(
      EAS_DOMAIN,
      EAS_ATTEST_TYPES,
      signed.message,
      signature,
    ).toLowerCase();
    if (recovered !== signer) {
      errors.push(`signature recovers ${recovered}, expected ${signer}`);
    }
  } catch (error) {
    errors.push(`could not cryptographically verify EAS signature (${error.message})`);
  }

  if (errors.length) return { errors, details: null };
  return {
    errors,
    details: {
      uid: signed.uid.toLowerCase(),
      signer,
      schemaUID: signed.message.schema.toLowerCase(),
      descriptorHash: signed.message.data.toLowerCase(),
      attestedAt,
      chainId: EAS_DOMAIN.chainId,
      contract: EAS_DOMAIN.verifyingContract.toLowerCase(),
    },
  };
}

export function validateAttestationReport(report, audit) {
  const errors = [];
  const lowerReport = report.toLowerCase();
  const requiredValues = [
    ["attester", audit.auditor.id.split(":").at(-1)],
    ["ERC-8176 schema UID", audit.attestation.schemaUID],
    ["attestation UID", audit.attestation.uid],
    ["descriptor hash", audit.descriptor.hash.value],
  ];
  for (const [label, value] of requiredValues) {
    if (!lowerReport.includes(value.toLowerCase())) {
      errors.push(`approved report does not identify the ${label}: ${value}`);
    }
  }
  if (!report.includes(audit.attestation.file)) {
    errors.push(`approved report does not identify the raw attestation file: ${audit.attestation.file}`);
  }
  return errors;
}
