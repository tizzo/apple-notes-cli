import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { JxaError } from "../jxa.js";

describe("JxaError", () => {
  it("stores code and message", () => {
    const err = new JxaError("NOTE_NOT_FOUND", "Note not found: Test");
    assert.equal(err.code, "NOTE_NOT_FOUND");
    assert.equal(err.message, "Note not found: Test");
    assert.equal(err.name, "JxaError");
  });

  it("is an instance of Error", () => {
    const err = new JxaError("SCRIPT_FAILED", "something broke");
    assert.ok(err instanceof Error);
    assert.ok(err instanceof JxaError);
  });

  it("has a stack trace", () => {
    const err = new JxaError("PARSE_FAILED", "bad json");
    assert.ok(err.stack);
    assert.ok(err.stack.includes("errors.test.ts"));
  });
});
