import { Command } from "commander";
import { runJxa, resolveNoteSnippet } from "../jxa.js";
import { formatOutput } from "../format.js";
import type { DeleteResult, OutputFormat } from "../types.js";

export function createDeleteCommand(): Command {
  return new Command("delete")
    .description("Delete a note (moves to Recently Deleted)")
    .argument("<identifier>", "Note name or x-coredata:// ID")
    .action(async (identifier, _opts, cmd) => {
      const format: OutputFormat = cmd.parent?.opts().format ?? "json";

      const script = `
var app = Application("Notes");
${resolveNoteSnippet(identifier)}
var result = {deleted: true, id: note.id(), name: note.name()};
app.delete(note);
JSON.stringify(result);
`;

      const result = await runJxa<DeleteResult>(script);
      console.log(formatOutput(result, format));
    });
}
