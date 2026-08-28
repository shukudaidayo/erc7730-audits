# ERC-7730 Descriptor Audit Policy

Policy version: `1.0.0`

## Policy Conventions

- Each bullet under *Required Review Steps* represents one independently
  answerable audit question. Each bullet under *Lifecycle* represents one
  post-audit requirement. Supporting checks, evidence, exceptions, and
  consequences stay in the same bullet as the requirement they qualify.
- Imperative terms such as “confirm,” “identify,” “record,” “verify,” “require,”
  and “do not” state approval requirements. “Prefer” states a recommendation
  and does not by itself determine the result.
- “Every” and “all” require complete coverage within the stated scope. Sampling
  is not sufficient.
- If a conditional requirement does not apply, record that conclusion and its
  rationale. An unfinished check is not “not applicable.”
- Examples introduced by “such as” or “examples include” are not exhaustive.

## Evidence Hash Conventions

- Use the ERC-8176 descriptor hash for descriptor, schema, dependency, and
  resolved-descriptor JSON. This is a Keccak-256 hash of RFC 8785 canonical
  JSON, not a hash of the file's raw bytes.
- Use the chain's block hash to identify the exact observation block, and use
  Keccak-256 of deployed runtime bytecode for each runtime bytecode hash.
- Use SHA-256 of the saved raw file bytes for external test-data snapshots.
  The recorded value proves which local snapshot was used; it does not make the
  external source authoritative.

## Meaning of Approval

A completed review first uses `ready-for-attestation`. It becomes `approved`
only after the auditor creates and records the positive ERC-8176 attestation.
An `approved` result states that, for the exact ERC-8176 descriptor hash:

- The descriptor is valid under the declared ERC-7730 schema version.
- The descriptor's `context` correctly limits it to the intended contract
  deployments or EIP-712 domain.
- Every entry in `display.formats` matches the relevant ABI or EIP-712 type and
  the behavior in verified source.
- Each rendered transaction shows the information a user needs to understand
  what they are authorizing, and every displayed value is formatted correctly.
- For each deployment, the report identifies any proxy or
  administrator-controlled onchain state that can change the displayed meaning.
  The auditor does not approve an affected format unless the descriptor can
  enforce the necessary implementation, facet, and state constraints.
- The recorded tests exercise every reviewed format and reproduce the documented
  intent, fields, and values using the recorded tool versions and test data.

Approval is not a contract security audit, an endorsement of the project, a
guarantee of future behavior, or a statement that every callable function is
covered. It also does not state that the descriptor covers every known relevant
deployment. Important omitted functions and known relevant deployments absent
from the descriptor must be listed as limitations.

## Required Review Steps

### 1. Project and Provenance

- Confirm the project URL and purpose.
- Confirm the descriptor submitter has a clear connection to the project, or
  record that the descriptor is community supplied.
- Identify known relevant deployments documented by the project, a chain
  operator, or another clearly identified authoritative source, and compare
  them with the descriptor's context. The auditor is not required to find
  arbitrary forks, unofficial copies, or every contract with a similar ABI.
- Record the exact registry repository, 40-character commit, and descriptor
  path.
- Snapshot the descriptor's declared ERC-7730 schema, record its content hash,
  and validate the descriptor against that exact snapshot.

### 2. Contract and Source Verification

- Before the function-level review, classify every declared deployment as a
  directly verified contract, a proxy whose reviewed implementation or facet
  can be bound by the descriptor, or a deployment that cannot satisfy the
  source-verification or binding requirements. Record the applicable result as
  `pass-direct`, `pass-bindable-proxy`, `fail-source-verification`, or
  `fail-descriptor-binding`. Do not spend the rest of the approval review on a
  deployment that already fails this pre-filter; keep the dossier in `draft`,
  or record the supported negative result.
- Treat every deployment declared by the descriptor as in scope. Do not narrow
  the review to a subset of the declared deployments. If any declared
  deployment cannot satisfy the review requirements, do not approve the
  descriptor.
- Verify the source of every declared deployment through Sourcify. For a
  proxied deployment, this requirement applies to the proxy and every
  implementation that executes a reviewed format. For an EIP-2535 diamond, it
  applies to every facet to which a reviewed selector is mapped. If Sourcify
  supports the chain but does not verify a required contract, do not approve
  the descriptor. If Sourcify does not support the chain, use the chain
  explorer and record the verified-source URL.
- Confirm that the reviewed chain state can be reproduced by recording the
  observation block, block hash, and runtime bytecode hash.
- When deciding whether a deployment omitted from the descriptor could use the
  same descriptor, do not require byte-identical runtime code. Independently
  confirm that every reviewed selector has the same ABI, user-visible behavior,
  asset and native-currency semantics, and display-relevant mutable state. If
  any of those differ, do not classify the deployment as compatible.

### 3. Descriptor Correctness

For every entry in `display.formats`:

- Derive and verify the function selector or EIP-712 type identity, and compare
  the signature, parameter names, types, and order with the verified ABI and
  implementation source.
- Trace each function path that can change the displayed intent or fields, and
  confirm that the intent text is accurate for every reachable in-scope path.
- Confirm formatted values use the correct parameter, token, decimals, units,
  address type, and trusted external-data source.
