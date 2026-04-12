import { Command } from "commander";
import { runJxa } from "../jxa.js";
import { formatOutput } from "../format.js";
import type { AccountInfo, OutputFormat } from "../types.js";

export function createAccountsCommand(): Command {
  return new Command("accounts")
    .description("List all Notes accounts (iCloud, Google, etc.)")
    .action(async (_opts, cmd) => {
      const format: OutputFormat = cmd.parent?.opts().format ?? "json";

      const accounts = await runJxa<AccountInfo[]>(`
var app = Application("Notes");
var accts = app.accounts();
var result = [];
for (var i = 0; i < accts.length; i++) {
  var a = accts[i];
  result.push({
    id: a.id(),
    name: a.name(),
    folderCount: a.folders().length,
    noteCount: a.notes().length
  });
}
JSON.stringify(result);
`);

      console.log(formatOutput(accounts, format));
    });
}
