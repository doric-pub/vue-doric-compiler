import fs from "fs";
import path from "path";
import DoricVueHelper from "./doric-vue-helper";
import {
  parse,
  compileScript,
  compileTemplate,
  compileStyle,
} from "./vue/compiler-sfc/src";
import postcss, { Declaration, Root, Rule } from "postcss";

type AST = {
  type: number;
  tag: string;
  attrsList: string[];
  attrsMap: { class?: string };
  rawAttrsMap: object;
  parent?: AST;
  children?: AST[];
  static?: boolean;
  level: number;
};
export async function compile(vueFile: string) {
  const source = await fs.promises.readFile(vueFile, "utf-8");
  const descriptor = parse({
    source,
    filename: path.basename(vueFile),
  });
  const scriptBlock = compileScript(descriptor, {
    id: "ID_SCRIPT",
    isProd: false,
  });
  DoricVueHelper.getInstance().setScriptBlock(scriptBlock);

  const parsedRoots: Root[] = [];
  descriptor.styles.forEach((style, index) => {
    const styleBlock = compileStyle({
      source: style.content,
      filename: `CSS_${index}`,
      id: `ID_STYLE_${index}`,
    });
    const root = postcss.parse(style.content);
    for (let index = 0; index < root.nodes.length; index++) {
      const selector = (root.nodes[index] as Rule).selector;
      const declarations = (root.nodes[index] as Rule).nodes as Declaration[];
    }
    parsedRoots.push(root);
  });
  DoricVueHelper.getInstance().setParsedRoots(parsedRoots);

  const templateBlock = compileTemplate({
    source: descriptor.template?.content ?? "",
    filename: path.basename(vueFile),
    prettify: true,
    bindings: scriptBlock ? scriptBlock.bindings : undefined,
    compilerOptions: {
      modules: [
        {
          transformCode: (el, code) => {
            // console.log(el, code);
            return code;
          },
        },
      ],
    },
  });
  const ast = templateBlock.ast;
  if (!!ast) {
    //(ast as AST).level = 0;
    //printAST(ast as AST);
  }
  await fs.promises.writeFile(
    path.resolve("out.js"),
    templateBlock.code,
    "utf-8"
  );

  // const glueCodePath = path.resolve(__dirname, "glue.js");
  // const glueCode = await fs.promises.readFile(glueCodePath, "utf-8");
  // const code = `${templateBlock.code}
  // ${glueCode}
  // `;

  // await fs.promises.writeFile(path.resolve("out.js"), code, "utf-8");
  // eval(code);
}
function printAST(ast: AST) {
  const copy = { ...ast };
  copy.parent = undefined;
  copy.children = undefined;
  console.log(copy.level, copy);
  if (ast.children) {
    for (let child of ast.children) {
      child.level = ast.level + 1;
      printAST(child);
    }
  }
}
