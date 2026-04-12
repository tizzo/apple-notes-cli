import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatOutput } from "../format.js";
import type { NoteSummary, NoteDetail, FolderInfo, AccountInfo, DeleteResult, MoveResult } from "../types.js";

const sampleSummary: NoteSummary = {
  id: "x-coredata://ABC/ICNote/p1",
  name: "Groceries",
  folder: "Notes",
  account: "iCloud",
  creationDate: "2026-01-15T10:00:00.000Z",
  modificationDate: "2026-04-10T14:30:00.000Z",
  shared: false,
  passwordProtected: false,
};

const sampleDetail: NoteDetail = {
  ...sampleSummary,
  body: "<div>Milk, eggs, bread</div>",
  plaintext: "Milk, eggs, bread",
  attachmentCount: 0,
};

describe("formatOutput json mode", () => {
  it("formats arrays as JSON", () => {
    const out = formatOutput([sampleSummary], "json");
    const parsed = JSON.parse(out);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].name, "Groceries");
  });

  it("formats single objects as JSON", () => {
    const out = formatOutput(sampleDetail, "json");
    const parsed = JSON.parse(out);
    assert.equal(parsed.name, "Groceries");
    assert.equal(parsed.plaintext, "Milk, eggs, bread");
  });

  it("formats empty arrays as JSON", () => {
    const out = formatOutput([], "json");
    assert.equal(out, "[]");
  });
});

describe("formatOutput pretty mode", () => {
  it("formats note summary with name, folder, date", () => {
    const out = formatOutput([sampleSummary], "pretty");
    assert.ok(out.includes("Groceries"));
    assert.ok(out.includes("Notes"));
    assert.ok(out.includes("2026-04-10"));
  });

  it("shows flags for shared/locked notes", () => {
    const shared: NoteSummary = { ...sampleSummary, shared: true, passwordProtected: true };
    const out = formatOutput([shared], "pretty");
    assert.ok(out.includes("shared"));
    assert.ok(out.includes("locked"));
  });

  it("formats note detail with plaintext content", () => {
    const out = formatOutput(sampleDetail, "pretty");
    assert.ok(out.includes("# Groceries"));
    assert.ok(out.includes("Milk, eggs, bread"));
    assert.ok(out.includes("folder: Notes"));
  });

  it("formats folders with note count", () => {
    const folder: FolderInfo = { id: "f1", name: "Work", account: "iCloud", noteCount: 12 };
    const out = formatOutput([folder], "pretty");
    assert.ok(out.includes("Work"));
    assert.ok(out.includes("12 notes"));
    assert.ok(out.includes("iCloud"));
  });

  it("formats accounts with folder and note count", () => {
    const account: AccountInfo = { id: "a1", name: "iCloud", folderCount: 3, noteCount: 254 };
    const out = formatOutput([account], "pretty");
    assert.ok(out.includes("iCloud"));
    assert.ok(out.includes("3 folders"));
    assert.ok(out.includes("254 notes"));
  });

  it("formats delete result", () => {
    const result: DeleteResult = { deleted: true, id: "x1", name: "Old Note" };
    const out = formatOutput(result, "pretty");
    assert.ok(out.includes("Deleted"));
    assert.ok(out.includes("Old Note"));
  });

  it("formats move result", () => {
    const result: MoveResult = { moved: true, id: "x1", name: "My Note", folder: "Archive" };
    const out = formatOutput(result, "pretty");
    assert.ok(out.includes("Moved"));
    assert.ok(out.includes("My Note"));
    assert.ok(out.includes("Archive"));
  });

  it("shows 'No results.' for empty arrays", () => {
    const out = formatOutput([], "pretty");
    assert.equal(out, "No results.");
  });
});
