/**
 * Integration tests that call real Notes.app via osascript.
 * Requires macOS with Notes.app available.
 * Run separately from unit tests: npm run test:integration
 */
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CLI = ["node", ["--import", "tsx", "src/index.ts"]];
const PREFIX = `__integration_test_${Date.now()}`;

// Track note IDs created during tests for cleanup
const createdNoteIds: string[] = [];

async function run(...args: string[]): Promise<{ stdout: string; stderr: string }> {
  const [cmd, baseArgs] = CLI;
  return execFileAsync(cmd, [...baseArgs, ...args], {
    cwd: import.meta.dirname + "/../..",
    timeout: 30_000,
  });
}

async function runJson<T>(...args: string[]): Promise<T> {
  const { stdout } = await run(...args);
  return JSON.parse(stdout) as T;
}

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
  it("lists accounts with expected shape", async () => {
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
  it("lists folders with expected shape", async () => {
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
  it("lists notes with expected shape", async () => {
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

  it("respects --limit", async () => {
    const notes = await runJson<unknown[]>("list", "--limit", "1");
    assert.ok(notes.length <= 1);
  });
});

describe("integration: full CRUD cycle", () => {
  const title = `${PREFIX}_crud`;
  let noteId: string;

  it("creates a note", async () => {
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

  it("shows the created note by ID", async () => {
    const note = await runJson<Record<string, unknown>>("show", noteId);
    assert.equal(note.id, noteId);
    assert.equal(note.name, title);
    assert.ok((note.plaintext as string).includes("Integration test body"));
    assert.ok("body" in note);
    assert.ok("attachmentCount" in note);
  });

  it("shows the created note by name", async () => {
    const note = await runJson<Record<string, unknown>>("show", title);
    assert.equal(note.id, noteId);
  });

  it("finds the note via title search", async () => {
    const results = await runJson<Array<Record<string, unknown>>>(
      "search",
      PREFIX,
      "--title-only",
    );
    const found = results.find((n) => n.id === noteId);
    assert.ok(found, "should find our note by title search");
  });

  it("finds the note via content search", async () => {
    const results = await runJson<Array<Record<string, unknown>>>(
      "search",
      "Integration test body",
    );
    const found = results.find((n) => n.id === noteId);
    assert.ok(found, "should find our note by content search");
  });

  it("appends text to the note", async () => {
    const note = await runJson<Record<string, unknown>>(
      "update",
      noteId,
      "--append-text",
      "Appended line",
    );
    assert.ok((note.plaintext as string).includes("Appended line"));
    assert.ok((note.plaintext as string).includes("Integration test body"));
  });

  it("renames the note", async () => {
    const newTitle = `${title}_renamed`;
    const note = await runJson<Record<string, unknown>>(
      "update",
      noteId,
      "--title",
      newTitle,
    );
    assert.equal(note.name, newTitle);
    // Content should be preserved
    assert.ok((note.plaintext as string).includes("Integration test body"));
  });

  it("deletes the note", async () => {
    const result = await runJson<Record<string, unknown>>("delete", noteId);
    assert.equal(result.deleted, true);
    assert.equal(result.id, noteId);
    // Remove from cleanup list since we already deleted it
    const idx = createdNoteIds.indexOf(noteId);
    if (idx !== -1) createdNoteIds.splice(idx, 1);
  });
});

describe("integration: error handling", () => {
  it("returns error for non-existent note", async () => {
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
  it("outputs human-readable text with --format pretty", async () => {
    const { stdout } = await run("--format", "pretty", "accounts");
    // Pretty format should NOT be valid JSON
    assert.throws(() => JSON.parse(stdout), "pretty output should not be JSON");
    // Should contain account names as plain text
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
