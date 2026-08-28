# Audit Event Templates

Copy the applicable template into the immutable dossier's `events/` directory.
Use a UTC filename in the form `YYYYMMDDTHHMMSSZ-<type>.json`, replace every
`REPLACE_...` value, and run `npm run verify` and `npm run generate-indexes`.

- Use `revocation` after revoking the recorded attestation through EAS. Adding
  the event does not itself revoke the attestation.
- Use `supersession` when a newer dossier should be preferred and the old
  approval is not known to be wrong.
- Use `correction` to state corrected information about an existing dossier file
  without editing that file. Use it only when the descriptor, evidence, and
  audit conclusion do not change. Revoke the attestation if the correction
  changes the approval claim.

Never edit or delete the original audit files or attestation when adding an
event.
