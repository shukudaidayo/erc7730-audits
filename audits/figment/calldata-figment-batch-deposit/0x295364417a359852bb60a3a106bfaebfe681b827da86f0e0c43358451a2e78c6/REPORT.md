# ERC-7730 Descriptor Audit: <code>calldata-figment-batch-deposit</code>

## Result

Status: **draft**

The technical review has identified three issues that independently appear to
block approval. The descriptor presents every call as `Stake ETH` even though a
successful execution-layer call can top up an existing validator, attempt to
register a new validator, or submit proof data that consensus will reject. It
also presents tagged withdrawal credentials as opaque and apparently effective
data and flattens parallel arrays without preserving each validator tuple.
F-004 remains provisionally blocking under Audit Policy 1.2.0, but its final
classification depends on the outcome of
[ethereum/ERCs#1974](https://github.com/ethereum/ERCs/pull/1974), which proposes
requiring wallets to display every nonzero native transaction value even when a
descriptor does not reference `@.value`. The dossier remains in draft until
that responsibility is determined. No positive attestation was issued.

## Descriptor Identity

| Field | Value |
| --- | --- |
| Project | <code>figment</code> |
| Registry commit | `48d3eb8f1e35da816f522bd6c323c9dde5731a26` |
| Registry path | <code>registry/figment/calldata-figment-batch-deposit.json</code> |
| ERC-7730 version | `2.0.0` |
| ERC-7730 schema hash | `0x690cb47b8d4b847dbc9a9e29da75cb05d436b132900d57508ca12173f1f800b3` |
| Audit policy version | `1.2.0` |
| ERC-8176 hash | `0x295364417a359852bb60a3a106bfaebfe681b827da86f0e0c43358451a2e78c6` |
| Auditor | `eip155:1:0x9a659894e5D115846767dB0e1685744c452E7a6e` |
| Dossier created | `2026-09-03T13:13:43Z` |
| Review completed | `2026-09-03T21:45:56Z` |

The descriptor snapshot came from the [registry at the recorded
commit](https://github.com/ethereum/clear-signing-erc7730-registry/blob/48d3eb8f1e35da816f522bd6c323c9dde5731a26/registry/figment/calldata-figment-batch-deposit.json).
Its declared [ERC-7730 v2 schema](https://github.com/ethereum/clear-signing-erc7730-registry/blob/48d3eb8f1e35da816f522bd6c323c9dde5731a26/specs/erc7730-v2.schema.json)
was saved as `erc7730-schema.json`, hashed independently, and used for
validation.

## Scope

The review covers every deployment and format declared by the descriptor:

- `eip155:1:0x8B0d88B8Be3C15D746Feb0B1f18c883c03B6Aa62`
- `eip155:560048:0x7Ac74cb69104Cea773cc3154D47c930ca6462fe8`
- `deposit(bytes[] pubkeys, bytes[] withdrawal_credentials, bytes[] signatures, bytes32[] deposit_data_roots, uint256[] amounts_gwei)` (`0xc09bb1db`)

The other state-changing functions are limited to owner administration. They
were reviewed for their effects on the deposit flow but are outside the
descriptor's public batch-deposit purpose. Read-only accessors do not authorize
state changes. `renounceOwnership()` always reverts in the reviewed
implementation, and a direct native-currency transfer also reverts.

## Project and Provenance

[Figment's documentation](https://docs.figment.io/docs/our-eth-batch-smart-contract)
states that it developed the batch-deposit contracts, describes their purpose
as funding multiple validators in one transaction, distinguishes the newer
contract by its per-validator amount array, and links the exact declared
mainnet and Hoodi deployments. The [official Figment source
repository](https://github.com/figment-networks/figment-eth2-depositor/tree/53fa2d588e33dca6d8a625a169ce4f4290b34fb6)
identifies the project as Figment Ethereum Deposit Contracts. Its pinned
[`FigmentEth2DepositorV1` source](https://github.com/figment-networks/figment-eth2-depositor/blob/53fa2d588e33dca6d8a625a169ce4f4290b34fb6/contracts/FigmentEth2DepositorV1.sol)
is byte-identical to the primary source verified by Sourcify for both
deployments.

These first-party sources support the displayed `owner` value `Figment`,
`contractName` value `Figment ETH Depositor`, and project purpose. The
descriptor's `info.url`, [`https://figment.io/`](https://figment.io/), is
Figment's corporate site. `owner` identifies the developer and official
operator of the target, not the literal value returned by the Solidity
`owner()` function, an assertion that Figment receives the deposited ETH, or
an endorsement. The wrapper forwards all accepted ETH to Ethereum's canonical
deposit contract.

The public history available from the recorded registry first contains this
descriptor in [commit `3b66ba2`](https://github.com/ethereum/clear-signing-erc7730-registry/commit/3b66ba289cd3988ea791346629445f9ab6ae86f3).
That repository-wide commit does not establish that its author represents
Figment, so this review treats the descriptor as community supplied and relies
on Figment's sources for identity and deployment claims.

The descriptor declares no deployment date, token metadata, constants, enums,
or maps. It therefore has no additional metadata values, map keys, or
match/no-match paths to verify.

The authoritative deployment survey found no relevant omission:

| Network | Chain ID | Address | Treatment |
| --- | ---: | --- | --- |
| Ethereum mainnet | 1 | `0x8B0d88B8Be3C15D746Feb0B1f18c883c03B6Aa62` | Declared and reviewed |
| Hoodi | 560048 | `0x7Ac74cb69104Cea773cc3154D47c930ca6462fe8` | Declared and reviewed |

Figment's current documentation says that the newer per-validator-amount
contract is deployed on mainnet and Hoodi, and its links resolve to these two
addresses. Arbitrary copies, unofficial forks, and contracts that merely share
the ABI were outside the survey. The documentation links an external contract
audit, but this review does not use that report as evidence for a descriptor
claim, so it is not presented as general assurance.

## Contract and Source Verification

Both declared deployments passed the direct-contract pre-filter. Sourcify
verifies the same `FigmentEth2DepositorV1` source for both, and the runtime
bytecode observed on the two chains is byte-identical.

| Deployment | Sourcify result | Observation block | Block hash | Runtime code hash |
| --- | --- | ---: | --- | --- |
| `eip155:1:0x8B0d88B8Be3C15D746Feb0B1f18c883c03B6Aa62` | Match 10934158; creation and runtime matches | 25,897,043 | `0x4c8bdcff1053cf2378f2e7233d9b05733ec89744ffb843afdaf4832384b2ca65` | `0x869107bd90290bc5eb76e33f1ee9bc0e3aae652d1abdad367a5c182210b9f2be` |
| `eip155:560048:0x7Ac74cb69104Cea773cc3154D47c930ca6462fe8` | Match 46828858; creation and runtime matches | 3,550,399 | `0xff15d53b59352d3700e69000dbf67b05596ad7bef7be71bf604321e17d472d90` | `0x869107bd90290bc5eb76e33f1ee9bc0e3aae652d1abdad367a5c182210b9f2be` |

The [mainnet Sourcify
record](https://sourcify.dev/server/v2/contract/1/0x8B0d88B8Be3C15D746Feb0B1f18c883c03B6Aa62?fields=all)
identifies Solidity `0.8.28+commit.7893614a`, deployment transaction
`0x28641256da9320915084899cc5f74aceb9a55d596ef705fade514b8e522bc455`,
deployment block 23,583,309, and deployer
`0x5396E32D8122eA316C60FF7ebB85006C63F44af7`. The [Hoodi Sourcify
record](https://sourcify.dev/server/v2/contract/560048/0x7Ac74cb69104Cea773cc3154D47c930ca6462fe8?fields=all)
identifies the same compiler, deployment transaction
`0x53506b453cbd0940e99925f18b6cd46ccf81c85d9656b5f11e8627c78e408a45`,
deployment block 1,419,396, and deployer
`0x87076222faE7397f497c8905b41b97a8Ea60C8d9`. The primary verified
source has Keccak-256
`0x1f4c21cc25452d31a351c1b6d8758dc114dad75a3ab15003bdea27295da96fe2`
on both chains and matches the pinned Figment source byte for byte.

Sourcify reports `isProxy=false` for both deployments. The verified source
directly implements the reviewed function, contains no `delegatecall` router or
code-upgrade mechanism, and stores the canonical Ethereum deposit contract as
an immutable. At both observation blocks, `depositContract()` returned
`0x00000000219ab540356cBB839Cbe05303d7705Fa`, and `paused()` returned
`false`. The mainnet and Hoodi `owner()` values were the respective deployer
addresses above.

The verified ABI and source declare the reviewed function as payable, with the
same five parameter names, types, and order as the descriptor. Keccak-256 of
the canonical ABI signature begins with `0xc09bb1db`, matching the runtime
dispatcher and test transactions.

The descriptor uses a direct contract context. It contains no factory or
EIP-712 context and no deprecated `abi` or `schemas` field, so the related
factory, domain, replay, and legacy-consumer checks do not apply.

## Function-by-Function Review

### `deposit(bytes[] pubkeys, bytes[] withdrawal_credentials, bytes[] signatures, bytes32[] deposit_data_roots, uint256[] amounts_gwei)`

- **Selector, ABI, and source:** The selector is `0xc09bb1db`. The signature,
  parameter names, types, and order match both verified ABIs and
  implementations.
- **Execution paths and intent:** When unpaused, the wrapper requires between
  one and 500 public keys, requires all five arrays to have equal length,
  requires 48-byte public keys, 32-byte withdrawal credentials, and 96-byte
  signatures, and requires each amount to be between 1 ETH and 2,048 ETH in
  gwei. It requires `msg.value` to equal the sum of the per-validator amounts,
  then forwards each tuple and its amount to the immutable canonical deposit
  contract. Any failed forwarded call reverts the complete batch.
- **Outcome dependencies:** The wrapper and deposit contract validate data
  shape, amount, and the SSZ deposit-data root, but neither verifies the BLS
  proof of possession. Under the pinned [Electra consensus
  rules](https://github.com/ethereum/consensus-specs/blob/3434cc69d695604ea52253e31486f46ba0e36901/specs/electra/beacon-chain.md),
  an existing public key receives a balance top-up that ignores the submitted
  signature and withdrawal credentials. A new public key is registered with
  the submitted credentials only when the BLS signature verifies. Otherwise,
  no validator is created or credited even though the execution-layer deposit
  can succeed and retain the ETH. The unqualified `Stake ETH` intent does not
  distinguish the submission from this conditional consensus outcome; see
  F-001.
- **Intent, layout, and arrays:** The format has one non-interpolated intent.
  It independently iterates the public-key, withdrawal-credentials, and amount
  arrays. The tested two-entry batch renders both public keys first, both
  credentials second, and both amounts last, without groups, separators,
  indexes, or bundled iteration. It therefore leaves the signer to reconstruct
  the contract's index-by-index tuple relationship across separate lists; see
  F-003. Empty arrays render `Stake ETH` with no fields, although verified source
  rejects that call. Approval does not
  require predicting every revert, but this case reinforces why the intent
  must describe the attempted submission rather than promise an outcome.
- **References and visibility:** The format uses direct parameter paths and has
  no definitions, references, literal values, overrides, conditions, maps,
  constants, enums, interpolation, or match/no-match behavior. Public keys,
  withdrawal credentials, and amounts use the default always-visible behavior.
  Signatures and deposit-data roots are always hidden.
- **Displayed fields:** Each public key is shown completely as raw bytes.
  `amounts_gwei` is correctly formatted as ETH with nine decimals and tested at
  1 ETH, 32 ETH, and 2,048 ETH. The withdrawal-credentials label does not say
  that the value is merely submitted, and the raw formatter does not explain
  the tagged credential type or any execution-layer withdrawal address. For an
  existing-validator top-up, the displayed value does not apply at all; see
  F-002.
- **Structured bytes:** Withdrawal credentials are 32-byte tagged data. The
  first byte selects legacy BLS (`0x00`), execution-address (`0x01`), or
  compounding (`0x02`) withdrawal behavior under the pinned consensus rules.
  The latter two carry an execution-layer address in the final 20 bytes.
  ERC-7730 v2 path slices can expose the prefix and byte ranges, although v2
  visibility cannot conditionally relabel every payload variant. Accurate
  submitted-data labels, a prefix enum, and neutral payload fields can still
  improve the format without a schema change.
- **Hidden cryptographic inputs:** The deposit-data root commits to the public
  key, withdrawal credentials, signature, and amount. The canonical deposit
  contract recomputes that root, so hiding the redundant root does not hide a
  separate authorization. The 96-byte signature is different: its validity can
  determine whether a new validator is registered, while the wrapper checks
  only its length and inclusion in the root. Displaying raw signature bytes
  would not make their validity human-readable. This is the general
  function-level validation gap in F-001.
- **Assets and privileged actions:** The function transfers native ETH to the
  canonical deposit contract. It has no ERC-20 approval, token transfer,
  spender, role grant, or configurable recipient. For accepted new-validator
  data, withdrawal authority is encoded in the submitted credentials. For
  existing validators, pre-existing credentials remain effective.
- **Native currency:** The descriptor does not reference `@.value`. A normal
  successful call requires it to equal the sum of all displayed amounts, but
  the display shows neither the actual signed value nor a total. The
  zero-value/one-ETH-calldata fixture demonstrates that the renderer cannot
  distinguish a correctly funded call from a value mismatch; see F-004.
- **Other formatters:** There are no external token or name lookups, nested
  calldata, cross-chain fields, dates, durations, units other than the fixed
  ETH conversion, NFT fields, threshold messages, encryption, or fallback
  branches.
- **Activation nuance:** The wrapper accepts 1 ETH per entry. Consensus requires
  a new validator to reach 32 ETH before activation eligibility, and activation
  is also queued. Because a smaller accepted amount still contributes
  validator stake, this is an intent nuance rather than a separate finding;
  the decisive F-001 issue is that some accepted execution-layer submissions
  do not stake or credit a validator at all.
- **Representative output:** The real mainnet fixture renders `Stake ETH`,
  owner `Figment`, public key
  `0xaf611d47ebf55fd5f5c9037959e93e5a42f5e3e97478362191e5600711216867b1bf67ead7a3ff42b63532a8a1948507`,
  all-zero `Withdraw Credentials`, and `32ETH`. It does not show the 32 ETH
  transaction total, identify the call as an existing-validator top-up, or
  show that validator's effective `0x02` withdrawal credentials.
- **Result:** Preliminary fail because of F-001 through F-003. F-004 remains
  provisional pending ethereum/ERCs#1974.

## Proxy and Intent-Mutability Analysis

Both deployments are immutable, direct contracts. Their 2,506-byte runtimes
are byte-identical, and their reviewed selector executes in that runtime. The
immutable `depositContract` target is the canonical deposit contract on both
chains.

The reviewed function reads the mutable `paused` flag. Its owner can change
that flag, and ownership itself can be transferred, but these values only
control whether the call executes. They cannot change the target, assets,
parameters, tuple association, or fields for an executing deposit. The
downstream deposit tree and count can also affect execution availability, not
the signed authorization's meaning. No mutable EVM state therefore needs a
descriptor constraint, and `deployments.json` records empty `stateRefs` and a
`not-required` binding result for each deployment.

Consensus validator state determines whether a public key is new and whether
the submitted signature and withdrawal credentials apply. That dependency is
not an EVM storage value the descriptor can bind. It is addressed by F-001:
accurate outcome-neutral wording can keep the display valid without querying
or binding consensus state, while general function-level signature validation
could provide an additional warning for proof data that cannot register a new
validator.

## Includes and External Data

The descriptor has no `includes` declaration, so there is no direct or
transitive dependency, merged-content ambiguity, or nested descriptor.
`dependencies.json` is empty, and the descriptor snapshot is the exact content
hashed and tested.

The display uses no token, address-name, ENS, NFT, block-time, or cross-chain
lookup. The runner still resolves chain name and native-currency metadata for
chain IDs 1 and 560048. The compact saved snapshot contains only those values
and is identified under *Testing*. No embedded calldata, external nested
descriptor, encryption, or decryption fallback applies.

## Testing

The exact command was:

```text
node scripts/run-audit-tests.mjs audits/figment/calldata-figment-batch-deposit/0x295364417a359852bb60a3a106bfaebfe681b827da86f0e0c43358451a2e78c6
```

The audit used
[`@ethereum-sourcify/clear-signing-test-runner@0.1.0` at
`dae3cdab…`](https://github.com/sourcifyeth/clear-signing-test-runner/tree/dae3cdabd0eab26173d7f7a31a2ca7e75bf07daf)
with `@ethereum-sourcify/clear-signing@0.2.2`. Its unmodified
`test-results.json` records five passes:

- the registry's real 32 ETH mainnet transaction,
- equivalent calldata bound to the Hoodi deployment,
- a two-entry batch at the 1 ETH and 2,048 ETH per-entry limits,
- zero `msg.value` with 1 ETH declared in calldata, and
- empty arrays with zero `msg.value`.

The first case preserves the registry's [upstream
fixture](https://github.com/ethereum/clear-signing-erc7730-registry/blob/48d3eb8f1e35da816f522bd6c323c9dde5731a26/registry/figment/testsv2/calldata-figment-batch-deposit.tests.json).
Its [mainnet transaction
`0xa0cf…f77a`](https://etherscan.io/tx/0xa0cfdaeb2a7f7925e1ee18795b8b787c1091bd98b7e52e545353955682bff77a)
succeeded at execution block 24,637,997 on 2026-03-12, forwarded 32 ETH to the
canonical deposit contract, and emitted the wrapper's batch event. Independent
decoding found one element in every array, `msg.value` equal to the sole
amount, selector `0xc09bb1db`, and supplied deposit-data root
`0x7fd4817db6a15e8ff78bd0c04b6977ef294300274ef7537598baa54e1852ba90`.
An independent SHA-256 SSZ reconstruction from the public key, credentials,
signature, and little-endian gwei amount produced the same root.

This real transaction establishes rendering and successful EVM execution. It
also demonstrates the top-up branch. A [public Beacon API validator
record](https://ethereum-beacon-api.publicnode.com/eth/v1/beacon/states/head/validators/0xaf611d47ebf55fd5f5c9037959e93e5a42f5e3e97478362191e5600711216867b1bf67ead7a3ff42b63532a8a1948507)
identifies validator 1,390,829, activation epoch 283,112, and effective
withdrawal credentials
`0x020000000000000000000000859eed38b9c59635bece6a3515b09981b963cf17`.
That activation epoch began in May 2024, well before the March 2026
transaction. The transaction's submitted credentials and signature were both
all zero, consistent with [Figment's documented top-up
behavior](https://docs.figment.io/reference/ethereum-compound-transaction),
which says those fields are all zero for deposits to active `0x02` validators.
The descriptor nevertheless displayed the submitted zero credentials as
`Withdraw Credentials`.

The Sourcify runner does not execute the EVM, query validator state, recompute
SSZ roots, or validate BLS points. For the first fixture, independent
`@noble/curves@1.9.1` checks accepted the 48-byte public key as a compressed G1
point and rejected the 96 zero-byte signature as an invalid G2 point. The exact
public key and signature are preserved in `tests.json`. This proves that the
signature is not a valid new-validator proof, while the consensus rules explain
why it is acceptable for the observed existing-validator top-up.

The empty-array fixture is expected to revert with `NodesAmountZero`, and the
zero-value/one-ETH fixture is expected to revert with `EthAmountMismatch`,
under the pinned verified source. The runner rendered both because it tests
descriptor output rather than EVM execution. Verified source also establishes
the rejection of unequal array lengths, more than 500 entries, byte-length
mismatches, and per-entry amounts below 1 ETH or above 2,048 ETH. These are
execution errors, not successful-rendering branches, and the exact rendered
boundary inputs are preserved in `tests.json`.

The compact `test-chain-info.json` snapshot was captured from
`https://chainid.network/chains_mini.json` at
`2026-09-03T21:44:23Z`. Its raw-file SHA-256 hash is
`0x870f088f3fea4df88d7ff562339994fc01e834b807f0ceeb4012c90c5410a829`.
It records ETH with 18 decimals for both tested chains. No other external
formatter data was used.

## Findings

### F-001: The Display Cannot Distinguish Validator-Deposit Outcomes

Severity: **High**\
Blocking: **Yes**

The wrapper cannot establish the displayed `Stake ETH` outcome. Existing
validators receive top-ups that ignore the submitted signature and credentials;
new validators require a valid BLS proof; invalid new-validator proof data can
pass the execution-layer checks and retain ETH without registering or crediting
a validator. Use outcome-neutral submission language, omit the format, or
adopt future general ERC-7730 function-level validation capable of describing
the signature check without rejecting valid existing-validator top-ups.

### F-002: Withdrawal Credentials Are Displayed as Opaque and Effective

Severity: **Medium**\
Blocking: **Yes**

The raw value neither explains the credential type and destination nor says
that it is only submitted data. The real fixture displays all-zero credentials
that consensus ignores while different `0x02` credentials remain effective.
Use accurate submitted-data labels and v2 byte slices to expose the tagged
structure.

### F-003: Parallel Arrays Are Not Grouped Into Validator Deposits

Severity: **Medium**\
Blocking: **Yes**

The contract associates all five arrays by index, but the display flattens
three visible arrays sequentially. It forces the signer to correlate values by
position across three separate, unindexed lists. This is error-prone for small
batches and impractical for large batches. Use a group and bundled array
iteration, or another v2 layout that preserves each validator tuple.

### F-004: The Transaction's Total Native Value Is Not Displayed

Severity: **Low**\
Blocking: **Yes**

The descriptor omits `@.value` and shows no total. The contract rejects a
mismatch, but the actual signed native value and the total of a potentially
large batch remain undisclosed. Display the transaction value as ETH.

This classification is provisional. Under Audit Policy 1.2.0, the omission is
blocking. If ethereum/ERCs#1974 is adopted, a conforming wallet would display
the nonzero transaction value independently of the descriptor, which may make
explicit `@.value` formatting a non-blocking author recommendation instead.

## Coverage Limitations

No important user-facing function or known relevant deployment is absent from
the descriptor.

## Hash Glossary

- ERC-8176 hash: Keccak-256 of RFC 8785 canonical JSON for the descriptor,
  schema, dependency, or resolved-descriptor snapshot.
- Observation block hash: the chain's identifier for the exact state observed.
- Runtime bytecode hash: Keccak-256 of deployed runtime bytecode.
- External-data hash: SHA-256 of the saved raw snapshot bytes.

## Attestation

No positive attestation was issued because the audit remains in `draft`.
