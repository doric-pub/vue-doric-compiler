import ts, { ParameterDeclaration } from "typescript";

export default class DoricCodeGen {
  private static instance: DoricCodeGen;

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
  public static getInstance(): DoricCodeGen {
    if (!DoricCodeGen.instance) {
      DoricCodeGen.instance = new DoricCodeGen();
    }

    return DoricCodeGen.instance;
  }

  sourceFile = ts.createSourceFile(
    "temp.tsx",
    "",
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TSX
  );
  printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });

  imports: Array<string> = ["jsx"];

  createImport() {
    const importSpecifiers = this.imports.map((value) => {
      return ts.factory.createImportSpecifier(
        false,
        undefined,
        ts.factory.createIdentifier(value)
      );
    });

    const importClause = ts.factory.createImportClause(
      false,
      undefined,
      ts.factory.createNamedImports(importSpecifiers)
    );

    return ts.factory.updateImportDeclaration(
      ts.factory.createImportDeclaration(
        undefined,
        undefined,
        importClause,
        undefined
      ),
      undefined,
      undefined,
      importClause,
      ts.factory.createStringLiteral("doric"),
      undefined
    );
  }

  createFunction(
    name: string,
    parameterDeclarations: ParameterDeclaration[],
    block: ts.Block
  ) {
    return ts.factory.createFunctionDeclaration(
      undefined,
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      undefined,
      name,
      undefined,
      parameterDeclarations,
      undefined,
      block
    );
  }

  createClass(name: string, block: ts.Block) {
    return ts.factory.createClassDeclaration(
      [ts.factory.createDecorator(ts.factory.createIdentifier("Entry"))],
      undefined,
      name,
      undefined,
      [
        ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
          ts.factory.createExpressionWithTypeArguments(
            ts.factory.createIdentifier("Panel"),
            undefined
          ),
        ]),
      ],
      [
        ts.factory.createMethodDeclaration(
          undefined,
          undefined,
          undefined,
          "build",
          undefined,
          undefined,
          [
            ts.factory.createParameterDeclaration(
              undefined,
              undefined,
              undefined,
              "root",
              undefined,
              ts.factory.createTypeReferenceNode("Group")
            ),
          ],
          undefined,
          block
        ),
      ]
    );
  }
}
