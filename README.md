# ERC-7730 audits

This repository publishes reproducible reviews and ERC-8176 attestations for
ERC-7730 clear-signing descriptors.

An approval applies only to the exact descriptor hash recorded in an audit.
It means that the descriptor accurately represents the reviewed functions under
the declared binding context and the audit policy in effect at the time. It is
not a security audit or endorsement of the underlying contract or protocol, and
it does not imply that every contract function has clear-signing coverage.

## Repository model

Every completed review is an immutable dossier:

```text
audits/<project>/<descriptor-slug>/<erc8176-descriptor-hash>/
  audit.json
  REPORT.md
  descriptor.json
  erc7730-schema.json
  tests.json
  test-results.json                       # unmodified renderer output
  test-chain-info.json                    # resolved chain values used by tests
  dependencies.json
  deployments.json
  resolved-descriptor.json                 # descriptors with includes only
  dependency-snapshots/                    # when local snapshots are used
  events/                                  # append-only lifecycle events
  <descriptor-slug>.eip155-1-0xAUDITOR.json   # approved reviews only
```

The full ERC-8176 descriptor hash is the audit's primary identity. Project
names, descriptor names, repository paths, and Git commits are supporting
provenance, not substitutes for the descriptor hash.

- `audit.json` is the authoritative, machine-readable result.
- `REPORT.md` explains the reasoning and limitations for humans.
- `descriptor.json` is the exact descriptor snapshot that was reviewed.
- `erc7730-schema.json` is the exact declared schema used to validate it.
- `tests.json` is the exact, schema-validated fixture used for rendering checks.
  Its `$schema` identifies the immutable fixture-schema version; new dossiers
  use `tests-v2.schema.json`, while existing dossiers retain their original
  version.
- `test-results.json` preserves the Sourcify runner's unmodified output.
- `test-chain-info.json` preserves only the chain name and native-currency
  values resolved for the tested cases; `audit.json` records their source,
  capture time, and raw-file SHA-256 hash.
- `dependencies.json` pins any files reached through `includes`.
- `deployments.json` records source, bytecode, proxy, and state observations.
- `events/*.json` records a later revocation, supersession, or correction
  without changing the original audit files.
- `<descriptor-slug>.eip155-1-<auditor-address>.json` is the unmodified EAS
  offchain attestation export. Its filename matches the upstream registry.
- `audit-tools.json` is the repository-wide Sourcify runner repository, commit,
  package, and version pin used for new test runs.
- `indexes/` contains generated discovery indexes and is never edited by hand.
  Its deterministic `latestRecordAt` value is the latest review, attestation,
  or lifecycle-event time represented in the index. A descriptor-hash entry
  exposes the signed attestation's file, UID, and time.

## Status meanings

| Status | Meaning | ERC-8176 attestation |
| --- | --- | --- |
| `draft` | The review is still in progress | Forbidden |
| `ready-for-attestation` | The descriptor passed review, but has not been attested | Forbidden |
| `approved` | The exact descriptor passed the policy | Required |
| `needs-changes` | Review evidence shows blocking corrections are required | Forbidden |
| `rejected` | The descriptor is materially misleading or unsafe | Forbidden |

Only `approved` means that a positive attestation was issued. Drafts and
`ready-for-attestation` dossiers are omitted from the generated discovery
indexes. Omissions that do not make an included format or declared deployment
incorrect are recorded as explicit coverage limitations.

`revoked` and `superseded` are effective lifecycle statuses derived from
append-only events, not values stored in `audit.json`. A revocation means the
auditor revoked the attestation through EAS and no longer endorses the approval.
A supersession means a newer dossier should be preferred without asserting that
the old approval was wrong. A correction event does not change status.

A deployment listed in the descriptor is part of the approval claim and must
be reviewed. A known relevant deployment that the descriptor does not list is
outside its binding context; record that absence as a limitation because users
will not receive clear signing there.

