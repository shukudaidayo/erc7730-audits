# ERC-7730 Descriptor Audit Policy

Policy version: `1.2.0`

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
- Every user-visible identity value in `metadata` accurately identifies the
  contract or message target and is supported by recorded authoritative
  evidence.
- The descriptor's internal references, conditional visibility, nested-data
  formatters, encryption behavior, and fallbacks do not conceal or misrepresent
  information material to the authorization.
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
guarantee that a transaction will succeed or produce its intended downstream
outcome, a guarantee of future behavior, or a statement that every callable
function is covered. It does not require a descriptor to detect every invalid
or unsafe input or predict application state unavailable at signing time. It
does require the display to distinguish the action being authorized from any
conditional outcome: user-facing text must claim only what the signed data and
enforceable context establish. Outcome-neutral language can satisfy this
requirement when the fields still disclose the complete material authorization.
Approval also does not state that the descriptor covers every known relevant
deployment. Important omitted functions and known relevant deployments absent
from the descriptor must be listed as limitations.

## Required Review Steps

### 1. Project and Provenance

- Confirm the project URL and purpose.
- Confirm that every user-visible identity value in `metadata`, including
  `owner`, `contractName`, and `info`, accurately identifies the contract or
  message target. When `owner` names a person or organization, require
  authoritative evidence that the entity created, maintains, governs, or
  officially operates that target, or is its intended counterparty or
  beneficiary. Do not infer this relationship solely from the descriptor
  submitter, deployer address, repository namespace, or a URL declared by the
  descriptor. When no single source documents the exact relationship, multiple
  independent facts can establish it in combination. Record each fact and
  explain why the combination is sufficient. Treat a deployment's absence from
  project documentation as contradictory evidence only when the documentation
  claims to be complete or otherwise excludes that deployment. If no person or
  organization has that relationship, confirm that `owner` names the
  established protocol or project, or that the field is omitted. Treat `owner`
  as a displayed identity rather than an assertion that the named entity is an
  onchain owner or administrator. When the evidence establishes development
  provenance but not current control, operation, a counterparty relationship,
  or a beneficiary relationship, state that distinction explicitly. Record the
  evidence and rationale.
- Mention an external security audit, review, or formal verification only when
  it provides material evidence for the descriptor review. Identify the
  reviewer, reviewed source or bytecode, version, scope, and specific claim it
  supports. Do not treat an audit as general assurance or as a substitute for
  reviewing verified source and authoritative specifications, and keep
  deployment or source provenance separate from security-review evidence.
- Verify every other metadata value that can affect displayed content or a
  binding condition, including `info.deploymentDate`, token name, ticker, and
  decimals, and every referenced constant, enum, and map entry. Record an
  authoritative source for each value. For a map, verify the key path and the
  behavior for both resolved and unresolved keys.
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
- For a factory-bound contract context, verify the source of every declared
  factory deployment, the `deployEvent` signature, and the method used to
  associate an emitted event with a target contract. Establish that every
  target accepted by the context executes the reviewed behavior and satisfies
  the necessary display-binding constraints. Do not approve a context through
  which the factory can introduce an incompatible target.
- For an EIP-712 context, verify every declared domain value, domain separator,
  and deployment against the message producer and the code or authoritative
  specification that consumes the signature. Determine whether an omitted or
  variable domain value can bind the descriptor to an unrelated message or
  permit unintended cross-chain, cross-contract, or cross-version replay.

### 3. Descriptor Correctness

For every entry in `display.formats`:

- Derive and verify the function selector or EIP-712 type identity, and compare
  the signature, parameter names, types, and order with the verified ABI and
  implementation source. If the descriptor contains the deprecated
  `context.contract.abi` or `context.eip712.schemas` field, verify that it also
  matches the reviewed source or type definitions and does not conflict with
  `display.formats`.
- Trace each function path that can change the displayed intent or fields, and
  confirm that the intent text is accurate for every reachable in-scope path.
- Determine whether the displayed intent or fields claim an outcome that the
  signed transaction or message does not establish by itself. Examples include
  bridge or cross-chain delivery, offchain service execution,
  application-specific signature or proof validation, rollup settlement, and
  consensus-layer acceptance. Review the authoritative specification or
  implementation for that processing, and keep the signed submission,
  successful EVM execution when applicable, downstream acceptance, and final
  outcome distinct. Do not approve a display that presents a conditional
  outcome as established. Do not require the descriptor to validate every
  downstream precondition when outcome-neutral language and the displayed
  fields accurately describe the complete authorization.
- Confirm that every user-visible text and layout directive is accurate and
  unambiguous, including each `intent` variant, `interpolatedIntent`, field and
  group label, field order, separator, group path, and array iteration mode.
  Verify every interpolation path and its fallback to `intent`, and determine
  whether inserted values, empty arrays, unequal array lengths, or supported
  nesting can produce a misleading description.
