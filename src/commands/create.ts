import { Command } from "commander";
import { runJxa, jxaString, noteDetailSnippet, textToHtml } from "../jxa.js";
import { formatOutput } from "../format.js";
import type { NoteDetail, OutputFormat } from "../types.js";

export function createCreateCommand(): Command {
  return new Command("create")
    .description("Create a new note")
    .argument("<title>", "Note title")
    .option("--body <html>", "Note body as HTML")
    .option("--body-text <text>", "Note body as plain text (converted to HTML)")
    .option("--folder <name>", "Target folder (default: Notes)")
    .option("--account <name>", "Target account (default: iCloud)")
    .action(async (title, opts, cmd) => {
      const format: OutputFormat = cmd.parent?.opts().format ?? "json";
      const account = opts.account ?? "iCloud";
      const folder = opts.folder ?? "Notes";

      let bodyHtml: string;
      if (opts.body) {
        bodyHtml = opts.body;
      } else if (opts.bodyText) {
        bodyHtml = textToHtml(opts.bodyText);
      } else {
        bodyHtml = "";
      }

      const script = `
var app = Application("Notes");
var target = app.accounts.byName(${jxaString(account)}).folders.byName(${jxaString(folder)});
var note = app.make({
  new: "note",
  withProperties: {
    name: ${jxaString(title)},
    body: ${jxaString(bodyHtml)}
  },
  at: target
});
JSON.stringify(${noteDetailSnippet("note")});
`;

      const note = await runJxa<NoteDetail>(script);
      console.log(formatOutput(note, format));
    });
}