- Confirm that the rendered output clearly identifies any asset approval, asset
  transfer, recipient, spender, or privileged action. Show the affected asset,
  amount, authorization scope, account, or role when applicable.
- For every reviewed calldata function, determine whether native currency can
  accompany the call and how `msg.value` is used. If a nonzero value can be
  transferred or can change the function's behavior, confirm that the rendered
  output displays `@.value` with the correct native asset and amount. Test
  zero-value and nonzero-value cases when relevant.
- Confirm that the complete user-facing description is accurate by rendering
  representative transactions, not only by inspecting the descriptor JSON.

For the descriptor as a whole:

- Identify important contract functions intentionally omitted from
  clear-signing coverage, and record each omission as a limitation.

### 4. Changes to the Displayed Meaning

- Determine whether the contract uses a standardized proxy, custom proxy,
  diamond, or `delegatecall` router. At a specific block and block hash, record
  the implementation that executes each reviewed function. For an EIP-2535
  diamond, record the facet mapped to each reviewed selector.
- Identify administrator-controlled onchain state that the reviewed functions
  read, directly or indirectly, and determine whether changing it can alter the
  displayed intent or fields. For each value that can, record the contract
  address, storage slot, raw value, applicable mask, purpose, and affected
  formats at the observation block. If no such value exists, record that
  conclusion in the display-binding rationale.
- Confirm that the descriptor can enforce the implementation, facet, and state
  constraints needed to keep the display accurate. Evaluate only constraints
  available under the descriptor's declared schema version, not fields from a
  proposed or later version. Do not approve a format if that schema cannot
  express a condition that can make its display misleading, such as a hidden
  branch, mutable external target, time or environment condition, or wrapper
  composition.

### 5. Includes and Dependencies

- Make every `includes` dependency reproducible by resolving it as the formatter
  under test does. For every included descriptor, save a local dependency
  snapshot or immutable source reference, and record an ERC-8176-compatible
  content hash and source commit.
- Fix the exact resolved content covered by the audit by saving and hashing the
  fully resolved descriptor used for hashing, validation, and rendering tests.
  Because included content becomes part of that descriptor, require a new
  review whenever a dependency changes.

### 6. Tests

- Use the Sourcify clear-signing test runner by default. Record its exact Git
  commit and installed package versions, and preserve its unmodified result
  file. For external chain information, preserve and hash only the chain name
  and native-currency values resolved for the tested cases, together with their
  source and capture time. Record any chain IDs resolved by a cross-chain format
  that cannot be derived from the transaction or EIP-712 domain. If the runner
  cannot exercise an applicable descriptor feature, record the limitation and
  the exact alternative test method.
- Require at least one typical successful transaction test per included format,
  and add relevant boundary cases, such as zero, maximum values, special
  addresses, unlimited approvals, empty arrays, and malformed or unsupported
  paths.
- Make each fixture reproducible by preferring real transaction data and
  recording the exact external token and name metadata it uses.
- Confirm that each successful test checks the complete relevant output by
  comparing the rendered intent, owner, field order, and every displayed value
  with the expected result recorded in the fixture. For a negative test,
  compare the observed failure with the expected error.

## Findings and Limitations

An unfinished review step is neither a finding nor a limitation. Keep the audit
in `draft` status until the required work is complete or the evidence supports
another result.

A blocking finding prevents an attestation. Examples include an incorrect
selector, wrong recipient or spender, incorrect decimals, hidden behavior that
contradicts the intent, a `context` that can match the wrong contract or
message, or an upgrade or state change that can alter the displayed meaning but
the descriptor does not constrain.

A limitation identifies what the review does not cover without asserting that
an included format or declared deployment is wrong. Examples include an
important omitted selector, a known relevant deployment not included in the
descriptor, or a formatter feature unsupported by the selected test runner.

For an omitted deployment, record its CAIP-10 identifier, authoritative source,
and coverage impact. When it makes the reason clearer, classify it as
`compatible-not-included`, `proxy-not-bindable`, `source-not-verified`,
`behavior-not-compatible`, or `legacy-network`. This classification is
optional, and it does not require a separate deployment-survey artifact.

## Lifecycle

- Treat each descriptor hash and contract upgrade as a separate audit subject.
  Sign only the exact descriptor version reviewed, and never reuse its
  attestation for changed content.
- Create a positive attestation only after completing the review. Use an EAS
  version 2 offchain attestation under the canonical ERC-8176 schema and
  Ethereum mainnet EAS domain, with the descriptor hash as its data, the zero
  recipient and reference UID, no expiration, and revocation enabled.
- Use `ready-for-attestation` after all review requirements pass but before the
  positive attestation is recorded. Change the result to `approved` only when
  the raw attestation export is present and verified.
- Keep approved records append-only. Record each later lifecycle change as a
  new event without editing the original audit or attestation.
- Revoke the attestation through EAS if the auditor no longer endorses the
  approval or the signer is compromised, and record it in a revocation event.
- Use a supersession event when a newer approved dossier should be preferred,
  but the earlier approval is not known to be wrong.
- Use a correction event to state corrected information about an existing
  dossier file without editing that file. The correction must not change the
  descriptor, evidence, or approval conclusion. Revoke the attestation instead
  if the correction would change its claim.
