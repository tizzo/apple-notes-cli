import { Command } from "commander";
import { runJxa, jxaString, resolveNoteSnippet, noteDetailSnippet, textToHtml } from "../jxa.js";
import { formatOutput } from "../format.js";
import type { NoteDetail, OutputFormat } from "../types.js";

export function createUpdateCommand(): Command {
  return new Command("update")
    .description("Update an existing note (rename, replace body, or append)")
    .argument("<identifier>", "Note name or x-coredata:// ID")
    .option("--title <new-title>", "Set a new title")
    .option("--body <html>", "Replace body with HTML")
    .option("--append <html>", "Append HTML to the end of the body")
    .option("--append-text <text>", "Append plain text to the end of the body")
    .action(async (identifier, opts, cmd) => {
      const format: OutputFormat = cmd.parent?.opts().format ?? "json";

      if (!opts.title && !opts.body && !opts.append && !opts.appendText) {
        console.error("Error: at least one of --title, --body, --append, or --append-text is required");
        process.exit(1);
      }

      const mutations: string[] = [];
      if (opts.title) {
        mutations.push(`note.name = ${jxaString(opts.title)};`);
      }
      if (opts.body) {
        mutations.push(`note.body = ${jxaString(opts.body)};`);
      }
      if (opts.append) {
        mutations.push(`note.body = note.body() + ${jxaString(opts.append)};`);
      }
      if (opts.appendText) {
        mutations.push(`note.body = note.body() + ${jxaString(textToHtml(opts.appendText))};`);
      }

      const script = `
var app = Application("Notes");
${resolveNoteSnippet(identifier)}
${mutations.join("\n")}
JSON.stringify(${noteDetailSnippet()});
`;

      const note = await runJxa<NoteDetail>(script);
      console.log(formatOutput(note, format));
    });
}
