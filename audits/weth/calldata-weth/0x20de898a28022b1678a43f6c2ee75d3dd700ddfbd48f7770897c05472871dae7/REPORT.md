# ERC-7730 Descriptor Audit: calldata-weth

## Result

Status: **approved**

The completed review supports the positive attestation issued for the
descriptor's single `deposit()` format on the declared Ethereum mainnet and
Sepolia WETH9 deployments. The format accurately describes a one-to-one wrap of
the displayed ETH amount into WETH for the caller. The approval is limited to
the exact descriptor hash and does not cover `withdraw(uint256)`, the payable
fallback, standard ERC-20 operations, or other WETH deployments.

## Descriptor Identity

| Field | Value |
| --- | --- |
| Project | `weth` |
| Registry commit | `8936407e503b319882d3c811c26c8648a8e449ca` |
| Registry path | `registry/weth/calldata-weth.json` |
| ERC-7730 version | `2.0.0` |
| ERC-7730 schema hash | `0x690cb47b8d4b847dbc9a9e29da75cb05d436b132900d57508ca12173f1f800b3` |
| Audit policy version | `1.0.0` |
| ERC-8176 hash | `0x20de898a28022b1678a43f6c2ee75d3dd700ddfbd48f7770897c05472871dae7` |
| Auditor | `eip155:1:0x9a659894e5D115846767dB0e1685744c452E7a6e` |
| Dossier created | `2026-08-28T02:00:22Z` |
| Review completed | `2026-08-28T07:46:07Z` |

The descriptor snapshot is byte-for-byte identical to the file at the recorded
registry commit. Its ERC-8176 hash and the separately recorded schema hash were
recomputed from their RFC 8785 canonical JSON representations.

## Scope

Every deployment declared by the descriptor was reviewed.

