import * as ts from "typescript";

const sourceFile = ts.createSourceFile(
  "temp.tsx",
  "",
  ts.ScriptTarget.Latest,
  false,
  ts.ScriptKind.TSX
);
const printer = ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed,
});

//#region import declaration
const imports: Array<string> = [];

function createImport() {
  const importSpecifiers = imports.map((value) => {
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

//#endregion

imports.push("VLayout");
imports.push("VLayout");
imports.push("VLayout");
imports.push("VLayout");
const importDeclaration = createImport();

console.log(
  printer.printNode(ts.EmitHint.Unspecified, importDeclaration, sourceFile)
);

//#region class declaration

const jsxRoot = ts.factory.createJsxElement(
  ts.factory.createJsxOpeningElement(
    ts.factory.createIdentifier("VLayout"),
    undefined,
    ts.factory.createJsxAttributes([])
  ),
  [
    ts.factory.createJsxElement(
      ts.factory.createJsxOpeningElement(
        ts.factory.createIdentifier("HLayout"),
        undefined,
        ts.factory.createJsxAttributes([])
      ),
      [],
      ts.factory.createJsxClosingElement(ts.factory.createIdentifier("HLayout"))
    ),
  ],
  ts.factory.createJsxClosingElement(ts.factory.createIdentifier("VLayout"))
);

const statements = [ts.factory.createExpressionStatement(jsxRoot)];
const block = ts.factory.createBlock(statements, true);

function createClass(name: string) {
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

console.log(
  printer.printNode(ts.EmitHint.Unspecified, createClass("Timer"), sourceFile)
);

//#endregion
