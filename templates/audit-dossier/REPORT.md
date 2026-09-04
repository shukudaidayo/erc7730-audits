# ERC-7730 Descriptor Audit: REPLACE_DESCRIPTOR

## Result

Status: **draft**

Summarize the conclusion in one paragraph. State what the approval means and
call out any important coverage limitation. Keep supporting checks that passed
in their applicable sections rather than repeating them here.

## Descriptor Identity

| Field | Value |
| --- | --- |
| Project | REPLACE_PROJECT |
| Registry commit | `REPLACE_FULL_COMMIT` |
| Registry path | REPLACE_SOURCE_PATH |
| ERC-7730 version | `REPLACE_VERSION` |
| ERC-7730 schema hash | `0xREPLACE_SCHEMA_HASH` |
| Audit policy version | `REPLACE_POLICY_VERSION` |
| ERC-8176 hash | `0xREPLACE_DESCRIPTOR_HASH` |
| Auditor | `eip155:1:0xREPLACE_AUDITOR` |
| Dossier created | `REPLACE_CREATED_AT` |
| Review completed | `REPLACE_REVIEWED_AT` |

## Scope

List every deployment declared by the descriptor and every display format
reviewed. All declared deployments must be reviewed before approval. Separately
identify important omitted functions and known relevant deployments that the
descriptor does not include.

## Project and Provenance

Record the project URL and purpose. Identify the descriptor submitter's
connection to the project, or state that the descriptor is community supplied.
List every user-visible identity value in `metadata`, including `owner`,
`contractName`, and `info`, and cite authoritative support for each value. Keep
the descriptor submitter, contract deployer or administrator, and displayed
owner or target distinct. If `owner` names a person or organization, explain
whether that entity created, maintains, governs, or officially operates the
target, or is its intended counterparty or beneficiary. If it instead names a
protocol or project, explain why that is the established identity. A URL
declared by the descriptor is a claim to verify, not evidence by itself.
When no single source documents the exact relationship, record each independent
fact and explain why the combination is sufficient. Do not treat an omission
from project documentation as contradictory unless the documentation claims to
be complete or otherwise excludes the deployment.

Treat `owner` as a displayed identity, not necessarily an onchain owner or
administrator. If the evidence supports development provenance but not current
control, operation, a counterparty relationship, or a beneficiary relationship,
state that distinction.

Mention an external audit, review, or formal verification only when it provides
material evidence for the descriptor review. Identify the reviewer, reviewed
source or bytecode, version, scope, and specific claim it supports. Do not treat
it as general assurance or as a substitute for reviewing verified source and
authoritative specifications. Keep deployed-source provenance separate from
security-review evidence.

Record authoritative support for every other metadata value that affects a
display or binding condition, including deployment date, token metadata,
constants, enums, and maps. For every used map, document its key path and its
resolved-key and unresolved-key behavior.

List the known relevant deployments found in project, chain-operator, or other
authoritative documentation, cite those sources, and compare the list with the
descriptor's context. Arbitrary forks and contracts that merely share an ABI
are outside this survey.

Record the registry repository, commit, and descriptor path. Identify the exact
ERC-7730 schema snapshot used for validation and its content hash.

## Contract and Source Verification

For every declared deployment, record its Sourcify status and URL, observation
block and block hash, and runtime bytecode hash. For a proxy, do the same source
verification for the proxy and every implementation that executes a reviewed
format. For an EIP-2535 diamond, do it for every facet mapped to a reviewed
selector. If Sourcify does not support the chain, identify the fallback block
explorer, record its verified-source URL, and explain why the fallback applies.

Record the pre-filter classification for each deployment: `pass-direct`,
`pass-bindable-proxy`, `fail-source-verification`, or
`fail-descriptor-binding`. Stop the approval review if a declared deployment
has either failure result.

Summarize the comparison of every reviewed signature, parameter name, type, and
order with the verified ABI and implementation source.

For a factory context, document the verified factory, deployment event, target
association method, and why every accepted target has the reviewed behavior.
For an EIP-712 context, document every domain constraint, domain separator,
deployment, signature consumer, and replay boundary. If deprecated `abi` or
`schemas` fields are present, reconcile them with the source, type definitions,
and display formats.

## Function-by-Function Review

### `REPLACE_FUNCTION_SIGNATURE`

- Selector or type identity, ABI, and source comparison:
- Reachable execution paths and displayed intent:
- Outcome dependencies and downstream processing:
- Intent variants, interpolation, labels, grouping, and array behavior:
- Definitions, references, map key derivation, matching, and no-match behavior,
  overrides, and conditional visibility:
