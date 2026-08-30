# ERC-7730 Descriptor Audit: <code>calldata-DepositContract</code>

## Result

Status: **needs-changes**

The review reached a supported negative conclusion because of one independently
blocking issue. Consensus
processing treats a new-validator registration differently from an
existing-validator top-up, but the descriptor cannot distinguish them. An
invalid BLS signature can produce a successful EVM deposit without registering
a new validator, while an existing-validator top-up ignores both the submitted
signature and the displayed withdrawal credentials. F-001 therefore requires
descriptor or consumer changes and prevents a positive attestation.

This negative result is conclusive but not an approval-style completion of
every otherwise required identity check. The descriptor associates the
`Ethereum Foundation` owner and `https://ethereum.foundation` information URL
with this contract, and the evidence collected did not establish that the
Foundation created, maintains, governs, or officially operates the deposit
contract, or is its intended counterparty or beneficiary. Resolving that
attribution would not remove F-001. Sepolia remains behaviorally incompatible,
and Holesky remains an uncovered legacy network.

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
| Review completed | `2026-08-30T19:01:47Z` |

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
contains the audited [deposit contract
source](https://github.com/ethereum/solidity-deposit-contract/blob/5bf2741b50c58b844225f89018041c5d54726f8e/deposit_contract.sol)
and documents the mainnet address. The contract accepts validator deposit data,
emits it for the consensus layer, and maintains the deposit-data Merkle tree.
The [consensus validator
specification](https://github.com/ethereum/consensus-specs/blob/3434cc69d695604ea52253e31486f46ba0e36901/specs/phase0/validator.md)
documents the validator public key, withdrawal credentials, amount, signature,
and deposit-data root used to create a deposit.

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
the contract name, and the URL itself is the Foundation's website. Neither
those sources, the consensus specification, nor the descriptor pull request
establishes the declared relationship between the Foundation and the target
contract. The review therefore treats both the `owner` attribution and the
association implied by `info.url` as unresolved rather than inferring that
relationship from the URL or the repository's `ethereum` namespace.

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
  [consensus deposit-processing
  rules](https://github.com/ethereum/consensus-specs/blob/3434cc69d695604ea52253e31486f46ba0e36901/specs/phase0/beacon-chain.md),
  a new validator is registered, and its submitted withdrawal credentials are
  applied, only if its BLS signature verifies. An existing validator public key
  instead follows a top-up branch that ignores the supplied signature and
  withdrawal credentials, increases the existing validator's balance, and
  leaves its pre-existing withdrawal credentials in force.
- **Text and layout:** The format uses one simple intent and has no interpolated
  or alternate intent. Its three displayed labels accurately identify the
  validator key, withdrawal credentials, and deposit amount. It uses no field
  groups, separators, array iteration, or nested layout.
- **References and visibility:** The format uses direct parameter paths and has
  no definitions, references, literal values, overrides, constants, enums, or
  maps. The validator key, withdrawal credentials, and amount are always
  visible. The signature and deposit-data root are always hidden; their
  materiality and redundancy are addressed below. There are no `optional`,
  `ifNotIn`, or `mustMatch` branches.
- **Displayed fields:** The renderer shows the complete validator public key,
  the submitted withdrawal credentials as raw bytes, and `@.value` as an ETH
  amount, in that order. The public key and amount identify the validator and
  value being credited. The displayed withdrawal credentials establish
  withdrawal authority only when consensus accepts a new validator; they are
  ignored for an existing-validator top-up, whose pre-existing credentials
  remain effective.
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
  displayed credentials rather than a Solidity recipient parameter.
- **Derived, nested, and encrypted formatting:** The format uses only `raw` and
  native-currency `amount` formatting. It has no name or token lookup, nested
  calldata, cross-chain field, threshold message, NFT, date, duration, unit,
  enum, interoperable address, or encrypted field. No corresponding lookup,
  decoding, decryption, or fallback path applies.
- **Native currency:** `msg.value` is the deposit amount and is always displayed
  using the tested chain's 18-decimal ETH metadata. Zero and nonzero values are
  both rendered. The zero-value fixture demonstrates the attempted amount but
  would revert under the verified 1 ETH minimum.
- **Representative output:** A successful real mainnet transaction renders
  `Stake ETH`, owner `Ethereum Foundation`, the 48-byte validator key, the full
  `0x01` withdrawal credentials ending in
  `0x7e2a2fa2a064f693f0a55c5639476d913ff12d05`, and `32 ETH`. Hoodi renders the
  same fields with Hoodi's native ETH metadata; that cross-chain fixture is not
  used as evidence of successful Hoodi consensus processing.
- **Result:** **Fail.** The same display can describe materially different
  consensus outcomes, and the declared schema cannot enforce BLS-signature
  validity, determine whether the public key is already registered, or show the
  withdrawal credentials that actually govern an existing validator. This is
  the open blocking finding F-001. The descriptor-wide identity review also
  remains incomplete.

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
3. The verified contract's 1 ETH minimum.
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
comparison between the pinned verified EVM source and pinned consensus
specification. That comparison produced F-001.

## Findings

### F-001: The Display Cannot Distinguish Validator Registration From a Top-Up

| Property | Value |
| --- | --- |
| Severity | **High** |
| Blocking | **Yes** |
| Status | **Open** |

Consensus processing has materially different branches that the EVM contract
and descriptor do not distinguish. For a new validator public key, consensus
registers the validator and applies the submitted withdrawal credentials only
if the BLS signature verifies. The EVM deposit contract accepts any 96-byte
signature whose bytes are included in a matching deposit-data root, so the
transaction can succeed and retain the ETH even when consensus processing does
not register the validator. For an existing validator public key, consensus
ignores the supplied signature and withdrawal credentials, credits the existing
validator's balance, and leaves its pre-existing withdrawal credentials in
force.

The descriptor always hides the signature, displays the submitted withdrawal
credentials as though they were effective, and renders `Stake ETH` identically
for both branches. That can hide a failed new-validator registration or make a
top-up appear to have withdrawal authority that it does not have.

The declared ERC-7730 schema cannot enforce BLS-signature validity, query
whether the public key is already registered, or otherwise distinguish these
branches. Merely displaying the raw signature would not make its validity
understandable. A positive attestation is therefore blocked unless the
descriptor and its consuming wallet can provide a clear-signing treatment that
makes the authorization accurate for both branches, or the applicable standard
and audit policy establish a safe, explicit treatment for this cross-layer
condition.

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
result because F-001 blocks a positive attestation for this descriptor hash.
The unresolved `owner` and `info.url` relationship is recorded as an additional
unfinished identity question, but resolving it would not change the negative
result.
