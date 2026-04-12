import { createProgram } from "./cli.js";
import { JxaError } from "./jxa.js";

const program = createProgram();

try {
  await program.parseAsync(process.argv);
} catch (err) {
  if (err instanceof JxaError) {
    const output = JSON.stringify({ error: true, code: err.code, message: err.message }, null, 2);
    console.error(output);
    process.exit(1);
  }
  throw err;
}
