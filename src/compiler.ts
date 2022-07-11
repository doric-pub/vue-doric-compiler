import fs from "fs";
import path from "path";
import {
  parse,
  compileScript,
  compileTemplate,
  compileStyle,
} from "vue/compiler-sfc";

type AST = {
  type: number;
  tag: string;
  attrsList: string[];
  attrsMap: { class?: string };
  rawAttrsMap: object;
  parent?: AST;
  children?: AST[];
  static?: boolean;
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
  const templateBlock = compileTemplate({
    source: descriptor.template?.content ?? "",
    filename: path.basename(vueFile),
    prettify: true,
    bindings: scriptBlock ? scriptBlock.bindings : undefined,
  });
  descriptor.styles.forEach((style, index) => {
    const styleBlock = compileStyle({
      source: style.content,
      filename: `CSS_${index}`,
      id: `ID_STYLE_${index}`,
    });
    //console.log(styleBlock);
  });
  const ast = templateBlock.ast;
  if (!!ast) {
    printAST(ast as AST);
  }
  const code = `

  ${templateBlock.code}
  `;

  await fs.promises.writeFile(path.resolve("out.js"), code, "utf-8");
  console.log("Code", code);
  eval(code);
}

function printAST(ast: AST) {
  console.log(`${ast.type}:${ast.tag} ${ast.static ? "STATIC" : ""}`);
  if (ast.children) {
    for (let child of ast.children) {
      printAST(child);
    }
  }
}
