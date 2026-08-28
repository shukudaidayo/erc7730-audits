import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Revocation comes last at equal timestamps so supersession cannot hide it.
const eventOrder = { correction: 0, supersession: 1, revocation: 2 };

export function listAuditEventFiles(dossier) {
  const directory = join(dossier, "events");
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith(".") && entry.name.endsWith(".json"))
    .map((entry) => join(directory, entry.name))
    .sort();
}

export function sortAuditEvents(events) {
  for (const event of events) {
    if (!Object.hasOwn(eventOrder, event.type)) {
      throw new Error(`Unknown lifecycle event type: ${event.type}`);
    }
  }
  return [...events].sort((left, right) => (
    left.recordedAt.localeCompare(right.recordedAt)
    || eventOrder[left.type] - eventOrder[right.type]
  ));
}

export function effectiveAuditStatus(auditStatus, events) {
  let status = auditStatus;
  for (const event of sortAuditEvents(events)) {
    if (event.type === "supersession" && status !== "revoked") status = "superseded";
    if (event.type === "revocation") status = "revoked";
  }
  return status;
}

export function latestAuditTimestamp(reviewedAt, events) {
  return sortAuditEvents(events).reduce(
    (latest, event) => event.recordedAt > latest ? event.recordedAt : latest,
    reviewedAt,
  );
}