- Resolve every `display.definitions` and `$ref` use, including its `path`,
  literal `value`, `params`, `separator`, `visible`, and `encryption` overrides,
  and audit the final effective formatter at every use. Apply the same
  requirement to constants, enums, maps, and formatter paths that select or
  transform a value.
- Evaluate every `visible` rule for every value-dependent branch. A field set to
  `never`, `optional`, or conditionally hidden must not omit information material
  to the authorization. Confirm that each `ifNotIn` or `mustMatch` condition has
  the intended type and values and matches the reviewed behavior. Every value
  hidden by `ifNotIn` must be safe to omit, and a value outside a `mustMatch`
  permitted set must cause a safe failure.
- Confirm formatted values use the correct parameter, token, decimals, units,
  address type, and trusted external-data source.
- For every `bytes` or fixed-bytes value, determine whether an authoritative
  source or specification defines a tagged, packed, or otherwise structured
  value with material subfields, such as an address, mode, asset identifier,
  permission, signature, or proof. Do not treat a complete raw-byte display as
  sufficient solely because no bytes are omitted. When the declared schema can
  expose the material structure, require a human-readable type and subfields and
  test each output-changing variant. When it cannot, determine whether accurate
  neutral text plus the raw value is sufficient or whether the function format
  must be omitted.
- For a formatter that derives meaning from another object, lookup, chain, or
  descriptor, verify all parameters, trust assumptions, and fallback behavior.
  This includes address-name and interoperable-address types, sources,
  `senderAddress` aliases, and raw fallbacks; token and NFT identity;
  native-currency aliases; token thresholds and messages; cross-chain token
  lookups; dates, durations, units, enums, and chain IDs; and embedded calldata.
  For embedded calldata, verify the effective callee, selector,
  native-currency amount, spender, nested descriptor resolution, and behavior
  when nested decoding is unavailable. Record the exact hash and source of
  every nested descriptor used in testing; approval of the outer descriptor
  does not approve the nested descriptor. Do not approve an opaque fallback
  that conceals a material nested authorization.
- For every encrypted field, verify the encryption scheme, plaintext type,
  decrypted formatter, and fallback label against the production behavior.
  Confirm that successful decryption renders the complete material value and
  that failed or unsupported decryption cannot cause the signer to authorize a
  materially undisclosed action.
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
  proposed or later version. A condition requires a descriptor constraint only
  when it can change the displayed meaning. Do not approve a format if the
  schema cannot express a necessary condition and the descriptor cannot remain
  accurate by fully parameterizing the display, using outcome-neutral text, or
  omitting the function. Examples include a hidden branch, mutable external
  target, time or environment condition, or wrapper composition that changes
  what the display claims.

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
- Require at least one typical successful rendering test per included format,
  and add relevant boundary cases, such as zero, maximum values, special
  addresses, unlimited approvals, empty arrays, and malformed or unsupported
  paths. Use the error-path method below instead of a rendering fixture when a
  case is expected to fail. When an intended outcome requires downstream
  processing, do not classify EVM success alone as an end-to-end successful
  case.
- Exercise every applicable output-changing branch of intent interpolation,
  visibility, reference and map resolution, external lookup, array iteration,
  nested calldata, and encryption. Record the expected successful, fallback,
  or error behavior for each branch.
- Make each fixture reproducible by preferring real transaction data and
  recording the exact external token and name metadata it uses. State whether
  a real transaction establishes only rendering, successful EVM execution,
  downstream acceptance, or the final outcome, and do not infer more than the
  preserved evidence supports.
- Confirm that each successful test checks the complete relevant output by
  comparing the rendered intent, owner, labels, group structure, field order,
  separators, and every displayed value with the expected result recorded in
  the fixture. For each applicable path expected to fail, confirm the failure
  with the Sourcify runner when it can express the check. Otherwise, record the
  exact input, expected rejection and its basis, observed error, tool versions,
  and exact reproduction method. Do not treat an expected error as a successful
  rendering test.

## Findings and Limitations

An unfinished review step is neither a finding nor a limitation. Keep the audit
in `draft` status until the required work is complete or the evidence supports
another result.

A blocking finding prevents an attestation. Examples include an incorrect
selector, wrong recipient or spender, incorrect decimals, hidden behavior that
contradicts the intent, materially false or misleading identity metadata, a
`context` that can match the wrong contract or message, or an upgrade or state
change that can alter the displayed meaning but the descriptor does not
constrain.

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
- Set `reviewedAt` when the review evidence and conclusion are complete. Before
  the dossier is merged, refresh it after any material change to the evidence,
  findings, limitations, or conclusion, and regenerate the discovery indexes.
  Do not change `reviewedAt` merely because a later attestation is recorded.
- After publishing a `needs-changes` or `rejected` dossier, report the findings
  through the upstream project's appropriate public issue or private security
  channel. When the report is public, link its immutable repository URL rather
  than copying the full evidence into the issue. Do not issue a positive
  attestation while waiting for upstream resolution.
