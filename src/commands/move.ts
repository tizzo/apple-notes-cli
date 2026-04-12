import { Command } from "commander";
import { runJxa, jxaString, resolveNoteSnippet } from "../jxa.js";
import { formatOutput } from "../format.js";
import type { MoveResult, OutputFormat } from "../types.js";

export function createMoveCommand(): Command {
  return new Command("move")
    .description("Move a note to a different folder")
    .argument("<identifier>", "Note name or x-coredata:// ID")
    .requiredOption("--to <folder>", "Destination folder name")
    .option("--account <name>", "Account containing the destination folder")
    .action(async (identifier, opts, cmd) => {
      const format: OutputFormat = cmd.parent?.opts().format ?? "json";

      const folderLookup = opts.account
        ? `app.accounts.byName(${jxaString(opts.account)}).folders.byName(${jxaString(opts.to)})`
        : `(function() {
  var accts = app.accounts();
  for (var a = 0; a < accts.length; a++) {
    try { var f = accts[a].folders.byName(${jxaString(opts.to)}); f.id(); return f; } catch(e) {}
  }
  throw new Error("Folder not found: " + ${jxaString(opts.to)});
})()`;

      const script = `
var app = Application("Notes");
${resolveNoteSnippet(identifier)}
var targetFolder = ${folderLookup};
app.move(note, {to: targetFolder});
JSON.stringify({
  moved: true,
  id: note.id(),
  name: note.name(),
  folder: note.container().name()
});
`;

      const result = await runJxa<MoveResult>(script);
      console.log(formatOutput(result, format));
    });
}
