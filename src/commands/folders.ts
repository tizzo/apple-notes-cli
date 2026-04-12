import { Command } from "commander";
import { runJxa, jxaString } from "../jxa.js";
import { formatOutput } from "../format.js";
import type { FolderInfo, OutputFormat } from "../types.js";

export function createFoldersCommand(): Command {
  const cmd = new Command("folders").description("Manage Notes folders");

  cmd
    .command("list", { isDefault: true })
    .description("List all folders")
    .option("--account <name>", "Filter by account name")
    .action(async (opts, listCmd) => {
      const format: OutputFormat = listCmd.parent?.parent?.opts().format ?? "json";

      const accountFilter = opts.account ? jxaString(opts.account) : null;
      const script = accountFilter
        ? `
var app = Application("Notes");
var folders = app.accounts.byName(${accountFilter}).folders();
var result = [];
for (var i = 0; i < folders.length; i++) {
  var f = folders[i];
  result.push({
    id: f.id(),
    name: f.name(),
    account: f.container().name(),
    noteCount: f.notes().length
  });
}
JSON.stringify(result);
`
        : `
var app = Application("Notes");
var accts = app.accounts();
var result = [];
for (var a = 0; a < accts.length; a++) {
  var folders = accts[a].folders();
  for (var i = 0; i < folders.length; i++) {
    var f = folders[i];
    result.push({
      id: f.id(),
      name: f.name(),
      account: accts[a].name(),
      noteCount: f.notes().length
    });
  }
}
JSON.stringify(result);
`;

      const folders = await runJxa<FolderInfo[]>(script);
      console.log(formatOutput(folders, format));
    });

  cmd
    .command("create <name>")
    .description("Create a new folder")
    .option("--parent <folder>", "Parent folder name (for nesting)")
    .option("--account <name>", "Account to create in (default: iCloud)")
    .action(async (name, opts, createCmd) => {
      const format: OutputFormat = createCmd.parent?.parent?.opts().format ?? "json";
      const account = opts.account ?? "iCloud";

      const script = opts.parent
        ? `
var app = Application("Notes");
var parent = app.accounts.byName(${jxaString(account)}).folders.byName(${jxaString(opts.parent)});
var f = app.make({new: "folder", withProperties: {name: ${jxaString(name)}}, at: parent});
JSON.stringify({
  id: f.id(), name: f.name(), account: ${jxaString(account)}, noteCount: 0
});
`
        : `
var app = Application("Notes");
var acct = app.accounts.byName(${jxaString(account)});
var f = app.make({new: "folder", withProperties: {name: ${jxaString(name)}}, at: acct});
JSON.stringify({
  id: f.id(), name: f.name(), account: ${jxaString(account)}, noteCount: 0
});
`;

      const folder = await runJxa<FolderInfo>(script);
      console.log(formatOutput(folder, format));
    });

  return cmd;
}
