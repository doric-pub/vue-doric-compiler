import { ASTElement } from "types/compiler";
import ts, { JsxElement } from "typescript";
import DoricCodeGen from "./doric-codegen";

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
    ul: "VLayout",
    li: "VLayout",
    a: "Stack",
    br: "Stack",
  };

  transformVueElement(el: ASTElement) {
    if (el.parent === undefined) {
      console.log(el);

      let jsxRoot = this.createJsxElementRecursive(el);
      const rootOpeningElement = ts.factory.updateJsxOpeningElement(
        jsxRoot.openingElement,
        jsxRoot.openingElement.tagName,
        jsxRoot.openingElement.typeArguments,
        ts.factory.createJsxAttributes([
          ts.factory.createJsxAttribute(
            ts.factory.createIdentifier("parent"),
            ts.factory.createJsxExpression(
              undefined,
              ts.factory.createExpressionWithTypeArguments(
                ts.factory.createIdentifier("root"),
                undefined
              )
            )
          ),
        ])
      );
      jsxRoot = ts.factory.updateJsxElement(
        jsxRoot,
        rootOpeningElement,
        jsxRoot.children,
        jsxRoot.closingElement
      );

      const statements = [ts.factory.createExpressionStatement(jsxRoot)];
      const block = ts.factory.createBlock(statements, true);
      const classDeclaration = DoricCodeGen.getInstance().createClass(
        "Test",
        block
      );

      const importResult = DoricCodeGen.getInstance().printer.printNode(
        ts.EmitHint.Unspecified,
        DoricCodeGen.getInstance().createImport(),
        DoricCodeGen.getInstance().sourceFile
      );
      console.log(importResult);

      const classResult = DoricCodeGen.getInstance().printer.printNode(
        ts.EmitHint.Unspecified,
        classDeclaration,
        DoricCodeGen.getInstance().sourceFile
      );
      console.log(classResult);
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
      } else {
        return ts.factory.createJsxElement(
          ts.factory.createJsxOpeningElement(
            ts.factory.createIdentifier("no-implement"),
            undefined,
            ts.factory.createJsxAttributes([])
          ),
          [],
          ts.factory.createJsxClosingElement(
            ts.factory.createIdentifier("no-implement")
          )
        );
      }
    });

    if (DoricVueHelper.TAG_MAPPING[el.tag]) {
      const key = DoricVueHelper.TAG_MAPPING[el.tag];
      if (!DoricCodeGen.getInstance().imports.includes(key)) {
        DoricCodeGen.getInstance().imports.push(key);
      }

      const jsxAttributes = el.attrsList.map((attr) => {
        return ts.factory.createJsxAttribute(
          ts.factory.createIdentifier(attr.name),
          ts.factory.createJsxExpression(
            undefined,
            ts.factory.createExpressionWithTypeArguments(
              ts.factory.createStringLiteral(attr.value),
              undefined
            )
          )
        );
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
