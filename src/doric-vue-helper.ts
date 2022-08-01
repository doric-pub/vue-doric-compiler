import { Declaration, Root, Rule } from "postcss";
import { SFCScriptBlock } from "sfc/parseComponent";
import { ASTElement } from "types/compiler";
import ts from "typescript";
import DoricCodeGen from "./doric-codegen";
const prettier = require("prettier");
import fs from "fs";
import path from "path";

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(escapeRegExp(find), "g"), replace);
}

export default class DoricVueHelper {
  private static instance: DoricVueHelper;

  /**
   * The Singleton's constructor should always be private to prevent direct
   * construction calls with the `new` operator.
   */
  private constructor() {}

  /**
   * The static method that controls the access to the singleton instance.
   *
   * This implementation let you subclass the Singleton class while keeping
   * just one instance of each subclass around.
   */
  public static getInstance(): DoricVueHelper {
    if (!DoricVueHelper.instance) {
      DoricVueHelper.instance = new DoricVueHelper();
    }

    return DoricVueHelper.instance;
  }

  static TAG_MAPPING = {
    div: "Vdiv",
    h1: "Vh1",
    h2: "Vh2",
    ul: "Vul",
    li: "Vli",
    a: "Va",
    br: "Vbr",
    img: "Vimg",
    view: "Vview",
    text: "Vtext",
    p: "Vp",
  };

  scriptBlock: SFCScriptBlock;
  componentName: string;
  setScriptBlock(scriptBlock: SFCScriptBlock) {
    this.scriptBlock = scriptBlock;
    this.componentName = this.scriptBlock.map.sources[0].replace(
      /\.[^/.]+$/,
      ""
    );
  }

  parsedRoots: Root[];
  setParsedRoots(parsedRoots: Root[]) {
    this.parsedRoots = parsedRoots;
    const stylesMap: Record<string, any> = {};
    this.parsedRoots.forEach((root) => {
      for (let index = 0; index < root.nodes.length; index++) {
        const selector = (root.nodes[index] as Rule).selector;
        const declarations = (root.nodes[index] as Rule).nodes as Declaration[];

        const subSelectors = selector.split(",");
        subSelectors.forEach((subSelector) => {
          const trimedSubSelector = subSelector.trim();

          let declarationMap = {};
          declarations.forEach((declaration) => {
            declarationMap[declaration.prop] = declaration.value;
          });
          stylesMap[trimedSubSelector] = declarationMap;
        });
      }
    });

    console.log(stylesMap);

    let self = this;
    async function writeStyles() {
      await fs.promises.writeFile(
        path.resolve(`./generated/${self.componentName}Style.ts`),
        prettier.format(
          "export default " + JSON.stringify(stylesMap, undefined, 2)
        ),
        "utf-8"
      );
    }
    writeStyles();
  }

