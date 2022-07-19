import { ASTElement } from "types/compiler";
import ts, { createJsxElement } from "typescript";
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

  transformVueElement(el: ASTElement) {
    if (el.parent === undefined) {
      console.log(el);

      const jsxRoot = this.createJsxElementRecursive(el);

      const statements = [ts.factory.createExpressionStatement(jsxRoot)];
      const block = ts.factory.createBlock(statements, true);
      const classDeclaration = DoricCodeGen.getInstance().createClass(
        "Test",
        block
      );
      const result = DoricCodeGen.getInstance().printer.printNode(
        ts.EmitHint.Unspecified,
        classDeclaration,
        DoricCodeGen.getInstance().sourceFile
      );
      console.log(result);
    }
  }

  createJsxElementRecursive(el: ASTElement) {
    const children = el.children.map((child) => {
      if (child.type === 1) {
        return this.createJsxElementRecursive(child);
      } else {
        return ts.factory.createJsxElement(
          ts.factory.createJsxOpeningElement(
            ts.factory.createIdentifier("empty-text"),
            undefined,
            ts.factory.createJsxAttributes([])
          ),
          [],
          ts.factory.createJsxClosingElement(
            ts.factory.createIdentifier("empty-text")
          )
        );
      }
    });

    return ts.factory.createJsxElement(
      ts.factory.createJsxOpeningElement(
        ts.factory.createIdentifier(el.tag),
        undefined,
        ts.factory.createJsxAttributes([])
      ),
      children,
      ts.factory.createJsxClosingElement(ts.factory.createIdentifier(el.tag))
    );
  }
}
