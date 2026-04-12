import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { jxaString, resolveNoteSnippet, noteDetailSnippet, textToHtml } from "../jxa.js";

describe("jxaString", () => {
  it("wraps a simple string in quotes", () => {
    assert.equal(jxaString("hello"), '"hello"');
  });

  it("escapes double quotes", () => {
    assert.equal(jxaString('say "hi"'), '"say \\"hi\\""');
  });

  it("escapes backslashes", () => {
    assert.equal(jxaString("back\\slash"), '"back\\\\slash"');
  });

  it("escapes newlines", () => {
    assert.equal(jxaString("line1\nline2"), '"line1\\nline2"');
  });

  it("handles empty string", () => {
    assert.equal(jxaString(""), '""');
  });

  it("handles unicode", () => {
    const result = jxaString("caf\u00e9 \ud83c\udf1f");
    assert.ok(result.startsWith('"'));
    assert.ok(result.endsWith('"'));
  });
});

describe("resolveNoteSnippet", () => {
  it("generates ID-based lookup for x-coredata:// identifiers", () => {
    const snippet = resolveNoteSnippet("x-coredata://ABC/ICNote/p123");
    assert.ok(snippet.includes('_id.startsWith("x-coredata://")'));
    assert.ok(snippet.includes("app.notes.byId(_id)"));
    assert.ok(snippet.includes("x-coredata://ABC/ICNote/p123"));
  });

  it("generates name-based lookup for plain strings", () => {
    const snippet = resolveNoteSnippet("My Shopping List");
    assert.ok(snippet.includes("My Shopping List"));
    assert.ok(snippet.includes("_allNames"));
  });

  it("uses custom variable name", () => {
    const snippet = resolveNoteSnippet("Test", "myNote");
    assert.ok(snippet.includes("var myNote;"));
    assert.ok(snippet.includes("myNote = app.notes.byId(_id)"));
    assert.ok(snippet.includes("myNote = app.notes[_idx]"));
  });

  it("escapes special characters in note names", () => {
    const snippet = resolveNoteSnippet('Note with "quotes" & stuff');
    // Should be safely JSON-encoded
    assert.ok(snippet.includes('\\"quotes\\"'));
  });
});

describe("noteDetailSnippet", () => {
  it("generates property access for default variable name", () => {
    const snippet = noteDetailSnippet();
    assert.ok(snippet.includes("note.id()"));
    assert.ok(snippet.includes("note.name()"));
    assert.ok(snippet.includes("note.body()"));
    assert.ok(snippet.includes("note.plaintext()"));
    assert.ok(snippet.includes("note.container().name()"));
    assert.ok(snippet.includes("note.container().container().name()"));
    assert.ok(snippet.includes("note.attachments().length"));
  });

  it("uses custom variable name", () => {
    const snippet = noteDetailSnippet("n");
    assert.ok(snippet.includes("n.id()"));
    assert.ok(snippet.includes("n.name()"));
  });
});

describe("textToHtml", () => {
  it("wraps single line in div", () => {
    assert.equal(textToHtml("hello"), "<div>hello</div>");
  });

  it("wraps multiple lines in separate divs", () => {
    assert.equal(
      textToHtml("line1\nline2"),
      "<div>line1</div><div>line2</div>",
    );
  });

  it("uses <br> for empty lines", () => {
    assert.equal(
      textToHtml("before\n\nafter"),
      "<div>before</div><div><br></div><div>after</div>",
    );
  });

  it("escapes HTML entities", () => {
    assert.equal(
      textToHtml('<script>alert("xss")</script>'),
      '<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>',
    );
  });

  it("escapes ampersands", () => {
    assert.equal(textToHtml("A & B"), "<div>A &amp; B</div>");
  });
});
