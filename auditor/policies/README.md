# Archived Audit Policies

Before changing the version in `auditor/AUDIT_POLICY.md`, copy the complete
current policy to this directory as `<version>.md`. For example, archive version
`1.0.0` as `1.0.0.md` before publishing version `1.1.0`.

Archived policies are immutable. The verifier accepts a completed audit when
its `policyVersion` matches either the current policy or an archived policy with
the same version in its contents. This preserves validation of append-only audit
records after the current policy changes.