| Chain | Deployment | Review |
| --- | --- | --- |
| Ethereum mainnet (`1`) | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` | Complete |
| Sepolia (`11155111`) | `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14` | Complete |

The descriptor contains one display format:

| Signature | Selector | Result |
| --- | --- | --- |
| `deposit()` | `0xd0e30db0` | Pass |

Important omitted functions and deployments are recorded under *Coverage
Limitations*. They are not part of the approval claim.

## Project and Provenance

The [canonical WETH repository](https://github.com/gnosis/canonical-weth)
describes WETH9 as the canonical wrapped-ETH package. Its `deposit()` function
accepts ETH and credits the sender with the same amount of transferable WETH.
The [canonical deployment documentation](https://github.com/gnosis/canonical-weth/blob/3c3b0292fb007d41d5d718bb3195f824a0222b80/README.md)
identifies the reviewed mainnet address. That document also lists Kovan,
Ropsten, and Rinkeby deployments, but those retired test networks are not
treated as actionable missing coverage.

The canonical WETH repository does not document Sepolia. The reviewed Sepolia
address is independently listed as WETH9 by the
[Uniswap SDK](https://github.com/Uniswap/sdks/blob/b1b62ce65e7cb40101d180ac70bc0aad6e8b0f01/sdks/sdk-core/src/entities/weth9.ts),
and its Sourcify-verified ABI, source, and behavior match WETH9.

The descriptor was introduced by Pierre Aoun of Ledger in
[registry commit `6dbfd035`](https://github.com/ethereum/clear-signing-erc7730-registry/commit/6dbfd03580531404186ba27322fb73ceea3e43e4)
and was later migrated to ERC-7730 v2 in
[registry commit `738c334a`](https://github.com/ethereum/clear-signing-erc7730-registry/commit/738c334a2bb38d24a3e5af38513a1f724d6e88ce).
No evidence links the submitter to the WETH project, so this review treats the
descriptor as community supplied.

The audited source is the Ethereum clear-signing registry at commit
`8936407e503b319882d3c811c26c8648a8e449ca`, path
`registry/weth/calldata-weth.json`. The dossier includes the exact descriptor
and declared ERC-7730 v2.0.0 schema snapshots used for validation and hashing.

## Contract and Source Verification

| Deployment | Observation block and hash | Runtime bytecode hash | Sourcify result |
| --- | --- | --- | --- |
| Ethereum mainnet | `25850638` (`0x96a576624e445bc18909f978b6923bbad3ac143b4b83677a3ff22e8f5c74cbc1`) | `0xd0a06b12ac47863b5c7be4185c2deaad1c61557033f56c7d4ea74429cbb25e23` | [Verified, match 1605500](https://repo.sourcify.dev/1/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2) |
| Sepolia | `11581802` (`0xd021d9638b1c8294e4bd49e4ff8dc3f6f6d133633cee83b2bfc07b8642b05576`) | `0xc864e10689f2da18833652a3b075d43106e87f0f90d95ee64f6f0b33bc026083` | [Verified, exact match 1079487](https://repo.sourcify.dev/11155111/0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14) |

Both Sourcify records identify `WETH9`, compiled with Solidity 0.4.19, and
report that the contracts are not proxies. At each observation block,
`eth_getCode` returned 3,124 bytes. Its Keccak-256 hash exactly matched the
corresponding Sourcify onchain-runtime-bytecode hash. `deployments.json` records
the blocks, block hashes, bytecode hashes, observation times, and verification
details needed to reproduce those conclusions.

Both declared deployments therefore have the `pass-direct` pre-filter result as
Sourcify-verified, non-proxy contracts. Neither requires an implementation or
facet binding before the function-level review can proceed.

The verified ABI declares `deposit()` as a payable function with no parameters.
Its selector is `0xd0e30db0`. The
[canonical implementation source](https://github.com/gnosis/canonical-weth/blob/0dd1ea3e295eef916d0c6223ec63141137d22d67/contracts/WETH9.sol)
credits `balanceOf[msg.sender]` by exactly `msg.value` and emits a `Deposit`
event with the same amount. The signature, parameter list, selector, and
behavior therefore agree with the descriptor.

## Function-by-Function Review

### `deposit()`

- **Selector, ABI, and source:** `deposit()` derives to selector `0xd0e30db0`.
  The verified ABI and source declare no function parameters and mark the
  function payable.
- **Execution paths and intent:** The function has one branchless execution
  path. It receives ETH and increases the caller's WETH balance by the same
  number of wei. “Wrap” accurately describes that path. Extra calldata after
  the selector does not alter the Solidity 0.4.19 implementation's behavior;
  the successful real-transaction fixture includes one such trailing byte.
- **Fields and formatting:** The only field is `@.value`, labeled `Amount` and
  formatted as a native-currency amount. The field order is complete for a
  no-argument function, and the rendered value uses ETH with 18 decimals.
- **Assets and actions:** ETH is received by the WETH9 deployment, and the same
  amount of WETH is credited to `msg.sender`. There is no separate recipient,
  spender, approval, privileged action, external price, or exchange rate to
  display.
- **Native-currency behavior:** A nonzero `msg.value` determines the wrapped
  amount and is displayed. A zero-value call succeeds, credits zero WETH, and
  renders `0 ETH`; the boundary fixture checks this behavior.
- **Representative output:** The real mainnet transaction renders `Wrap`, owner
  `WETH`, and `Amount: 0.00187 ETH`. The synthetic Sepolia transaction renders
  `Amount: 1 ETH`, and the zero-value mainnet boundary renders `Amount: 0 ETH`.
- **Result:** Pass for both declared deployments.

No fixed maximum-value fixture applies. The contract defines no deposit cap;
the executable upper bound is the sender's ETH balance and the chain's supply,
not a descriptor-visible constant. The typical nonzero fixtures exercise the
same branchless integer-to-ETH formatting path used for larger values.

## Proxy and Intent-Mutability Analysis

Both reviewed deployments are direct, immutable WETH9 contracts. Sourcify
reports `isProxy=false`, and the verified runtime has no proxy,
`delegatecall`, diamond, or administrator-controlled dispatch path. There is
therefore no separate implementation or facet address to record.

`deposit()` reads and updates the caller's WETH balance, but no administrator
controls that value, and its previous value cannot change the transaction's
displayed meaning or amount. The function reads no administrator-controlled
configuration, external target, fee, rate, pause flag, or other mutable value
that can alter the `Wrap` intent or the displayed `msg.value`. Each deployment's
display-binding result is therefore `not-required`, with an empty `stateRefs`
list in `deployments.json`.

## Includes and External Data

The descriptor has no `includes` reference. `dependencies.json` therefore has
an empty dependency list, and no resolved-descriptor snapshot is necessary.

The display uses no token metadata lookup, address name, ENS name, NFT
collection name, block timestamp, or price. The fixture's data-provider maps
are empty. The renderer uses chain metadata from
`https://chainid.network/chains_mini.json` to identify the native asset from the
transaction chain ID, then formats the transaction value as ETH with 18
decimals. `test-chain-info.json` preserves only the chain name and
native-currency values resolved for mainnet and Sepolia; `audit.json` records
their source, capture time, and raw-file SHA-256 hash. RPC URLs, faucets, and
records for chains that these fixtures do not use are intentionally omitted.

