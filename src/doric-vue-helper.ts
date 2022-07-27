import { Declaration, Root, Rule } from "postcss";
import { SFCScriptBlock } from "sfc/parseComponent";
import { ASTElement } from "types/compiler";
import ts, { JsxExpression } from "typescript";
import DoricCodeGen from "./doric-codegen";
const prettier = require("prettier");

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
    div: "vdiv",
    h1: "vh1",
    h2: "vh2",
    ul: "vul",
    li: "vli",
    a: "va",
    br: "vbr",
    img: "vimg",
    view: "vview",
    text: "vtext",
  };

  static ATTRIBUTE_MAPPING = {};

  static CSS_STYLE_MAPPING = {
    "background-color": "backgroundColor",
  };

  scriptBlock: SFCScriptBlock;
  setScriptBlock(scriptBlock: SFCScriptBlock) {
    this.scriptBlock = scriptBlock;
  }

  parsedRoots: Root[];
  setParsedRoots(parsedRoots: Root[]) {
    this.parsedRoots = parsedRoots;
  }

  transformVueElement(el: ASTElement) {
    if (el.parent === undefined) {
      console.log(el);

      let jsxRoot = this.createJsxElementRecursive(el);

      const importResult = DoricCodeGen.getInstance().printer.printNode(
        ts.EmitHint.Unspecified,
        DoricCodeGen.getInstance().createImport(),
        DoricCodeGen.getInstance().sourceFile
      );
      console.log(importResult);

      const parameterDeclarations = Object.keys(this.scriptBlock.bindings).map(
        (key) => {
          return ts.factory.createParameterDeclaration(
            undefined,
            undefined,
            undefined,
            key,
            undefined,
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
          );
        }
      );

      const statements = [ts.factory.createReturnStatement(jsxRoot as any)];
      const block = ts.factory.createBlock(statements, true);
      const functionDeclaration = DoricCodeGen.getInstance().createFunction(
        this.scriptBlock.map.sources[0].replace(/\.[^/.]+$/, ""),
        parameterDeclarations,
        block
      );

      const functionResult = DoricCodeGen.getInstance().printer.printNode(
        ts.EmitHint.Unspecified,
        functionDeclaration,
        DoricCodeGen.getInstance().sourceFile
      );
      console.log(functionResult);

      console.log(prettier.format(importResult + functionResult));

      console.log(this.scriptBlock.content);
    }
  }

  createJsxElementRecursive(el: ASTElement): ts.JsxChild {
    const children = el.children.map((child) => {
      if (child.type === 1) {
        // ASTElement
        return this.createJsxElementRecursive(child);
      } else if (child.type === 3) {
        // ASTText
        const tag = "vasttext";
        if (!DoricCodeGen.getInstance().imports.includes(tag)) {
          DoricCodeGen.getInstance().imports.push(tag);
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
        const tag = "vastexpression";
        if (!DoricCodeGen.getInstance().imports.includes(tag)) {
          DoricCodeGen.getInstance().imports.push(tag);
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
                    ts.factory.createIdentifier(child.tokens[0]["@binding"]),
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
      if (!DoricCodeGen.getInstance().imports.includes(key)) {
        DoricCodeGen.getInstance().imports.push(key);
      }

      let jsxAttributes = el.attrsList.map((attr) => {
        let name = attr.name;
        if (
          DoricVueHelper.ATTRIBUTE_MAPPING[el.tag] &&
          DoricVueHelper.ATTRIBUTE_MAPPING[el.tag][attr.name]
        ) {
          name = DoricVueHelper.ATTRIBUTE_MAPPING[el.tag][attr.name];
        }

        let value: ts.Expression = ts.factory.createStringLiteral(attr.value);
        if (name == "@tap") {
          name = "tap";
          value = ts.factory.createIdentifier(attr.value);
        }

        return ts.factory.createJsxAttribute(
          ts.factory.createIdentifier(name),
          ts.factory.createJsxExpression(
            undefined,
            ts.factory.createExpressionWithTypeArguments(value, undefined)
          )
        );
      });

      if (el.staticClass) {
        jsxAttributes = jsxAttributes.concat(
          ts.factory.createJsxAttribute(
            ts.factory.createIdentifier("class"),
            ts.factory.createJsxExpression(
              undefined,
              ts.factory.createExpressionWithTypeArguments(
                ts.factory.createIdentifier(el.staticClass),
                undefined
              )
            )
          )
        );
      }

      // declared style
      this.parsedRoots.forEach((root) => {
        for (let index = 0; index < root.nodes.length; index++) {
          const selector = (root.nodes[index] as Rule).selector;
          const declarations = (root.nodes[index] as Rule)
            .nodes as Declaration[];

          const subSelectors = selector.split(",");
          subSelectors.forEach((subSelector) => {
            const trimedSubSelector = subSelector.trim();
            if (subSelector.trim().startsWith("#")) {
              // id
              let id = undefined;
              el.attrsList.forEach((attr) => {
                if (attr.name === "id") {
                  id = attr.value;
                }
              });
            } else if (subSelector.trim().startsWith(".")) {
              // class
              if (el.staticClass) {
                if (
                  "." + replaceAll(el.staticClass, '"', "") ==
                  trimedSubSelector
                ) {
                  const propertyAssigment = declarations.map((declaration) => {
                    return ts.factory.createPropertyAssignment(
                      "'" + declaration.prop + "'",
                      ts.factory.createStringLiteral(declaration.value)
                    );
                  });

                  jsxAttributes = jsxAttributes.concat(
                    ts.factory.createJsxAttribute(
                      ts.factory.createIdentifier("declaredStyles"),
                      ts.factory.createJsxExpression(
                        undefined,
                        ts.factory.createObjectLiteralExpression(
                          propertyAssigment
                        )
                      )
                    )
                  );
                }
              }
            } else {
              // tag
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

      if (el.if) {
        return ts.factory.createJsxExpression(undefined, ts.factory.createConditionalExpression(
          ts.factory.createIdentifier(el.if),
          undefined,
          ts.factory.createJsxElement(
            ts.factory.createJsxOpeningElement(
              ts.factory.createIdentifier(DoricVueHelper.TAG_MAPPING[el.tag]),
              undefined,
              ts.factory.createJsxAttributes(jsxAttributes)
            ),
            children,
            ts.factory.createJsxClosingElement(
              ts.factory.createIdentifier(DoricVueHelper.TAG_MAPPING[el.tag])
            )
          ),
          undefined,
          ts.factory.createIdentifier("null")
        ))
      } else {
        return ts.factory.createJsxElement(
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