- Fields, formatting, and external-data sources:
- Tagged, packed, or otherwise structured byte fields:
- Nested calldata, lookup fallbacks, and encrypted-field behavior:
- Assets, approvals, transfers, recipients, spenders, and privileged actions:
- Native-currency behavior and `@.value` handling, whether referenced or
  omitted:
- Representative rendered output:
- Result:

Repeat for every format in the descriptor. If a conditional check does not
apply, record that conclusion and its rationale. Do not mark unfinished work as
not applicable.

## Proxy and Intent-Mutability Analysis

State whether each deployment is immutable, proxied, a diamond, or otherwise
mutable. At the observation block and block hash, record the implementation that
executes each reviewed format. For an EIP-2535 diamond, record the facet mapped
to each reviewed selector.

Identify each mutable onchain value that a reviewed function reads, directly or
indirectly, and that can change the displayed intent or fields. Include values
held by external contracts, regardless of who or what can change them. Record
the contract address, storage slot, raw value, applicable mask, purpose,
affected formats, and supporting evidence in `deployments.json`. If no such
value exists, record that conclusion in the display-binding rationale.

Give each reviewed format one of the following binding results for every
deployment:

- `not-required`: no proxy upgrade or relevant mutable state can change the
  display.
- `enforced`: the descriptor constrains every relevant implementation or facet
  address and state value. Record the descriptor paths that enforce the
  constraints.
- `not-enforceable`: the declared ERC-7730 schema cannot express a necessary
  constraint. Treat this as a blocking finding.

Do not rely on fields that exist only in a proposed or later ERC-7730 version.
The structured conclusions and observed values belong in `deployments.json`.

## Includes and External Data

List every direct and transitive included descriptor. Record its declared and
resolved references, repository, source commit, path, content hash, and local
snapshot when available. Record the snapshot and hash of the fully resolved
descriptor used for hashing, validation, and rendering tests.

Describe token metadata, address-name, ENS, block, or other external-data trust
assumptions used by the formatter. Confirm that the exact external metadata used
by each test is recorded in its fixture.

For every nested descriptor used to decode embedded calldata, record its exact
source, hash, selection rule, and approval status. State explicitly that this
audit of the outer descriptor does not approve the nested descriptor.

## Testing

Record the exact Sourcify runner command, Git commit, and installed package
versions. Identify the preserved unmodified result file and the capture time,
source, filename, and raw-file SHA-256 hash of each compact external-data
snapshot. List any additional chain-information lookups declared for a
cross-chain format. Summarize normal-path and boundary fixtures for every
reviewed format, including zero-value and nonzero-value cases when `msg.value`
is relevant, even if the descriptor does not reference `@.value`. Explain why
any normally applicable boundary case was not tested. Exercise every applicable
success, fallback, and error branch for interpolation, visibility, reference and
map key matching and no-match behavior, external lookups, array iteration,
nested calldata, and encryption. Confirm that the rendered intent, owner,
labels, field order, separators, and every displayed value match the expected
result in the fixture. For each applicable path expected to fail, state whether
Sourcify reproduced the error. If the runner could not express the check, record
the exact input, expected rejection and its basis, observed error, tool
versions, and exact reproduction method. Do not describe an expected error as a
successful rendering test.

For each real transaction fixture, state whether it establishes rendering,
successful EVM execution, downstream acceptance, or the final outcome. Do not
use EVM success alone as evidence of an outcome completed by another system.

## Findings

List blocking and non-blocking findings using the IDs in `audit.json`. If none,
write “None.” For each finding, put its severity and blocking status on
separate lines using this format:

Severity: **High**\
Blocking: **Yes**

## Coverage Limitations

List important omitted functions, known relevant deployments absent from the
descriptor, and other scope limitations. For an omitted deployment, record its
chain, address, authoritative source, and the resulting lack of clear-signing
coverage. Optionally classify the reason as `compatible-not-included`,
`proxy-not-bindable`, `source-not-verified`, `behavior-not-compatible`, or
`legacy-network`. Byte-identical runtime code is not required for compatibility,
but the reviewed selectors, ABI, user-visible behavior, asset and native-currency
semantics, and display-relevant mutable state must match. Explain what a wallet
should do when it encounters an uncovered selector or deployment.

## Hash Glossary

- ERC-8176 hash: Keccak-256 of RFC 8785 canonical JSON for the descriptor,
  schema, dependency, or resolved-descriptor snapshot.
- Observation block hash: the chain's identifier for the exact state observed.
- Runtime bytecode hash: Keccak-256 of deployed runtime bytecode.
- External-data hash: SHA-256 of the saved raw snapshot bytes.

## Attestation

For an approved audit, record the EAS schema UID, offchain attestation UID,
signer, and raw attestation filename. For `ready-for-attestation`, state that the
review passed but the positive attestation has not been created. For `draft`,
`needs-changes`, or `rejected`, state that no positive attestation was issued.
