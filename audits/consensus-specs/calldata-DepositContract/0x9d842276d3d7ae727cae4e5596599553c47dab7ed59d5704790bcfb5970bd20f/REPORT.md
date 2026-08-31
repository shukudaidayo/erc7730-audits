# ERC-7730 Descriptor Audit: <code>calldata-DepositContract</code>

## Result

Status: **needs-changes**

The review reached a supported negative conclusion because of two blocking
issues. The descriptor cannot distinguish three consensus outcomes: a top-up
of an existing validator, registration of a new validator with a valid BLS
signature, and rejection of a new validator with an invalid BLS signature.
The latter can follow a successful EVM deposit without crediting a validator,
while an existing-validator top-up ignores both the submitted signature and
the displayed withdrawal credentials. Separately, the descriptor renders the
withdrawal credentials as opaque bytes without identifying the withdrawal mode
or destination they encode. F-001 requires outcome-neutral descriptor language
or support for validating and explaining the relevant conditions. F-002 can be
addressed directly in ERC-7730 v2 using path slices. Both findings prevent a
positive attestation.

## Descriptor Identity

| Field | Value |
| --- | --- |
| Project | <code>consensus-specs</code> |
| Registry commit | `8936407e503b319882d3c811c26c8648a8e449ca` |
| Registry path | <code>registry/consensus-specs/calldata-DepositContract.json</code> |
| ERC-7730 version | `2.0.0` |
| ERC-7730 schema hash | `0x690cb47b8d4b847dbc9a9e29da75cb05d436b132900d57508ca12173f1f800b3` |
| Audit policy version | `1.1.0` |
| ERC-8176 hash | `0x9d842276d3d7ae727cae4e5596599553c47dab7ed59d5704790bcfb5970bd20f` |
| Auditor | `eip155:1:0x9a659894e5D115846767dB0e1685744c452E7a6e` |
| Dossier created | `2026-08-29T02:11:07Z` |
| Review completed | `2026-08-31T23:33:14Z` |

