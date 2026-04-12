/**
 * Integration tests that call real Notes.app via osascript.
 * Requires macOS with Notes.app available and a configured account.
 * Run separately from unit tests: npm run test:integration
 *
 * On CI (GHA macOS runners), Notes.app has no iCloud account and
 * hangs on first-run dialogs. A preflight check detects this and
 * skips all tests gracefully.
 */
import { describe, it, after, before, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PREFIX = `__integration_test_${Date.now()}`;
const PROJECT_DIR = import.meta.dirname + "/../..";

// Track note IDs created during tests for cleanup
const createdNoteIds: string[] = [];

// Set by preflight check — when false, all tests skip
let notesAvailable = false;

async function run(...args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync("node", ["--import", "tsx", "src/index.ts", ...args], {
    cwd: PROJECT_DIR,
    timeout: 30_000,
  });
}

async function runJson<T>(...args: string[]): Promise<T> {
  const { stdout } = await run(...args);
  return JSON.parse(stdout) as T;
}

/** Returns true if Notes.app is available, false (and marks test skipped) if not. */
function requireNotes(t: TestContext): boolean {
  if (!notesAvailable) {
    t.skip("Notes.app not available or not configured");
    return false;
  }
  return true;
}

// Preflight: check if Notes.app responds to osascript within 10s
before(async () => {
  try {
    const { stdout } = await execFileAsync(
      "/usr/bin/osascript",
      ["-l", "JavaScript", "-e", 'var app = Application("Notes"); JSON.stringify({ok: true, accounts: app.accounts().length});'],
      { timeout: 10_000 },
    );
    const result = JSON.parse(stdout.trim());
    if (result.ok && result.accounts > 0) {
      notesAvailable = true;
      console.log(`# Preflight passed: Notes.app has ${result.accounts} account(s)`);
    } else {
      console.log("# Preflight: Notes.app responded but has no accounts, skipping tests");
    }
  } catch (err) {
    console.log(`# Preflight: Notes.app not usable (${err instanceof Error ? err.message.split("\n")[0] : err}), skipping tests`);
  }
});

// Cleanup: delete any notes we created, even if tests fail
after(async () => {
  for (const id of createdNoteIds) {
    try {
      await run("delete", id);
    } catch {
      // best-effort cleanup
    }
  }
});

describe("integration: accounts", () => {
  it("lists accounts with expected shape", async (t) => {
    if (!requireNotes(t)) return;
    const accounts = await runJson<unknown[]>("accounts");
    assert.ok(Array.isArray(accounts));
    assert.ok(accounts.length > 0, "should have at least one account");

    const first = accounts[0] as Record<string, unknown>;
    assert.ok("id" in first);
    assert.ok("name" in first);
    assert.ok("folderCount" in first);
    assert.ok("noteCount" in first);
  });
});

describe("integration: folders", () => {
  it("lists folders with expected shape", async (t) => {
    if (!requireNotes(t)) return;
    const folders = await runJson<unknown[]>("folders", "list");
    assert.ok(Array.isArray(folders));
    assert.ok(folders.length > 0, "should have at least one folder");

    const first = folders[0] as Record<string, unknown>;
    assert.ok("id" in first);
    assert.ok("name" in first);
    assert.ok("account" in first);
    assert.ok("noteCount" in first);
  });
});

describe("integration: list", () => {
  it("lists notes with expected shape", async (t) => {
    if (!requireNotes(t)) return;
    const notes = await runJson<unknown[]>("list", "--limit", "2");
    assert.ok(Array.isArray(notes));

    if (notes.length > 0) {
      const first = notes[0] as Record<string, unknown>;
      assert.ok("id" in first);
      assert.ok("name" in first);
      assert.ok("folder" in first);
      assert.ok("account" in first);
      assert.ok("creationDate" in first);
      assert.ok("modificationDate" in first);
      assert.ok("shared" in first);
      assert.ok("passwordProtected" in first);
    }
  });

  it("respects --limit", async (t) => {
    if (!requireNotes(t)) return;
    const notes = await runJson<unknown[]>("list", "--limit", "1");
    assert.ok(notes.length <= 1);
  });
});

describe("integration: full CRUD cycle", () => {
  const title = `${PREFIX}_crud`;
  let noteId: string;

  it("creates a note", async (t) => {
    if (!requireNotes(t)) return;
    const note = await runJson<Record<string, unknown>>(
      "create",
      title,
      "--body-text",
      "Integration test body",
    );

    assert.equal(note.name, title);
    assert.ok(typeof note.id === "string");
    assert.ok((note.plaintext as string).includes("Integration test body"));
    assert.equal(note.folder, "Notes");

    noteId = note.id as string;
    createdNoteIds.push(noteId);
  });

  it("shows the created note by ID", async (t) => {
    if (!requireNotes(t)) return;
    const note = await runJson<Record<string, unknown>>("show", noteId);
    assert.equal(note.id, noteId);
    assert.equal(note.name, title);
    assert.ok((note.plaintext as string).includes("Integration test body"));
    assert.ok("body" in note);
    assert.ok("attachmentCount" in note);
  });

  it("shows the created note by name", async (t) => {
    if (!requireNotes(t)) return;
    const note = await runJson<Record<string, unknown>>("show", title);
    assert.equal(note.id, noteId);
  });

  it("finds the note via title search", async (t) => {
    if (!requireNotes(t)) return;
    const results = await runJson<Array<Record<string, unknown>>>(
      "search",
      PREFIX,
      "--title-only",
    );
    const found = results.find((n) => n.id === noteId);
    assert.ok(found, "should find our note by title search");
  });

  it("finds the note via content search", async (t) => {
    if (!requireNotes(t)) return;
    const results = await runJson<Array<Record<string, unknown>>>(
      "search",
      "Integration test body",
    );
    const found = results.find((n) => n.id === noteId);
    assert.ok(found, "should find our note by content search");
  });

  it("appends text to the note", async (t) => {
    if (!requireNotes(t)) return;
    const note = await runJson<Record<string, unknown>>(
      "update",
      noteId,
      "--append-text",
      "Appended line",
    );
    assert.ok((note.plaintext as string).includes("Appended line"));
    assert.ok((note.plaintext as string).includes("Integration test body"));
  });

  it("renames the note", async (t) => {
    if (!requireNotes(t)) return;
    const newTitle = `${title}_renamed`;
    const note = await runJson<Record<string, unknown>>(
      "update",
      noteId,
      "--title",
      newTitle,
    );
    assert.equal(note.name, newTitle);
    assert.ok((note.plaintext as string).includes("Integration test body"));
  });

  it("deletes the note", async (t) => {
    if (!requireNotes(t)) return;
    const result = await runJson<Record<string, unknown>>("delete", noteId);
    assert.equal(result.deleted, true);
    assert.equal(result.id, noteId);
    const idx = createdNoteIds.indexOf(noteId);
    if (idx !== -1) createdNoteIds.splice(idx, 1);
  });
});

describe("integration: error handling", () => {
  it("returns error for non-existent note", async (t) => {
    if (!requireNotes(t)) return;
    try {
      await run("show", `${PREFIX}_nonexistent_note_xyz`);
      assert.fail("should have thrown");
    } catch (err: unknown) {
      const e = err as { stderr?: string };
      assert.ok(e.stderr, "should have stderr output");
      const parsed = JSON.parse(e.stderr.trim());
      assert.equal(parsed.error, true);
      assert.ok(parsed.code);
      assert.ok(parsed.message);
    }
  });
});

describe("integration: pretty format", () => {
  it("outputs human-readable text with --format pretty", async (t) => {
    if (!requireNotes(t)) return;
    const { stdout } = await run("--format", "pretty", "accounts");
    assert.throws(() => JSON.parse(stdout), "pretty output should not be JSON");
    assert.ok(stdout.length > 0);
  });
});

describe("integration: help-all", () => {
  it("outputs help for all commands", async () => {
    const { stdout } = await run("help-all");
    assert.ok(stdout.includes("notes list"));
    assert.ok(stdout.includes("notes show"));
    assert.ok(stdout.includes("notes search"));
    assert.ok(stdout.includes("notes create"));
    assert.ok(stdout.includes("notes update"));
    assert.ok(stdout.includes("notes delete"));
    assert.ok(stdout.includes("notes move"));
    assert.ok(stdout.includes("notes folders"));
    assert.ok(stdout.includes("notes accounts"));
  });
});
