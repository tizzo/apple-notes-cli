import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class JxaError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "JxaError";
  }
}

export async function runJxa<T>(script: string): Promise<T> {
  const raw = await runJxaRaw(script);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new JxaError("PARSE_FAILED", `Failed to parse JXA output: ${raw.slice(0, 200)}`);
  }
}

export async function runJxaRaw(script: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      "/usr/bin/osascript",
      ["-l", "JavaScript", "-e", script],
      { maxBuffer: 10 * 1024 * 1024, timeout: 30_000 },
    );
    return stdout.trim();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes("not running") || msg.includes("(-600)")) {
      throw new JxaError("NOTES_NOT_RUNNING", "Notes.app is not running and could not be launched");
    }
    if (msg.includes("not found") || msg.includes("Can't get note")) {
      throw new JxaError("NOTE_NOT_FOUND", extractMessage(msg));
    }
    if (msg.includes("Can't get folder")) {
      throw new JxaError("FOLDER_NOT_FOUND", extractMessage(msg));
    }
    if (msg.includes("Can't get account")) {
      throw new JxaError("ACCOUNT_NOT_FOUND", extractMessage(msg));
    }

    throw new JxaError("SCRIPT_FAILED", msg);
  }
}

function extractMessage(stderr: string): string {
  // osascript errors often have "execution error: <msg> (-num)"
  const match = stderr.match(/execution error:\s*(.+?)\s*\(/);
  return match?.[1] ?? stderr.split("\n")[0] ?? stderr;
}

/**
 * Escape a string for safe embedding in a JXA script as a JSON.stringify'd value.
 * This is the safest approach — avoids manual quote escaping entirely.
 */
export function jxaString(value: string): string {
  return JSON.stringify(value);
}

/**
 * Build the JXA snippet to resolve a note by name or x-coredata:// ID.
 * Assigns the resolved note to the given variable name.
 */
export function resolveNoteSnippet(identifier: string, varName = "note"): string {
  return `
var _id = ${jxaString(identifier)};
var ${varName};
if (_id.startsWith("x-coredata://")) {
  ${varName} = app.notes.byId(_id);
  try { ${varName}.id(); } catch(e) {
    throw new Error("Note not found with ID: " + _id);
  }
} else {
  var _allNames = app.notes.name();
  var _idx = -1;
  for (var _i = 0; _i < _allNames.length; _i++) {
    if (_allNames[_i] === _id) { _idx = _i; break; }
  }
  if (_idx === -1) throw new Error("Note not found: " + _id);
  ${varName} = app.notes[_idx];
}`;
}

/**
 * Snippet to serialize a resolved note variable into a NoteDetail JSON object.
 */
export function noteDetailSnippet(varName = "note"): string {
  return `{
  id: ${varName}.id(),
  name: ${varName}.name(),
  body: ${varName}.body(),
  plaintext: ${varName}.plaintext(),
  creationDate: ${varName}.creationDate().toISOString(),
  modificationDate: ${varName}.modificationDate().toISOString(),
  shared: ${varName}.shared(),
  passwordProtected: ${varName}.passwordProtected(),
  folder: ${varName}.container().name(),
  account: ${varName}.container().container().name(),
  attachmentCount: ${varName}.attachments().length
}`;
}

/**
 * Wrap plain text lines in HTML div tags for Apple Notes body format.
 */
export function textToHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => `<div>${escapeHtml(line) || "<br>"}</div>`)
    .join("");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