Record such a limitation with `type: "omitted-deployment"`, the CAIP-10
deployment identifiers, authoritative source URLs, and the coverage impact.
The optional `reason` classifies it as `compatible-not-included`,
`proxy-not-bindable`, `source-not-verified`, `behavior-not-compatible`, or
`legacy-network`. No separate deployment survey is required.

## Start a review

1. Copy `auditor/profile.example.json` to `auditor/profile.json` and fill in
   the Ethereum account that will sign attestations.
2. Install the repository's dependencies. The Python tooling requires Python
   3.13 or newer; use an isolated environment if possible:

```bash
python3 -m pip install --requirement requirements.txt
npm ci
```

   `requirements.txt` contains Python tooling only. The Sourcify runner is
   pinned separately in `audit-tools.json`; the test wrapper checks out that
   exact commit, installs its locked dependencies, and verifies its package name
   and version. Upgrade either pin deliberately when adopting a new release.
3. Create a dossier. The generator derives the descriptor path and current
   registry commit, reads the auditor account from `auditor/profile.json`, and
   computes the descriptor and schema hashes:

```bash
node scripts/new-audit.mjs weth calldata-weth
```

Project and descriptor arguments must exactly match the registry's
case-sensitive names. Quote an argument when it contains spaces or shell
punctuation. The generator accepts any printable name that is one path
component; it rejects path separators, control characters, `.` and `..`.

The local registry checkout and canonical repository URL are repository-wide
defaults near the top of `scripts/new-audit.mjs`. The generator refuses to use
a descriptor with uncommitted changes because the recorded commit would not
identify the copied snapshot.
It copies the descriptor and schema byte-for-byte, initializes the JSON records,
and fills in the report's identity fields. There is no separate manual hashing
step: the verifier recomputes the hashes when you validate the dossier.

4. Confirm every user-visible identity in the descriptor's `metadata`, and
   record authoritative support in the report. In particular, do not treat the
   submitter, deployer address, repository namespace, or a URL declared by the
   descriptor as sufficient evidence for `owner`. Keep the displayed identity
   distinct from literal onchain ownership or administration, and state when
   the evidence supports development provenance without current control. When
   no single source documents an exact relationship, record the independent
   facts and explain why they establish it in combination. An omission from
   project documentation is contradictory only when the documentation claims
   completeness or otherwise excludes the deployment. Only mention an external
   audit or formal verification when it supports a material descriptor-review
   claim, and identify the reviewer, reviewed source or bytecode, version,
   scope, and specific claim. Do not use it as general assurance or a substitute
   for reviewing verified source and authoritative specifications. Then
   classify each declared deployment before starting the function-level review
   as `pass-direct`, `pass-bindable-proxy`, `fail-source-verification`, or
   `fail-descriptor-binding`. Complete the generated evidence and report only
   after the descriptor passes this pre-filter. The
   dossier remains a `draft` while work is incomplete. All deployments declared
   by the descriptor must be reviewed. For every reviewed format, record a
   `boundaryRationale`, and mark each fixture as `typical` or `boundary`. For
   each format, review any authoritative downstream processing
   on which the displayed outcome depends, and distinguish the signed
   submission, EVM success, downstream acceptance, and final outcome. Inspect
   tagged or packed byte values for material subfields instead of assuming that
   an undivided raw-byte display is sufficient.
5. Run the fixture with the repository's pinned Sourcify test runner:

```bash
node scripts/run-audit-tests.mjs 'audits/<project>/<descriptor>/<descriptor-hash>'
```

   The wrapper checks out the recorded runner commit below `.cache/`, installs
   its locked dependencies, preserves the unmodified result file, and updates
   `audit.json`. It checks that the complete live chain dataset remains stable
   during execution, but saves only the resolved values relevant to the fixture.
   For a cross-chain format, add any lookup chain IDs that are not present in a
   transaction or EIP-712 domain to `additionalChainInfoChainIds` in
   `tests.json`. Inspect the complete rendered output before concluding the
   review. Keep `tests.json` limited to cases expected to render. For an
   applicable path expected to fail that the runner cannot express, record the
   exact input, expected rejection and its basis, observed error, tool versions,
   and exact reproduction method in `REPORT.md`.
