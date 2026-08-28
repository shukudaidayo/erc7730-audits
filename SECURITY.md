# Security policy

## Reporting an audit error

Report a suspected incorrect audit, forged attestation, identity mismatch, or
compromised signing key privately before public disclosure when doing so would
reduce user risk.

- Twitter DM: @shukudaidayo
- Email: shukudaidayo@protonmail.com

Include the descriptor hash, audit path, affected deployment, and a concise
description of the problem. Do not include private keys or seed phrases.

## Signing-key compromise

If the attestation key may be compromised:

1. Stop issuing attestations with the key.
2. Revoke affected attestations through Ethereum Attestation Service.
3. Add a withdrawal event to each affected audit dossier without modifying or
   deleting the original audit or attestation.
4. Publish a repository notice identifying the compromised CAIP-10 account and
   the revocation transaction or record.
5. Notify wallet vendors or registries that were explicitly configured to trust
   the key.
6. Add a new auditor profile for the replacement key. Do not silently rewrite
   the old identity.

Deleting an attestation JSON file, changing `audit.json`, or adding a withdrawal
event is not a cryptographic revocation. The EAS revocation is required.

## Repository controls

- Protect the default branch and require pull requests.
- Require validation to pass before merge.
- Do not allow force pushes or deletion of the default branch.
- Review changes to schemas, policy, and CI as security-sensitive changes.
- Keep approved dossiers append-only.
- Never place signing secrets in repository files, Actions secrets used by
  untrusted pull requests, logs, or build artifacts.