  transformVueElement(el: ASTElement) {
    if (el.parent === undefined) {
      console.log(el);

      let jsxRoot = this.createJsxElementRecursive(el);

      const doricImportResult = DoricCodeGen.getInstance().printer.printNode(
        ts.EmitHint.Unspecified,
        DoricCodeGen.getInstance().createDoricImport(),
        DoricCodeGen.getInstance().sourceFile
      );
      console.log(doricImportResult);
      const doricVueRuntimeImportResult =
        DoricCodeGen.getInstance().printer.printNode(
          ts.EmitHint.Unspecified,
          DoricCodeGen.getInstance().createDoricVueRuntimeImport(),
          DoricCodeGen.getInstance().sourceFile
        );
      console.log(doricVueRuntimeImportResult);

      const dataBindings = [];
      const optionsBindings = [];
      Object.keys(this.scriptBlock.bindings).forEach((key) => {
        if (this.scriptBlock.bindings[key] === "data") {
          dataBindings.push(key);
        } else if (this.scriptBlock.bindings[key] === "options") {
          optionsBindings.push(key);
        }
      });

      const dataBindingElements = dataBindings.map((key) => {
        return ts.factory.createBindingElement(
          undefined,
          undefined,
          key,
          undefined
        );
      });
      const optionsBindingElements = optionsBindings.map((key) => {
        return ts.factory.createBindingElement(
          undefined,
          undefined,
          key,
          undefined
        );
      });

      const dataPropertySignature = ts.factory.createPropertySignature(
        undefined,
        "data",
        undefined,
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
      );
      const methodsPropertySignature = ts.factory.createPropertySignature(
        undefined,
        "methods",
        undefined,
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
      );
      const stylePropertySignature = ts.factory.createPropertySignature(
        undefined,
        "style",
        undefined,
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
      );

      const parameterDeclarations = [
        ts.factory.createParameterDeclaration(
          undefined,
          undefined,
          undefined,
          "prop",
          undefined,
          ts.factory.createTypeLiteralNode([
            dataPropertySignature,
            methodsPropertySignature,
            stylePropertySignature,
          ])
        ),
      ];

      const dataVariableStatement = ts.factory.createVariableStatement(
        undefined,
        [
          ts.factory.createVariableDeclaration(
            ts.factory.createObjectBindingPattern(dataBindingElements),
            undefined,
            undefined,
            ts.factory.createIdentifier("prop.data")
          ),
        ]
      );
      const optionsVariableStatement = ts.factory.createVariableStatement(
        undefined,
        [
          ts.factory.createVariableDeclaration(
            ts.factory.createObjectBindingPattern(optionsBindingElements),
            undefined,
            undefined,
            ts.factory.createIdentifier("prop.methods")
          ),
        ]
      );
      const styleVariableStatement = ts.factory.createVariableStatement(
        undefined,
        [
          ts.factory.createVariableDeclaration(
            "style",
            undefined,
            undefined,
            ts.factory.createIdentifier("prop.style")
          ),
        ]
      );

      const statements = [
        dataVariableStatement,
        optionsVariableStatement,
        styleVariableStatement,
        ts.factory.createReturnStatement(jsxRoot as any),
      ];
      const block = ts.factory.createBlock(statements, true);
      const functionDeclaration = DoricCodeGen.getInstance().createFunction(
        // use file name as function name
        this.componentName,
        parameterDeclarations,
        block
      );

      const functionResult = DoricCodeGen.getInstance().printer.printNode(
        ts.EmitHint.Unspecified,
        functionDeclaration,
        DoricCodeGen.getInstance().sourceFile
      );
      console.log(functionResult);

      const genStyleFunctionCode = `
        function genStyle(
          style: Record<string, any>,
          classSelector: Record<string, boolean>
        ) {
          let result: Record<string, string> = {};
          Object.keys(classSelector).forEach((selector) => {
            if (
              Object.keys(style).includes("." + selector) &&
              classSelector[selector]
            ) {
              Object.keys(style["." + selector]).forEach((key) => {
                result[key] = style["." + selector][key];
              });
            }
          });
          return result;
        }
      `;

      const optimizedCode = prettier.format(
        doricImportResult +
          doricVueRuntimeImportResult +
          genStyleFunctionCode +
          functionResult
      );
      console.log(optimizedCode);

      async function mkdir() {
        await fs.promises.mkdir(path.resolve("./generated/"));
      }
      if (!fs.existsSync(path.resolve("./generated/"))) {
        mkdir();
      }

      let self = this;
      async function writeFunction() {
        await fs.promises.writeFile(
          path.resolve(`./generated/${self.componentName}.tsx`),
          optimizedCode,
          "utf-8"
        );
      }
      writeFunction();

      console.log(this.scriptBlock.content);

      async function writeScript() {
        await fs.promises.writeFile(
          path.resolve(`./generated/${self.componentName}Prop.ts`),
          self.scriptBlock.content,
          "utf-8"
        );
      }
      writeScript();
    }
  }

