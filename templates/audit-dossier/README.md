# Audit dossier template

Create dossiers with `node scripts/new-audit.mjs` so the directory name and
descriptor hash cannot drift apart. The generator copies the descriptor and
schema byte-for-byte, initializes the JSON records, and fills in the report's
identity fields. Only the report uses string substitution.

The generator creates a `draft`. Before publishing:

- Replace every remaining `REPLACE_...` value.
- Keep the generated ERC-7730 schema snapshot and its hash unchanged.
- Record the project URL and purpose, the submitter's relationship to the
  project, and the authoritative sources used to identify known relevant
  deployments.
- Classify every declared deployment before the function-level review as
  `pass-direct`, `pass-bindable-proxy`, `fail-source-verification`, or
  `fail-descriptor-binding`.
- Populate every format and deployment declared by the descriptor.
- Complete every function-level question in `REPORT.md`. For a conditional
  requirement that does not apply, record the conclusion and rationale instead
  of leaving the item unfinished.
- Give every reviewed format a display-binding result for every deployment.
- Record an observation block and block hash, runtime bytecode hash, proxy
  evidence, and explicit Sourcify status for every deployment. For a proxy,
  record source verification and runtime bytecode hashes for every implementation
  that executes a reviewed format. For an EIP-2535 diamond, also record the
  selectors mapped to each facet.
- Record every administrator-controlled state value that can change a reviewed
  display, including its contract, slot, raw value, applicable mask, purpose,
  affected formats, and evidence. If none exists, say so in the display-binding
  rationale.
- Add findings and limitations, even when the arrays remain empty.
- Replace the example tests with the exact fixture used during review. Mark each
  test as `typical`, `boundary`, or `negative`, provide at least one typical test
  per reviewed format, and record the rationale for the selected boundary cases
  in `audit.json`.
- Record every direct and transitive included dependency, its source commit, its
  content hash, and either a local snapshot or an immutable repository and path.
  Save and hash a resolved descriptor when the descriptor uses `includes`.
- Delete instructional comments from `REPORT.md`.
- Run the exact generated `scripts/run-audit-tests.mjs` command. Preserve the
  unmodified Sourcify result file and the compact, hashed chain-information
  snapshot that the wrapper records. Declare extra cross-chain lookups in
  `tests.json` when they cannot be derived from a transaction or EIP-712 domain.
- When the review reaches a conclusion, replace `draft` with the correct final
  status and add `reviewedAt` to `audit.json`.
- Use `ready-for-attestation` when every review requirement passes but the
  positive attestation has not yet been created.
- Follow the shared [attestation guide](../../README.md#create-an-attestation)
  to sign, save the raw export, and record the approval, then run
  [validation](../../README.md#validation).
- For `draft`, `ready-for-attestation`, `needs-changes`, or `rejected`, remove
  the `attestation` object entirely.

Never place signing keys or wallet secrets in a dossier.
