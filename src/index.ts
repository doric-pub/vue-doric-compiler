#!/usr/bin/env node

import { Command } from "commander";
import path from "path";
import { compile } from "./compiler";

const program = new Command();
(process.env.FORCE_COLOR as any) = true;
program
  .name("vue2doric")
  .description("Compiler to compile vue to doric")
  .version("0.1.0");
program
  .argument("<vue-path>", "where vue file located")
  .action((vue, options) => {
    compile(path.resolve(vue));
  });
program.parse(process.argv);