6. When every review requirement passes, set the status to
   `ready-for-attestation`, add `reviewedAt`, and make the report's conclusion
   complete. Run `npm run generate-indexes`, then `npm test` before signing, and
   follow [Create an Attestation](#create-an-attestation). If the review does
   not pass, record the appropriate status and findings without issuing an
   attestation.
   Before merging a completed dossier, refresh `reviewedAt` after any material
   change to its evidence, findings, limitations, or conclusion. Regenerate the
   indexes after the final timestamp is set.

## Create an Attestation

Start with a validated `ready-for-attestation` dossier. Use
`audit.json.auditor.id` for the signing account and
`audit.json.descriptor.hash.value` for the descriptor hash. Sign only after the
recorded `reviewedAt` time.

On the canonical ERC-8176 schema page in EAS Scan, choose **Attest with Schema**
and connect your wallet. Create an Ethereum mainnet EAS version 2 offchain
attestation with these values:

- EAS contract: `0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587`.
- Schema UID: `0xe023eef113c1670774801c34b377fdf612dd8a4d2fa92fe382e15bd91fafb5c2`.
- Recipient: leave blank, or enter the zero address. The signed message must
  encode the zero address.
- `descriptorHash`: the exact hash from `audit.json`.
- Expiration Time and Referenced Attestation: leave blank. The signed values
  must be `0` and the zero UID, respectively.
- Revocability: explicitly select **Yes**.
- Attestation type: explicitly select **Offchain**.

Your wallet must show a typed-data signature request without a transaction or
gas charge. Cancel if it asks to submit a transaction. After signing, use
EAS Scan's **Download** button to save the complete raw JSON export. Publishing
it to IPFS or timestamping it onchain is not required. Renaming the export is
permitted, but do not edit, reformat, or wrap its contents.

Save the export in the dossier as
`<descriptor-slug>.eip155-1-<auditor-address>.json`. Add this top-level object to
`audit.json`, using `sig.uid` from the export as its UID and the saved filename
as its `file` value:

```json
{
  "attestation": {
    "type": "eas-offchain",
    "schemaUID": "0xe023eef113c1670774801c34b377fdf612dd8a4d2fa92fe382e15bd91fafb5c2",
    "uid": "0xREPLACE_OFFCHAIN_ATTESTATION_UID",
    "file": "<descriptor-slug>.eip155-1-<auditor-address>.json"
  }
}
```

Set the status in `audit.json` and `REPORT.md` to `approved`, and update the
report's Attestation section with the signer, schema UID, attestation UID,
descriptor hash, and raw filename. Leave `reviewedAt` unchanged. Treat this
approval record as provisional until [Validation](#validation) passes.

Saving the export alone does not verify it: `audit.json.attestation.file` must
reference it. The verifier checks the EAS version, domain, message, derived UID,
signature, signer, review time, descriptor hash, and report consistency. Do not
commit or publish a failed record, and never edit the signed export to repair a
validation failure. Non-approved dossiers must not have an `attestation` object.

## Validation

Before committing or publishing a completed record, run:

```bash
npm run generate-indexes
npm test
```

`npm test` includes both `npm run verify` and the generated-index freshness
check, so there is no need to run either separately. Use `npm run verify` on its
own for an audit-only check during a review. CI runs the same `npm test` command
against the committed records and indexes.

The tests exercise the schemas, dossier generation, shared input rules,
lifecycle events, attestation and report validation, and complete audit verifier.
The verifier validates fixture structure, descriptor coverage, preserved runner
output, the external-data hash, and the recorded result. It does not execute the
renderer command from `audit.json`; rerun that exact command when fresh rendering
evidence is required.

## Publishing Negative Findings Upstream

After a `needs-changes` or `rejected` dossier is merged, open an issue through
the upstream project's appropriate public tracker. Summarize the inaccurate
display and its impact, identify practical current-schema fixes separately from
possible future extensions, and link the immutable audit report for complete
evidence. Keep working drafts outside this repository unless they are intended
to become permanent audit artifacts. Use the project's private security channel
instead when public disclosure would create a material risk.

Do not modify an immutable dossier solely to add the issue URL. The issue links
to the audit, and its own discussion tracks remediation. Do not issue a positive
attestation while the blocking findings remain unresolved.

## Publishing Approved Attestations Upstream

Keeping an attestation here does not make it discoverable to wallets that only
consume the canonical registry. Copy the raw attestation into a registry pull
request at:

```text
registry/<project>/sigs/<descriptor-slug>.eip155-1-0xYourAddress.json
```

The dossier already uses this filename, so copy the export without renaming or
modifying it.

Before opening the pull request, compute the hash of the descriptor currently
in the canonical registry and confirm that it still equals the attested hash.
If it differs, do not publish the old attestation; create a new dossier and
review the changed descriptor. Validate the copied export again, and include
the descriptor hash, attestation UID, and immutable audit-report URL in the pull
request description.

Also submit `auditor/profile.json` to the registry as:

```text
auditors/eip155-1-0xYourAddress/profile.json
```

Follow the current upstream instructions before publishing:
https://github.com/ethereum/clear-signing-erc7730-registry/blob/master/auditors/README.md

## Immutability and corrections

Merged audit dossiers are append-only. Never rewrite an approved audit to point
to different descriptor content, evidence, or conclusions. A changed descriptor
gets a new hash directory and a new review. Record later lifecycle changes in
the dossier's `events/` directory:

- Add a `revocation` event after revoking an attestation through EAS. Retain the
  original attestation and all audit evidence.
- Add a `supersession` event when a newer dossier should be preferred and the
  old approval is not known to be wrong.
- Add a `correction` event to state corrected information about an existing
  dossier file without editing that file. Use it only when the correction does
  not change the approval claim. If the correction changes that claim, revoke
  the attestation and use a revocation event instead.

Copy the applicable file from `templates/audit-events/`, use a UTC filename in
the form `YYYYMMDDTHHMMSSZ-<type>.json`, and regenerate the indexes. Do not edit
`audit.json` to record a lifecycle status.

Before increasing the current audit policy version, save the complete previous
policy as `auditor/policies/<version>.md`. Historical dossiers remain valid only
when their recorded version matches the current policy or one of these immutable
policy snapshots.

Revocation must be performed through EAS. Changing a GitHub field alone does
not cryptographically revoke an attestation. Retain revoked attestations for
historical verification; the revocation event makes the generated status
`revoked`.

## Dependency and upgrade caveats

An `includes` target can affect the rendered descriptor. Record every included
file in `dependencies.json` with either a local snapshot or an immutable
repository and path. Record its source commit in either case. Save the fully
resolved descriptor used for tests, and record ERC-8176 hashes for both the
dependencies and resolved descriptor.

For proxies and other intent-mutable contracts, capture the implementation that
executes each reviewed format. For an EIP-2535 diamond, capture the facet mapped
to each reviewed selector. Record runtime bytecode hashes, the observation
block and hash, and relevant state values and their affected formats in
`deployments.json`. Each deployment also records whether descriptor constraints
are unnecessary, enforced, or unavailable under the declared ERC-7730 version.
A format with a necessary but unenforceable constraint cannot be approved.

An old audit remains historical evidence, but consumers must not treat it as
proof that a subsequently upgraded deployment still has the same behavior.

## Private-key safety

Never store a private key, seed phrase, keystore, or signing secret in this
repository or in GitHub Actions. Produce attestations locally with a hardware
wallet or appropriately secured signer, then commit only the public EAS export.

## License

This repository is dedicated to the public domain under
[CC0 1.0 Universal](LICENSE.md).
