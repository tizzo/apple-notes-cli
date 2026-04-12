import { Command } from "commander";
import { runJxa, jxaString } from "../jxa.js";
import { formatOutput } from "../format.js";
import type { NoteSummary, OutputFormat } from "../types.js";

export function createListCommand(): Command {
  return new Command("list")
    .description("List notes with metadata (name, folder, dates, flags)")
    .option("--folder <name>", "Filter by folder name")
    .option("--account <name>", "Filter by account name")
    .option("--limit <n>", "Maximum number of notes to return", parseInt)
    .action(async (opts, cmd) => {
      const format: OutputFormat = cmd.parent?.opts().format ?? "json";

      let noteSource: string;
      if (opts.folder && opts.account) {
        noteSource = `app.accounts.byName(${jxaString(opts.account)}).folders.byName(${jxaString(opts.folder)}).notes`;
      } else if (opts.folder) {
        noteSource = `(function() {
  var accts = app.accounts();
  for (var a = 0; a < accts.length; a++) {
    try { var f = accts[a].folders.byName(${jxaString(opts.folder)}); f.id(); return f.notes; } catch(e) {}
  }
  throw new Error("Folder not found: " + ${jxaString(opts.folder)});
})()`;
      } else if (opts.account) {
        noteSource = `app.accounts.byName(${jxaString(opts.account)}).notes`;
      } else {
        noteSource = "app.notes";
      }

      const limitExpr = opts.limit
        ? `Math.min(ids.length, ${opts.limit})`
        : "ids.length";

      const script = `
var app = Application("Notes");
var src = ${noteSource};
var ids = src.id();
var names = src.name();
var created = src.creationDate();
var modified = src.modificationDate();
var pw = src.passwordProtected();
var shared = src.shared();
var containers = src.container();
var result = [];
for (var i = 0; i < ${limitExpr}; i++) {
  result.push({
    id: ids[i],
    name: names[i],
    creationDate: created[i].toISOString(),
    modificationDate: modified[i].toISOString(),
    passwordProtected: pw[i],
    shared: shared[i],
    folder: containers[i].name(),
    account: containers[i].container().name()
  });
}
JSON.stringify(result);
`;

      const notes = await runJxa<NoteSummary[]>(script);
      console.log(formatOutput(notes, format));
    });
}
