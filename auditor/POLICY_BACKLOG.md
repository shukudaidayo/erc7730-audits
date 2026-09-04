# Audit Policy Backlog

This file records possible changes for the next audit policy version. It is not
part of the current policy.

## Version 1.3.0

- Define an important omitted function by its relevance to the descriptor's
  intended user workflow, not solely because it changes state or requires a
  privileged caller. Administrative and maintenance functions outside that
  workflow need not be formal coverage limitations unless their omission
  materially limits the descriptor's stated purpose. Update the report template
  at the same time.
- Revisit the requirement to display `@.value` after the outcome of
  [ethereum/ERCs#1974](https://github.com/ethereum/ERCs/pull/1974). If ERC-7730
  requires wallets to display every nonzero native transaction value regardless
  of descriptor references, distinguish that wallet requirement from the
  descriptor author's recommendation and define when omission is non-blocking.
