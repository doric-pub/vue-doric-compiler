import fs from "fs";
import path from "path";
import DoricVueHelper from "./doric-vue-helper";
import {
  parse,
  compileScript,
  compileTemplate,
  compileStyle,
} from "./vue/compiler-sfc/src";

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
  DoricVueHelper.getInstance().setBindings(scriptBlock);
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
