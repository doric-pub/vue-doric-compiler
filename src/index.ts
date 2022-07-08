import { Command } from "commander";
const program = new Command();
(process.env.FORCE_COLOR as any) = true;

program.parse(process.argv);
