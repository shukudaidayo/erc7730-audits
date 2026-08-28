import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export function listAuditEventFiles(dossier) {
  const directory = join(dossier, "events");
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith(".") && entry.name.endsWith(".json"))
    .map((entry) => join(directory, entry.name))
    .sort();
}

export function sortAuditEvents(events) {
  return [...events].sort((left, right) => (
    left.recordedAt.localeCompare(right.recordedAt)
    || left.type.localeCompare(right.type)
  ));
}

export function effectiveAuditStatus(auditStatus, events) {
  let status = auditStatus;
  for (const event of sortAuditEvents(events)) {
    if (event.type === "supersession") status = "superseded";
    if (event.type === "withdrawal") status = "withdrawn";
  }
  return status;
}

export function latestAuditTimestamp(reviewedAt, events) {
  return sortAuditEvents(events).reduce(
    (latest, event) => event.recordedAt > latest ? event.recordedAt : latest,
    reviewedAt,
  );
}
