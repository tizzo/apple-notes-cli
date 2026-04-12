import type {
  AccountInfo,
  DeleteResult,
  FolderInfo,
  MoveResult,
  NoteDetail,
  NoteSummary,
  OutputFormat,
} from "./types.js";

export function formatOutput(data: unknown, format: OutputFormat): string {
  if (format === "json") {
    return JSON.stringify(data, null, 2);
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return "No results.";
    const first = data[0];
    if ("plaintext" in first) return data.map(formatNoteDetail).join("\n---\n");
    if ("body" in first) return data.map(formatNoteDetail).join("\n---\n");
    if ("noteCount" in first && "account" in first && !("folderCount" in first))
      return data.map(formatFolder).join("\n");
    if ("folderCount" in first) return data.map(formatAccount).join("\n");
    if ("name" in first && "id" in first) return data.map(formatNoteSummary).join("\n");
    return JSON.stringify(data, null, 2);
  }

  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if ("deleted" in d) return formatDelete(d as unknown as DeleteResult);
    if ("moved" in d) return formatMove(d as unknown as MoveResult);
    if ("plaintext" in d) return formatNoteDetail(d as unknown as NoteDetail);
    if ("body" in d) return formatNoteDetail(d as unknown as NoteDetail);
  }

  return JSON.stringify(data, null, 2);
}

function formatNoteSummary(n: NoteSummary): string {
  const date = n.modificationDate.split("T")[0];
  const flags = [n.shared ? "shared" : "", n.passwordProtected ? "locked" : ""]
    .filter(Boolean)
    .join(", ");
  const extra = flags ? ` [${flags}]` : "";
  return `${n.name}  (${n.folder}, ${date})${extra}  id:${n.id}`;
}

function formatNoteDetail(n: NoteDetail): string {
  const date = n.modificationDate.split("T")[0];
  const lines = [
    `# ${n.name}`,
    `folder: ${n.folder}  account: ${n.account}  modified: ${date}`,
    `attachments: ${n.attachmentCount}  shared: ${n.shared}  locked: ${n.passwordProtected}`,
    `id: ${n.id}`,
    "",
    n.plaintext,
  ];
  return lines.join("\n");
}

function formatFolder(f: FolderInfo): string {
  return `${f.name}  (${f.noteCount} notes, ${f.account})  id:${f.id}`;
}

function formatAccount(a: AccountInfo): string {
  return `${a.name}  (${a.folderCount} folders, ${a.noteCount} notes)  id:${a.id}`;
}

function formatDelete(d: DeleteResult): string {
  return `Deleted: ${d.name}  id:${d.id}`;
}

function formatMove(m: MoveResult): string {
  return `Moved: ${m.name} -> ${m.folder}  id:${m.id}`;
}