## Testing

The tests used `@ethereum-sourcify/clear-signing-test-runner` 0.1.0 at Git
commit `dae3cdabd0eab26173d7f7a31a2ca7e75bf07daf`, with
`@ethereum-sourcify/clear-signing` 0.2.2. `audit.json` records the exact wrapper
command. The wrapper executes `tests.json` without preprocessing, preserves the
runner's unmodified output as `test-results.json`, and captures the external
chain dataset before and after the run to detect a change during execution. It
then saves only the resolved mainnet and Sepolia values that can affect these
fixtures. No additional cross-chain lookup IDs apply.

| Fixture | Kind | Provenance | Expected and observed output |
| --- | --- | --- | --- |
| Wrap 0.00187 ETH on mainnet | Typical | Successful real transaction [`0xc9d812ab…3042`](https://etherscan.io/tx/0xc9d812ab4580595365ad3f90f34ed16973472458b0aeb7be3d318523e8083042) | `Wrap`; `WETH`; `Amount: 0.00187 ETH` |
| Wrap zero ETH on mainnet | Boundary | Deterministic unsigned fixture | `Wrap`; `WETH`; `Amount: 0 ETH` |
| Wrap 1 ETH on Sepolia | Typical | Deterministic unsigned fixture | `Wrap`; `WETH`; `Amount: 1 ETH` |

All three cases passed. The runner compared the intent, owner, field order,
label, and complete displayed value with `tests.json`. No external token or name
metadata was used. A negative case is not necessary for this branchless,
no-argument format; uncovered selectors and deployments are handled as explicit
scope limitations and must not resolve to this descriptor.

## Findings

None.

## Coverage Limitations

The descriptor is correct for what it includes, but it is intentionally narrow.

| ID | Omission | Coverage impact |
| --- | --- | --- |
| `L-001` | `withdraw(uint256)` (`0x2e1a7d4d`) | Unwrapping WETH has no clear-signing format in this descriptor. |
| `L-002` | Payable fallback with empty calldata | This alternate wrapping path has no clear-signing format. |
| `L-003` | `approve(address,uint256)` (`0x095ea7b3`) | WETH allowance changes are not covered. |
| `L-004` | `transfer(address,uint256)` (`0xa9059cbb`) | Direct WETH transfers are not covered. |
| `L-005` | `transferFrom(address,address,uint256)` (`0x23b872dd`) | Delegated WETH transfers are not covered. |
| `L-006` | Compatible direct WETH deployments | Verified one-to-one `deposit()` implementations are omitted. |
| `L-007` | Proxy WETH deployments | ERC-7730 v2 cannot bind their mutable implementations. |
| `L-008` | Unverified WETH deployments | Required Sourcify verification was unavailable. |

A wallet may handle the standard ERC-20 functions through a separately verified
generic ERC-20 description. It must not reuse this descriptor's `Wrap` intent
for those functions, `withdraw(uint256)`, or the payable fallback.

The [pinned Uniswap WETH9 list](https://github.com/Uniswap/sdks/blob/b1b62ce65e7cb40101d180ac70bc0aad6e8b0f01/sdks/sdk-core/src/entities/weth9.ts)
identifies the following additional deployments. They are not declared by this
descriptor or reviewed as in-scope deployments. The structured limitations
exclude the source's legacy Ropsten, Rinkeby, Goerli, Kovan, Optimism Kovan, and
Arbitrum Rinkeby entries.

### L-006: Compatible Direct Deployments

The verified source at each address exposes a payable `deposit()` with no
arguments and credits `msg.value` one-to-one to the caller. These deployments
appear compatible with this display format, but adding them would change the
descriptor hash and require a complete review of the expanded descriptor.

| Chain ID | Address |
| --- | --- |
| `10` | `0x4200000000000000000000000000000000000006` |
| `11155420` | `0x4200000000000000000000000000000000000006` |
| `8453` | `0x4200000000000000000000000000000000000006` |
| `84532` | `0x4200000000000000000000000000000000000006` |
| `7777777` | `0x4200000000000000000000000000000000000006` |
| `480` | `0x4200000000000000000000000000000000000006` |
| `130` | `0x4200000000000000000000000000000000000006` |
| `59144` | `0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f` |

### L-007: Proxy Deployments

Arbitrum One and Blast use upgradeable proxies. Arbitrum's current `aeWETH`
implementation preserves the one-to-one deposit behavior, but an administrator
can replace it. Blast's implementation was not Sourcify-verified. Because the
declared ERC-7730 schema can constrain only each chain and proxy address, it
cannot keep either display bound to the reviewed implementation.

| Chain ID | Address |
| --- | --- |
| `42161` | `0x82aF49447D8a07e3bd95BD0d56f35241523fBab1` |
| `81457` | `0x4300000000000000000000000000000000000004` |

### L-008: Deployments Without Sourcify Verification

Sourcify supports each of these chains but had no contract verification record
for the listed address during this review. They cannot be added under the audit
policy unless that source-verification requirement is satisfied.

| Chain ID | Address |
| --- | --- |
| `421614` | `0x980B62Da83eFf3D4576C647993b0c1D7faf17c73` |
| `324` | `0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91` |
| `1301` | `0x4200000000000000000000000000000000000006` |
| `1868` | `0x4200000000000000000000000000000000000006` |
| `4326` | `0x4200000000000000000000000000000000000006` |
| `4663` | `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` |
| `57073` | `0x4200000000000000000000000000000000000006` |

At an uncovered selector or deployment, a wallet must use another applicable,
verified description or fall back to its normal non-ERC-7730 transaction
review. It must not imply that this audit covers the interaction.

## Hash Glossary

- The ERC-8176 descriptor and schema hashes are Keccak-256 hashes of their RFC
  8785 canonical JSON, so they identify JSON content independent of whitespace.
- Each observation block hash is the chain's identifier for the exact block at
  which the deployment evidence was collected.
- Each runtime bytecode hash is Keccak-256 of the code returned by `eth_getCode`
  at the observation block.
- The external-data hash is SHA-256 of the exact bytes saved in
  `test-chain-info.json`.

## Attestation

The review passed, and the auditor issued an ERC-8176 EAS version 2 offchain
attestation on Ethereum mainnet.

- Attester: `0x9a659894e5D115846767dB0e1685744c452E7a6e`
- Attested at: `2026-08-28T08:19:30Z`
- Schema UID:
  `0xe023eef113c1670774801c34b377fdf612dd8a4d2fa92fe382e15bd91fafb5c2`
- Attestation UID:
  `0x0e2e90b75f70e262992a3f3723b3030cbc68c8b0c8350d8e71ad2694e387f226`
- Descriptor hash:
  `0x20de898a28022b1678a43f6c2ee75d3dd700ddfbd48f7770897c05472871dae7`
- Recipient: none (the zero address)
- Expiration: none
- Revocable: yes
- Raw export:
  [`calldata-weth.eip155-1-0x9a659894e5D115846767dB0e1685744c452E7a6e.json`](calldata-weth.eip155-1-0x9a659894e5D115846767dB0e1685744c452E7a6e.json)
