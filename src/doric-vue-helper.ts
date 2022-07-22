import { Declaration, Root, Rule } from "postcss";
import { SFCScriptBlock } from "sfc/parseComponent";
import { ASTElement } from "types/compiler";
import ts, { JsxElement } from "typescript";
import DoricCodeGen from "./doric-codegen";
const prettier = require("prettier");

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
    div: "VLayout",
    h1: "Stack",
    h2: "Stack",
    ul: "HLayout",
    li: "VLayout",
    a: "Stack",
    br: "Stack",
    img: "Image",
  };

  static ATTRIBUTE_MAPPING = {
    img: { src: "imageUrl" },
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

      const statements = [ts.factory.createReturnStatement(jsxRoot)];
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
    }
  }

  createJsxElementRecursive(el: ASTElement): JsxElement {
    const children = el.children.map((child) => {
      if (child.type === 1) {
        return this.createJsxElementRecursive(child);
      } else if (child.type === 3) {
        if (!DoricCodeGen.getInstance().imports.includes("Text")) {
          DoricCodeGen.getInstance().imports.push("Text");
        }

        return ts.factory.createJsxElement(
          ts.factory.createJsxOpeningElement(
            ts.factory.createIdentifier("Text"),
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
          ts.factory.createJsxClosingElement(
            ts.factory.createIdentifier("Text")
          )
        );
      } else if (child.type === 2) {
        return ts.factory.createJsxElement(
          ts.factory.createJsxOpeningElement(
            ts.factory.createIdentifier("Text"),
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
          ts.factory.createJsxClosingElement(
            ts.factory.createIdentifier("Text")
          )
        );
      }
    });

    if (DoricVueHelper.TAG_MAPPING[el.tag]) {
      const key = DoricVueHelper.TAG_MAPPING[el.tag];
      if (!DoricCodeGen.getInstance().imports.includes(key)) {
        DoricCodeGen.getInstance().imports.push(key);
      }

      let jsxAttributes = el.attrsList.map((attr) => {
        let defaultName = attr.name;
        if (
          DoricVueHelper.ATTRIBUTE_MAPPING[el.tag] &&
          DoricVueHelper.ATTRIBUTE_MAPPING[el.tag][attr.name]
        ) {
          defaultName = DoricVueHelper.ATTRIBUTE_MAPPING[el.tag][attr.name];
        }

        return ts.factory.createJsxAttribute(
          ts.factory.createIdentifier(defaultName),
          ts.factory.createJsxExpression(
            undefined,
            ts.factory.createExpressionWithTypeArguments(
              ts.factory.createStringLiteral(attr.value),
              undefined
            )
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

      // style inject
      this.parsedRoots.forEach((root) => {
        for (let index = 0; index < root.nodes.length; index++) {
          const selector = (root.nodes[index] as Rule).selector;
          const declarations = (root.nodes[index] as Rule)
            .nodes as Declaration[];

          const subSelectors = selector.split(",");
          subSelectors.forEach((subSelector) => {
            console.log(subSelector.trim());
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
              }
            } else {
              // tag
            }
          });

          declarations.forEach((declaration) => {
            declaration.prop;
            declaration.value;
          });
        }
      });

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
