import { Command } from "commander";
import { runJxa, jxaString } from "../jxa.js";
import { formatOutput } from "../format.js";
import type { NoteSummary, OutputFormat } from "../types.js";

export function createSearchCommand(): Command {
  return new Command("search")
    .description("Search notes by title or content (uses fast plaintext search)")
    .argument("<query>", "Search query string")
    .option("--title-only", "Only search note titles (faster)")
    .option("--folder <name>", "Filter results by folder name")
    .option("--limit <n>", "Maximum number of results", parseInt)
    .action(async (query, opts, cmd) => {
      const format: OutputFormat = cmd.parent?.opts().format ?? "json";

      let script: string;

      if (opts.titleOnly) {
        // Fetch all names vectorized and filter client-side (~0.2s)
        script = `
var app = Application("Notes");
var ids = app.notes.id();
var names = app.notes.name();
var created = app.notes.creationDate();
var modified = app.notes.modificationDate();
var pw = app.notes.passwordProtected();
var shared = app.notes.shared();
var containers = app.notes.container();
var query = ${jxaString(query.toLowerCase())};
var folderFilter = ${opts.folder ? jxaString(opts.folder) : "null"};
var limit = ${opts.limit ?? 0};
var result = [];
for (var i = 0; i < ids.length; i++) {
  if (names[i].toLowerCase().indexOf(query) === -1) continue;
  var folderName = containers[i].name();
  if (folderFilter && folderName !== folderFilter) continue;
  result.push({
    id: ids[i],
    name: names[i],
    creationDate: created[i].toISOString(),
    modificationDate: modified[i].toISOString(),
    passwordProtected: pw[i],
    shared: shared[i],
    folder: folderName,
    account: containers[i].container().name()
  });
  if (limit > 0 && result.length >= limit) break;
}
JSON.stringify(result);
`;
      } else {
        // Content search via plaintext contains (~0.4s for 254 notes)
        script = `
var app = Application("Notes");
var matches = app.notes.whose({plaintext: {_contains: ${jxaString(query)}}})();
var folderFilter = ${opts.folder ? jxaString(opts.folder) : "null"};
var limit = ${opts.limit ?? 0};
var result = [];
for (var i = 0; i < matches.length; i++) {
  var n = matches[i];
  var folderName = n.container().name();
  if (folderFilter && folderName !== folderFilter) continue;
  result.push({
    id: n.id(),
    name: n.name(),
    creationDate: n.creationDate().toISOString(),
    modificationDate: n.modificationDate().toISOString(),
    passwordProtected: n.passwordProtected(),
    shared: n.shared(),
    folder: folderName,
    account: n.container().container().name()
  });
  if (limit > 0 && result.length >= limit) break;
}
JSON.stringify(result);
`;
      }

      const notes = await runJxa<NoteSummary[]>(script);
      console.log(formatOutput(notes, format));
    });
}
