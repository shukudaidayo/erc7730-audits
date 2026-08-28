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
const revocation = {
  type: "revocation",
  recordedAt: "2026-08-28T04:00:00Z",
};
const events = [revocation, correction, supersession];

assert.deepEqual(sortAuditEvents(events), [correction, supersession, revocation]);
assert.equal(effectiveAuditStatus("approved", []), "approved");
assert.equal(effectiveAuditStatus("approved", [correction]), "approved");
assert.equal(effectiveAuditStatus("approved", [supersession]), "superseded");
assert.equal(effectiveAuditStatus("approved", events), "revoked");
assert.equal(effectiveAuditStatus("approved", [revocation]), "revoked");
const simultaneousEvents = events.map((event) => ({ ...event, recordedAt: revocation.recordedAt }));
assert.deepEqual(sortAuditEvents(simultaneousEvents).map((event) => event.type),
  ["correction", "supersession", "revocation"]);
assert.equal(effectiveAuditStatus("approved", simultaneousEvents), "revoked");
assert.equal(effectiveAuditStatus("approved", [
  revocation, { ...supersession, recordedAt: "2026-08-28T05:00:00Z" },
]), "revoked", "invalid later supersession must never hide a revocation in indexes");
assert.throws(() => effectiveAuditStatus("approved", [{ ...revocation, type: "withdrawal" }]),
  /Unknown lifecycle event type/, "legacy event types must not silently leave an audit approved");
assert.equal(
  latestAuditTimestamp("2026-08-28T01:00:00Z", events),
  "2026-08-28T04:00:00Z",
);

process.stdout.write("Audit event tests passed.\n");
