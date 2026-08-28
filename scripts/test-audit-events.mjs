#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  effectiveAuditStatus,
  latestAuditTimestamp,
  sortAuditEvents,
} from "./audit-events.mjs";

const correction = {
  type: "correction",
  recordedAt: "2026-08-28T02:00:00Z",
};
const supersession = {
  type: "supersession",
  recordedAt: "2026-08-28T03:00:00Z",
};
const withdrawal = {
  type: "withdrawal",
  recordedAt: "2026-08-28T04:00:00Z",
};
const events = [withdrawal, correction, supersession];

assert.deepEqual(sortAuditEvents(events), [correction, supersession, withdrawal]);
assert.equal(effectiveAuditStatus("approved", []), "approved");
assert.equal(effectiveAuditStatus("approved", [correction]), "approved");
assert.equal(effectiveAuditStatus("approved", [supersession]), "superseded");
assert.equal(effectiveAuditStatus("approved", events), "withdrawn");
assert.equal(
  latestAuditTimestamp("2026-08-28T01:00:00Z", events),
  "2026-08-28T04:00:00Z",
);

process.stdout.write("Audit event tests passed.\n");
