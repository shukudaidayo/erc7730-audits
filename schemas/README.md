# Schema Versions

Files with a version in their name are immutable after publication when audit
dossiers or lifecycle records can reference them. A validation change that
would make a previously valid document invalid requires a new schema version.
Git history supplements these identifiers but does not replace them.

Each JSON document selects its schema through `$schema`. Verification must use
that exact repository schema rather than silently applying the newest version.

## Rendering Fixture Schemas

| Schema | Status | Meaning |
| --- | --- | --- |
| `tests-v1.schema.json` | Legacy | The original fixture schema used by the WETH and DepositContract audits. It permits `negative` cases with `expectedError`. |
| `tests-v2.schema.json` | Current | Sourcify-runner fixtures containing only `typical` and `boundary` cases expected to render successfully. Expected-error evidence belongs in `REPORT.md`. |

New audit dossiers use `tests-v2.schema.json`. Existing dossiers retain their
original `$schema` reference.
