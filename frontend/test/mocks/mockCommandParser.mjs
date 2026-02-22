import fs from "fs"
import path from "path"
import ts from "typescript"

/** @typedef {{name: string, description: string}} MockCommandInfo */

/**
 * Returns the absolute paths to all mock command source files.
 * @returns {string[]}
 */
export function commandSources() {
  return [
    path.resolve(process.cwd(), "test/mocks/mockCommands.ts"),
    path.resolve(process.cwd(), "src/lib/dev/mockLocalCommands.ts"),
  ]
}

/**
 * Parses a given TypeScript file to extract exported command names and their JSDoc descriptions.
 * @param {string} filePath The absolute path to the TypeScript file.
 * @returns {Array<MockCommandInfo>} An array of command objects.
 * @throws {Error} If the file structure is not as expected.
 */
function parseMockCommandsFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Command file not found at: ${filePath}`)
  }

  const program = ts.createProgram([filePath], { allowJs: true })
  const sourceFile = program.getSourceFile(filePath)
  if (!sourceFile) {
    throw new Error(
      `Could not create a TypeScript source file for ${filePath}.`,
    )
  }

  /** @type {ts.ObjectLiteralExpression | undefined} */
  let initializer
  sourceFile.statements.forEach((node) => {
    if (initializer) return // Stop after finding the first one
    if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const declaration = node.declarationList.declarations[0]
      if (
        declaration.initializer &&
        ts.isObjectLiteralExpression(declaration.initializer)
      ) {
        initializer = declaration.initializer
      }
    }
  })

  if (!initializer) {
    throw new Error(`Could not find an exported object literal in ${filePath}.`)
  }

  /** @type {Array<MockCommandInfo>} */
  const commandsWithDocs = []

  initializer.properties.forEach(
    /** @param {ts.ObjectLiteralElementLike} prop */
    (prop) => {
      if (!ts.isPropertyAssignment(prop) || !prop.name) {
        return // Skip non-property assignments like comments or spread operators
      }

      const commandName = prop.name.getText(sourceFile)
      let description = ""
      const symbol = program.getTypeChecker().getSymbolAtLocation(prop.name)

      if (symbol) {
        const comments = symbol.getDocumentationComment(
          program.getTypeChecker(),
        )
        description = ts.displayPartsToString(comments)
      }
      commandsWithDocs.push({ name: commandName, description })
    },
  )

  return commandsWithDocs
}

/**
 * Parses all command source files and returns a merged list of commands.
 * The merge logic uses a Map to ensure client-side definitions (which are parsed last)
 * overwrite server-side definitions for hybrid commands, providing a single source of truth for JSDoc.
 * @returns {Array<MockCommandInfo>}
 */
export function parseMockCommandsFromSources() {
  const sources = commandSources()
  const commandMap = new Map()

  sources.forEach((filePath) => {
    const commands = parseMockCommandsFromFile(filePath)
    commands.forEach((cmd) => commandMap.set(cmd.name, cmd))
  })

  return Array.from(commandMap.values())
}