  createJsxElementRecursive(el: ASTElement): ts.JsxChild {
    const children = el.children.map((child) => {
      if (child.type === 1) {
        // ASTElement
        return this.createJsxElementRecursive(child);
      } else if (child.type === 3) {
        // ASTText
        const tag = "Vasttext";
        if (!DoricCodeGen.getInstance().doricVueRuntimeImports.includes(tag)) {
          DoricCodeGen.getInstance().doricVueRuntimeImports.push(tag);
        }

        return ts.factory.createJsxElement(
          ts.factory.createJsxOpeningElement(
            ts.factory.createIdentifier(tag),
            undefined,
            ts.factory.createJsxAttributes([
              ts.factory.createJsxAttribute(
                ts.factory.createIdentifier("text"),
                ts.factory.createJsxExpression(
                  undefined,
                  ts.factory.createExpressionWithTypeArguments(
                    ts.factory.createStringLiteral(child.text),
                    undefined
                  )
                )
              ),
            ])
          ),
          [],
          ts.factory.createJsxClosingElement(ts.factory.createIdentifier(tag))
        );
      } else if (child.type === 2) {
        // ASTExpression
        const tag = "Vastexpression";
        if (!DoricCodeGen.getInstance().doricVueRuntimeImports.includes(tag)) {
          DoricCodeGen.getInstance().doricVueRuntimeImports.push(tag);
        }

        let identifier = "";
        child.tokens.forEach((token) => {
          if (token["@binding"]) {
            identifier += token["@binding"];
          } else {
            identifier += ' + "' + token + '" + ';
          }
        });

        return ts.factory.createJsxElement(
          ts.factory.createJsxOpeningElement(
            ts.factory.createIdentifier(tag),
            undefined,
            ts.factory.createJsxAttributes([
              ts.factory.createJsxAttribute(
                ts.factory.createIdentifier("text"),
                ts.factory.createJsxExpression(
                  undefined,
                  ts.factory.createExpressionWithTypeArguments(
                    ts.factory.createIdentifier(identifier),
                    undefined
                  )
                )
              ),
            ])
          ),
          [],
          ts.factory.createJsxClosingElement(ts.factory.createIdentifier(tag))
        );
      }
    });

    if (DoricVueHelper.TAG_MAPPING[el.tag]) {
      const key = DoricVueHelper.TAG_MAPPING[el.tag];
      if (!DoricCodeGen.getInstance().doricVueRuntimeImports.includes(key)) {
        DoricCodeGen.getInstance().doricVueRuntimeImports.push(key);
      }

      let jsxAttributes = el.attrsList.map((attr) => {
        let name = attr.name;

        let value: ts.Expression = ts.factory.createStringLiteral(attr.value);
        if (name == "@tap") {
          name = "tap";
          value = ts.factory.createIdentifier(
            `
              () => {
                Reflect.apply(${attr.value}, prop.data, [])
              }
            `
          );
        }

        return ts.factory.createJsxAttribute(
          ts.factory.createIdentifier(name),
          ts.factory.createJsxExpression(
            undefined,
            ts.factory.createExpressionWithTypeArguments(value, undefined)
          )
        );
      });

      // declared style

      this.parsedRoots.forEach((root) => {
        for (let index = 0; index < root.nodes.length; index++) {
          const selector = (root.nodes[index] as Rule).selector;
          const declarations = (root.nodes[index] as Rule)
            .nodes as Declaration[];

          const subSelectors = selector.split(",");
          subSelectors.forEach((subSelector) => {
            const trimedSubSelector = subSelector.trim();

            const injectDeclareStyleFunction = () => {
              const propertyAssigment = declarations.map((declaration) => {
                return ts.factory.createPropertyAssignment(
                  "'" + declaration.prop + "'",
                  ts.factory.createStringLiteral(declaration.value)
                );
              });

              jsxAttributes = jsxAttributes.concat(
                ts.factory.createJsxAttribute(
                  ts.factory.createIdentifier("declaredStyle"),
                  ts.factory.createJsxExpression(
                    undefined,
                    ts.factory.createObjectLiteralExpression(propertyAssigment)
                  )
                )
              );
            };

            if (subSelector.trim().startsWith("#")) {
              // id
              let id = undefined;
              el.attrsList.forEach((attr) => {
                if (attr.name === "id") {
                  id = attr.value;
                }
              });

              if (id) {
                if ("#" + replaceAll(id, '"', "") == trimedSubSelector) {
                  injectDeclareStyleFunction();
                }
              }
            } else if (subSelector.trim().startsWith(".")) {
              // class
              if (el.staticClass) {
                if (
                  "." + replaceAll(el.staticClass, '"', "") ==
                  trimedSubSelector
                ) {
                  injectDeclareStyleFunction();
                }
              }
            } else {
              // tag
              if (el.tag == trimedSubSelector) {
                injectDeclareStyleFunction();
              }
            }
          });
        }
      });

      // static style
      if (el.staticStyle) {
        const styleObject = JSON.parse(el.staticStyle);

        const propertyAssigment = Object.keys(styleObject).map((styleKey) => {
          return ts.factory.createPropertyAssignment(
            "'" + styleKey + "'",
            ts.factory.createStringLiteral(styleObject[styleKey])
          );
        });

        jsxAttributes = jsxAttributes.concat(
          ts.factory.createJsxAttribute(
            ts.factory.createIdentifier("staticStyle"),
            ts.factory.createJsxExpression(
              undefined,
              ts.factory.createObjectLiteralExpression(propertyAssigment)
            )
          )
        );
      }

      if (el.classBinding) {
        jsxAttributes = jsxAttributes.concat(
          ts.factory.createJsxAttribute(
            ts.factory.createIdentifier("declaredStyle"),
            ts.factory.createJsxExpression(
              undefined,
              ts.factory.createIdentifier(`genStyle(style, ${el.classBinding})`)
            )
          )
        );
      }

      const jsxElement = ts.factory.createJsxElement(
        ts.factory.createJsxOpeningElement(
          ts.factory.createIdentifier(DoricVueHelper.TAG_MAPPING[el.tag]),
          undefined,
          ts.factory.createJsxAttributes(jsxAttributes)
        ),
        children,
        ts.factory.createJsxClosingElement(
          ts.factory.createIdentifier(DoricVueHelper.TAG_MAPPING[el.tag])
        )
      );
      if (el.if) {
        return ts.factory.createJsxExpression(
          undefined,
          ts.factory.createConditionalExpression(
            ts.factory.createIdentifier(el.if),
            undefined,
            jsxElement,
            undefined,
            ts.factory.createIdentifier("null")
          )
        );
      } else if (el.for) {
        return ts.factory.createJsxExpression(
          undefined,
          ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              ts.factory.createIdentifier(el.for),
              "map"
            ),
            undefined,
            [
              ts.factory.createArrowFunction(
                undefined,
                undefined,
                [
                  ts.factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    undefined,
                    el.alias,
                    undefined,
                    ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
                  ),
                  ts.factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    undefined,
                    el.iterator1,
                    undefined,
                    ts.factory.createKeywordTypeNode(
                      ts.SyntaxKind.NumberKeyword
                    )
                  ),
                ],
                undefined,
                undefined,
                jsxElement
              ),
            ]
          )
        );
      } else {
        return jsxElement;
      }
    } else {
      return ts.factory.createJsxElement(
        ts.factory.createJsxOpeningElement(
          ts.factory.createIdentifier("no-mapped-tags"),
          undefined,
          ts.factory.createJsxAttributes([])
        ),
        children,
        ts.factory.createJsxClosingElement(
          ts.factory.createIdentifier("no-mapped-tags")
        )
      );
    }
  }
}
