import { Command } from "commander";
import { runJxa, resolveNoteSnippet, noteDetailSnippet } from "../jxa.js";
import { formatOutput } from "../format.js";
import type { NoteDetail, OutputFormat } from "../types.js";

export function createShowCommand(): Command {
  return new Command("show")
    .description("Show a note's full content (by name or x-coredata:// ID)")
    .argument("<identifier>", "Note name or x-coredata:// ID")
    .action(async (identifier, _opts, cmd) => {
      const format: OutputFormat = cmd.parent?.opts().format ?? "json";

      const script = `
var app = Application("Notes");
${resolveNoteSnippet(identifier)}
JSON.stringify(${noteDetailSnippet()});
`;

      const note = await runJxa<NoteDetail>(script);
      console.log(formatOutput(note, format));
    });
}
