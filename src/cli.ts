import { Command } from "commander";
import { createAccountsCommand } from "./commands/accounts.js";
import { createCreateCommand } from "./commands/create.js";
import { createDeleteCommand } from "./commands/delete.js";
import { createFoldersCommand } from "./commands/folders.js";
import { createListCommand } from "./commands/list.js";
import { createMoveCommand } from "./commands/move.js";
import { createSearchCommand } from "./commands/search.js";
import { createShowCommand } from "./commands/show.js";
import { createUpdateCommand } from "./commands/update.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("notes")
    .description("CLI for managing Apple Notes via JXA (JavaScript for Automation)")
    .version("0.1.0")
    .option("--format <format>", "Output format: json (default) or pretty", "json");

  program.addCommand(createListCommand());
  program.addCommand(createShowCommand());
  program.addCommand(createSearchCommand());
  program.addCommand(createCreateCommand());
  program.addCommand(createUpdateCommand());
  program.addCommand(createDeleteCommand());
  program.addCommand(createMoveCommand());
  program.addCommand(createFoldersCommand());
  program.addCommand(createAccountsCommand());

  program
    .command("help-all")
    .description("Show help for all commands at once (useful for AI agents)")
    .action(() => {
      console.log(program.helpInformation());
      console.log("\n" + "=".repeat(60) + "\n");

      for (const cmd of program.commands) {
        if (cmd.name() === "help-all" || cmd.name() === "help") continue;
        console.log(`## notes ${cmd.name()}\n`);
        console.log(cmd.helpInformation());

        // Print subcommands if any
        for (const sub of cmd.commands) {
          if (sub.name() === "help") continue;
          console.log(`### notes ${cmd.name()} ${sub.name()}\n`);
          console.log(sub.helpInformation());
        }

        console.log("=".repeat(60) + "\n");
      }
    });

  return program;
}