The descriptor snapshot came from the [registry at the recorded
commit](https://github.com/ethereum/clear-signing-erc7730-registry/blob/8936407e503b319882d3c811c26c8648a8e449ca/registry/consensus-specs/calldata-DepositContract.json).
Its declared [ERC-7730 v2 schema](https://github.com/ethereum/clear-signing-erc7730-registry/blob/8936407e503b319882d3c811c26c8648a8e449ca/specs/erc7730-v2.schema.json)
was saved as `erc7730-schema.json`, hashed independently, and used to validate
the descriptor.

## Scope

The review covers every deployment and format declared by the descriptor:

- `eip155:1:0x00000000219ab540356cBB839Cbe05303d7705Fa`
- `eip155:560048:0x00000000219ab540356cBB839Cbe05303d7705Fa`
- `deposit(bytes pubkey, bytes withdrawal_credentials, bytes signature, bytes32 deposit_data_root)` (`0x22895118`)

The contract's other ABI functions, `get_deposit_count()`,
`get_deposit_root()`, and `supportsInterface(bytes4)`, are read-only or pure.
They do not authorize a state change and are not important omitted signing
paths. The omitted Sepolia and legacy Holesky deployments are recorded under
*Coverage Limitations*.

## Project and Provenance

The [official Solidity deposit-contract
repository](https://github.com/ethereum/solidity-deposit-contract/tree/5bf2741b50c58b844225f89018041c5d54726f8e)
contains the deployed [deposit contract
source](https://github.com/ethereum/solidity-deposit-contract/blob/5bf2741b50c58b844225f89018041c5d54726f8e/deposit_contract.sol)
and documents the mainnet address. The contract accepts validator deposit data,
emits it for the consensus layer, and maintains the deposit-data Merkle tree.
An [Ethereum Foundation development
update](https://blog.ethereum.org/2020/06/23/eth2-quick-update-no-12)
states that this Solidity rewrite was reviewed by Solidity experts and formally
verified by Runtime Verification. The review and verification evidence is
external to the contract repository.

The [consensus validator
specification](https://github.com/ethereum/consensus-specs/blob/3434cc69d695604ea52253e31486f46ba0e36901/specs/phase0/validator.md)
documents the validator public key, withdrawal credentials, amount, signature,
and deposit-data root used to create a deposit.

Withdrawal credentials are a 32-byte tagged value that controls how validator
withdrawals are authorized and routed. The first byte selects the credential
type. Under the pinned Phase 0 rules, `0x00` contains a legacy BLS
withdrawal-key commitment, while `0x01` places an execution-layer withdrawal
address in the final 20 bytes. The pinned [Electra
rules](https://github.com/ethereum/consensus-specs/blob/3434cc69d695604ea52253e31486f46ba0e36901/specs/electra/beacon-chain.md)
add `0x02`, which also carries an execution-layer address and selects
compounding-validator behavior.

The descriptor and its initial test were added by Manuel Wedler in registry
commit [`3b66ba2`](https://github.com/ethereum/clear-signing-erc7730-registry/commit/3b66ba289cd3988ea791346629445f9ab6ae86f3)
as part of [PR #2905](https://github.com/ethereum/clear-signing-erc7730-registry/pull/2905).
That pull request does not state a connection between the submitter and the
Ethereum Foundation or the deposit-contract project, so this review treats the
descriptor as community supplied. The audit does not rely on the submitter for
contract or deployment evidence.

The descriptor declares `owner` as `Ethereum Foundation`, `contractName` as
`DepositContract`, and `info.url` as `https://ethereum.foundation`. The verified
source and official deposit-contract repository support `DepositContract` as
the contract name, and the URL is the Foundation's official website. An
[official Foundation development
update](https://blog.ethereum.org/2020/12/09/ef-supported-teams-research-and-development-update-2020-pt-2)
states that an EF-supported team led the Solidity rewrite of the deposit
contract and that the implementation was adopted into the Eth2 specification.
The Foundation also [announced the v1.0 specification and mainnet deposit
address](https://blog.ethereum.org/2020/11/04/eth2-quick-update-no-19). These
first-party sources support the descriptor's Foundation attribution and
information URL as development provenance.

The attribution does not imply literal onchain ownership or administrative
control. The verified deployment has no owner or administrator, and the
deposit contract is protocol infrastructure rather than a contract operated by
the Foundation as the transaction's counterparty or beneficiary.

The descriptor declares no deployment date, token metadata, constants, enums,
or maps. There are therefore no additional metadata values or map-resolution
paths to verify.

The authoritative deployment survey found:

| Network | Chain ID | Address | Treatment |
| --- | ---: | --- | --- |
| Ethereum mainnet | 1 | `0x00000000219ab540356cBB839Cbe05303d7705Fa` | Declared and reviewed |
| Hoodi | 560048 | `0x00000000219ab540356cBB839Cbe05303d7705Fa` | Declared and reviewed |
| Sepolia | 11155111 | `0x7f02C3E3c98b133055B8B348B2Ac625669Ed295D` | Omitted; behavior not compatible |
| Holesky | 17000 | `0x4242424242424242424242424242424242424242` | Omitted; legacy network |

The [pinned Hoodi configuration](https://github.com/eth-clients/hoodi/blob/30b866a757f4701644f2edbeb81bafcbf5ad629d/README.md)
identifies its chain ID and deposit address and describes Hoodi as Holesky's
replacement. The [pinned Sepolia
configuration](https://github.com/eth-clients/sepolia/blob/a284cd3ca509b0ac86bc1d885c62debcf0b901d5/metadata/config.yaml)
identifies Sepolia's chain ID and deposit address. [EIP-6110](https://github.com/ethereum/EIPs/blob/0849adda4f2eb83d6224c92346d38f8e2644054f/EIPS/eip-6110.md)
also identifies it as a deposit contract variant and notes that it emits an
ERC-20 `Transfer` event in addition to `DepositEvent`. Arbitrary forks and
contracts that merely expose the deposit ABI were outside the survey.

## Contract and Source Verification

Both declared deployments passed the direct-contract pre-filter. The runtime
bytecode observed on the two chains is byte-identical.

The descriptor uses a direct contract context. It contains no factory or
EIP-712 context and no deprecated `abi` or `schemas` field, so the corresponding
factory, domain, replay, and legacy-consumer checks do not apply.

| Deployment | Sourcify result | Observation block | Block hash | Runtime code hash |
| --- | --- | ---: | --- | --- |
| `eip155:1:0x00000000219ab540356cBB839Cbe05303d7705Fa` | Match 2115; exact creation and runtime matches | 25,858,078 | `0x9e15b3e451d22be5703ab27252f1a6f5524daff2961eeae0126d2ea5447f506c` | `0x6c029a231254fadb724d63be769f75eedd66362df034a3e663252b49d062a666` |
| `eip155:560048:0x00000000219ab540356cBB839Cbe05303d7705Fa` | Match 46828910; runtime match | 3,514,355 | `0xc90ac66f00a0c4b51a60297d6551c101742c4de08c8854695f7e903199e7924c` | `0x6c029a231254fadb724d63be769f75eedd66362df034a3e663252b49d062a666` |

The [mainnet Sourcify
record](https://sourcify.dev/server/v2/contract/1/0x00000000219ab540356cBB839Cbe05303d7705Fa?fields=all)
identifies `deposit_contract.sol:DepositContract`, Solidity
`0.6.11+commit.5ef660b1`, deployment transaction
`0xe75fb554e433e03763a1560646ee22dcb74e5274b34c5ad644e7c0f619a7e1d0`,
and deployment block 11,052,984. The [Hoodi Sourcify
record](https://sourcify.dev/server/v2/contract/560048/0x00000000219ab540356cBB839Cbe05303d7705Fa?fields=all)
identifies the same compiler and implementation behavior. Hoodi provides the
contract as a predeployment, so there is no creation transaction to record.

Sourcify reports `isProxy=false` for both. The verified runtime directly
implements the reviewed selector and contains no delegatecall router,
implementation slot, owner, or administrator. The verified ABI declares the
reviewed function as payable, with the same four parameter names, types, and
order as the descriptor. Keccak-256 of the canonical ABI signature
`deposit(bytes,bytes,bytes,bytes32)` begins with `0x22895118`, matching the
runtime dispatcher and the recorded selector.

## Function-by-Function Review

### `deposit(bytes pubkey, bytes withdrawal_credentials, bytes signature, bytes32 deposit_data_root)`

- **Selector, ABI, and source:** The selector is `0x22895118`. The descriptor's
  parameter names, types, and order match both verified ABIs and implementations.
- **Execution paths and intent:** The EVM source requires a 48-byte validator
  public key, 32-byte withdrawal credentials, a 96-byte BLS signature, at least
  1 ETH, gwei granularity, a value no greater than `uint64` gwei, a deposit-data
  root reconstructed from all inputs, and available Merkle-tree capacity. A
  successful EVM call emits a deposit event and updates the deposit tree, but
  this is not enough to establish the displayed `Stake ETH` outcome. Under the
  current pinned [Electra deposit-processing
  rules](https://github.com/ethereum/consensus-specs/blob/3434cc69d695604ea52253e31486f46ba0e36901/specs/electra/beacon-chain.md),
  the deposit enters consensus processing as a pending deposit. When it becomes
  eligible for application, an existing validator public key receives a top-up
  that ignores the submitted signature and withdrawal credentials. A new
  validator public key creates a validator record, and applies the submitted
  withdrawal credentials, only if its BLS signature verifies. If the signature
  is invalid, no validator is created or credited even though the EVM
  transaction succeeded and retained the ETH.
- **Text and layout:** The format uses one simple intent and has no interpolated
  or alternate intent. Its labels identify the validator key, the raw
  withdrawal-credentials argument, and the deposit amount, but the abbreviated
  `Withdraw credentials` label does not explain the credential's withdrawal
  mode or destination. It uses no field groups, separators, array iteration, or
  nested layout.
- **References and visibility:** The format uses direct parameter paths and has
  no definitions, references, literal values, overrides, constants, enums, or
  maps. The validator key, withdrawal credentials, and amount are always
  visible. The signature and deposit-data root are always hidden; their
  materiality and redundancy are addressed below. There are no `optional`,
  `ifNotIn`, or `mustMatch` branches.
- **Displayed fields:** The renderer shows the complete validator public key,
  the submitted withdrawal credentials as raw bytes, and `@.value` as an ETH
  amount, in that order. The public key and amount identify the validator and
  value being credited. The withdrawal-credentials prefix selects legacy BLS,
  execution-address, or compounding behavior, and `0x01` and `0x02` credentials
  carry the withdrawal address in their final 20 bytes. The display neither
  identifies that type nor isolates the address for review. This is the open
  blocking finding F-002. The submitted credentials establish withdrawal
  authority only when consensus accepts a new validator; they are ignored for
  an existing-validator top-up, whose pre-existing credentials remain
  effective.
- **Hidden cryptographic inputs:** The descriptor always hides the 96-byte
  signature and `deposit_data_root`. The root commits to the public key,
  withdrawal credentials, amount, and signature, and the EVM contract verifies
  that commitment. However, the [verified deposit-contract
  source](https://github.com/ethereum/solidity-deposit-contract/blob/5bf2741b50c58b844225f89018041c5d54726f8e/deposit_contract.sol)
  checks only the signature's length and inclusion in that root; it does not
  verify the BLS signature. Consequently, arbitrary 96-byte signature data can
  pass the EVM checks when the supplied root matches. For a new validator, that
  hidden validity branch can determine whether consensus processing registers
  the validator even though the EVM transaction succeeds and retains the ETH.
  For an existing validator, consensus ignores the signature and the submitted
  withdrawal credentials. Showing the raw signature would not by itself make
  validity understandable, but hiding it and displaying potentially
  ineffective withdrawal credentials does not make either branch safe to omit.
- **Assets and privileged actions:** The call has no ERC-20 approval or
  transfer, spender, administrator, role grant, or external call. The target is
  fixed by the descriptor context. Withdrawal authority is carried by the
  displayed credentials rather than a Solidity recipient parameter, but the
  raw display does not explain that authority or extract an execution-layer
  destination when present.
- **Derived, nested, and encrypted formatting:** The format uses only `raw` and
  native-currency `amount` formatting. It has no name or token lookup, nested
  calldata, cross-chain field, threshold message, NFT, date, duration, unit,
  enum, interoperable address, or encrypted field. No corresponding lookup,
  decoding, decryption, or fallback path applies. In particular, it contains no
  formatter or derived fields for the tagged withdrawal-credentials value.
  ERC-7730 v2 path slices could expose the prefix and other byte ranges as
  separate fields, but the reviewed descriptor does not use them.
- **Native currency:** `msg.value` is the deposit amount and is always displayed
  using the tested chain's 18-decimal ETH metadata. Zero and nonzero values are
  both rendered. The zero-value fixture demonstrates the attempted amount but
  would revert under the verified 1 ETH minimum.
- **Activation threshold:** The contract accepts deposits from 1 ETH, but the
  pinned Electra rules require a validator to accumulate at least 32 ETH before
  it is eligible for activation. A valid deposit below 32 ETH can create or
  fund a validator record without making it activation-eligible. The `Stake
  ETH` wording may suggest a more immediate result, but the display shows the
  exact amount, and the deposit is still credited toward the validator's stake.
  This is an intent nuance rather than a separate finding.
- **Representative output:** A successful real mainnet transaction renders
  `Stake ETH`, owner `Ethereum Foundation`, the 48-byte validator key, the full
  `0x01` withdrawal credentials ending in
  `0x7e2a2fa2a064f693f0a55c5639476d913ff12d05`, and `32 ETH`. Hoodi renders the
  same fields with Hoodi's native ETH metadata. The renderer does not identify
  `0x01` as execution-address credentials or present the final 20 bytes as the
  withdrawal address. The cross-chain fixture is not used as evidence of
  successful Hoodi consensus processing.
- **Result:** **Fail.** The same display can describe materially different
  consensus outcomes, and the declared schema cannot enforce BLS-signature
  validity, determine whether the public key is already registered, or show the
  withdrawal credentials that actually govern an existing validator. The raw
  credentials also do not give the signer a human-readable withdrawal mode or
  destination even when they would govern a new validator. These are the open
  blocking findings F-001 and F-002. The descriptor-wide identity review passes
  independently of the format findings.

## Proxy and Intent-Mutability Analysis

Both deployments are immutable, direct contracts. The runtime code observed at
the recorded blocks is identical, and neither deployment has an implementation
address or facet mapping to bind.

The reviewed function reads and updates `deposit_count`, `branch`, and the
precomputed zero hashes used by the Merkle tree. These values are not
administrator controlled. Their current contents can determine the Merkle root
and, if the finite tree were ever full, whether a deposit succeeds, but they
cannot change the fields shown for the call. No administrator-controlled
storage value or external mutable target can change the display. Both
deployment records therefore classify the format as `not-required` for
upgradeable-code and mutable-EVM-state binding. That conclusion does not resolve
F-001's calldata- and consensus-state-dependent validator-registration branch.

## Includes and External Data

The descriptor has no `includes`, and `dependencies.json` is empty. No token,
address-name, ENS, or block-time lookup contributes to any rendered field. The
only external formatter data is chain name and native-currency metadata for
chain IDs 1 and 560048. The exact compact snapshot is preserved in
`test-chain-info.json` with SHA-256
`0x870f088f3fea4df88d7ff562339994fc01e834b807f0ceeb4012c90c5410a829`.

## Testing

The preserved rendering command was:

```text
node scripts/run-audit-tests.mjs audits/consensus-specs/calldata-DepositContract/0x9d842276d3d7ae727cae4e5596599553c47dab7ed59d5704790bcfb5970bd20f
```

It used `@ethereum-sourcify/clear-signing-test-runner@0.1.0` at commit
`dae3cdabd0eab26173d7f7a31a2ca7e75bf07daf` and installed
`@ethereum-sourcify/clear-signing@0.2.2`. The unmodified results are preserved in
`test-results.json`; all five cases passed:

1. A [successful real mainnet 32 ETH
   deposit](https://etherscan.io/tx/0x79786d7d8e1d37613e54e922f512b59cfb6f78c1003d22d4b8e2fcfd671e0cd7).
2. A 32 ETH Hoodi rendering using the mainnet deposit calldata, for cross-chain
   renderer coverage rather than evidence of successful consensus processing.
3. The verified contract's 1 ETH minimum, which also demonstrates that the
   static intent remains `Stake ETH` below the 32 ETH activation threshold.
4. Zero-value rendering, which displays `0 ETH` even though the contract would
   reject the transaction.
5. The contract's maximum accepted amount representation,
   `18446744073.709551615 ETH`, derived from `(2^64 - 1)` gwei.

For the generated boundary transactions, the deposit-data root was recomputed
from the exact public key, withdrawal credentials, amount, and signature using
the verified contract's SSZ hashing procedure. The amount-boundary fixtures
reuse the 32 ETH fixture's signature while changing the signed amount. They are
therefore rendering and EVM-boundary tests, not consensus-valid new-validator
deposits. Their successful rendering also demonstrates that the runner does not
validate the BLS signature before producing the same `Stake ETH` description.
The Hoodi fixture similarly reuses the mainnet calldata and is treated only as
chain-specific rendering coverage.

The fixture comparisons check the intent, owner, labels, field order, and every
displayed value. Every case also confirms the static `always` and `never`
visibility rules. The descriptor has no conditional, reference, map, lookup,
array, nested-calldata, encryption, or fallback branch that requires an
additional rendering fixture. The runner does not expose `contractName` or
`info.url`, so those identity values were reviewed directly against the
descriptor snapshot, verified source, official project material, and the
declared website. The runner also cannot evaluate BLS validity or consensus
deposit processing, so the exact alternative method was a static path
comparison between the pinned verified EVM source and pinned Electra consensus
specification. That comparison established the three consensus outcomes in
F-001 and the 32 ETH activation threshold. Because the 1 ETH fixture reuses a
signature for a different amount, it is not itself evidence of a
consensus-valid new-validator deposit.

The real mainnet fixture also demonstrates F-002. Its `0x01` credentials encode
the execution-layer withdrawal address
`0x7e2a2fa2a064f693f0a55c5639476d913ff12d05`, but the output preserves only the
label `Withdraw credentials` and the undivided 32-byte value. The descriptor has
no value-dependent formatting branch, so additional `0x00` and `0x02` fixtures
would reproduce the same raw treatment rather than exercise a different output
path. If the descriptor is revised to decode the prefix, its tests should cover
`0x00`, `0x01`, and `0x02` because the expected descriptions would then differ.

## Findings

### F-001: The Display Cannot Distinguish Consensus Deposit Outcomes

| Property | Value |
| --- | --- |
| Severity | **High** |
| Blocking | **Yes** |
| Status | **Open** |

Consensus processing has three materially different outcomes that the EVM
contract and descriptor do not distinguish. An existing validator public key
receives a top-up, while the submitted signature and withdrawal credentials are
ignored. A new validator public key with a valid BLS signature creates a
validator record governed by the submitted withdrawal credentials. A new
validator public key with an invalid BLS signature creates and credits no
validator, even though the EVM transaction can succeed and retain the ETH.

The descriptor always hides the signature, displays the submitted withdrawal
credentials as though they were effective, and renders `Stake ETH` identically
for all three outcomes. That can hide a failed new-validator registration or
make a top-up appear to have withdrawal authority that it does not have.

The declared ERC-7730 schema cannot enforce BLS-signature validity, query
whether the public key is already registered, or otherwise distinguish these
outcomes. Merely displaying the raw signature would not make its validity
understandable. A positive attestation is therefore blocked unless the
format uses outcome-neutral language and does not present the submitted
credentials as effective, or the applicable standard and its implementations
can validate and clearly explain the relevant conditions. Removing the
function format would also remove the inaccurate function-level rendering.

### F-002: Withdrawal Credentials Are Displayed as Opaque Bytes

| Property | Value |
| --- | --- |
| Severity | **Medium** |
| Blocking | **Yes** |
| Status | **Open** |

The `withdrawal_credentials` argument is a tagged 32-byte value that determines
how withdrawals are controlled. `0x00` credentials contain a legacy BLS
withdrawal-key commitment. `0x01` and `0x02` credentials contain an
execution-layer withdrawal address in their final 20 bytes, and `0x02`
additionally selects compounding-validator behavior.

The descriptor labels this field `Withdraw credentials` and displays the
complete value using the `raw` formatter. In the representative `0x01` fixture,
it does not identify the credential type or present
`0x7e2a2fa2a064f693f0a55c5639476d913ff12d05` as the withdrawal address. A signer
therefore receives the exact bytes but not the human-readable withdrawal mode
and destination that can control the deposited ETH. This remains material even
when the public key is new and the signature is valid, so it is independent of
F-001.

Policy 1.1.0 requires user-visible text to be accurate and unambiguous and each
rendered transaction to show the information needed to understand the
authorization. A positive attestation is therefore blocked until the descriptor
explains the credential type and its withdrawal-control meaning.

The pinned [ERC-7730 path-slice
rules](https://github.com/ethereum/clear-signing-erc7730-registry/blob/8936407e503b319882d3c811c26c8648a8e449ca/specs/erc-7730.md#path-slices)
permit a descriptor-level fix. The descriptor can map
`#.withdrawal_credentials.[0:1]` to a human-readable credential type, preserve
the remaining payload with `#.withdrawal_credentials.[1:]`, and expose the
final 20 bytes separately. Because v2 visibility rules cannot make that final
field depend on the prefix slice, its label and format must remain accurate for
`0x00` rather than unconditionally treating the value as an address. A revised
descriptor should test all three recognized prefixes.

## Coverage Limitations

### L-001: Sepolia Requires a Different Descriptor

The official Sepolia deployment is
`eip155:11155111:0x7f02C3E3c98b133055B8B348B2Ac625669Ed295D`.
A [successful observed deposit](https://eth-sepolia.blockscout.com/tx/0xa05892f36961ad3908820dcae3b952800b080ba446cc5385bfad490051435618)
burned one zero-decimal BEPOLIA token from the caller, emitted the validator
`DepositEvent`, and refunded the full 32 ETH through an internal transfer. The
reviewed descriptor displays neither the token burn nor the refund and must not
be applied to this deployment. Sepolia needs a separate descriptor that
represents those additional effects; its absence here is intentional rather
than a request to add another chain to this descriptor.

### L-002: Legacy Holesky Is Not Covered

The Holesky deposit contract is
`eip155:17000:0x4242424242424242424242424242424242424242`. The [official
Holesky configuration](https://github.com/eth-clients/holesky/blob/64e379f3ed110dbd5f018ae512e25564eaa293c5/README.md)
documents the address, while the Hoodi configuration identifies Hoodi as the
replacement staking testnet. This audit treats Holesky as legacy and does not
propose extending the descriptor to it. A wallet must not apply this descriptor
to the Holesky address.

## Hash Glossary

- ERC-8176 hash: Keccak-256 of RFC 8785 canonical JSON for the descriptor or
  schema snapshot.
- Observation block hash: the chain's identifier for the exact state observed.
- Runtime bytecode hash: Keccak-256 of deployed runtime bytecode.
- External-data hash: SHA-256 of the saved raw snapshot bytes.

## Attestation

No positive attestation has been created. The dossier has a `needs-changes`
result because F-001 and F-002 block a positive attestation for this descriptor
hash. The descriptor's `owner`, `contractName`, and `info.url` metadata were
verified, but that does not change the negative result.
