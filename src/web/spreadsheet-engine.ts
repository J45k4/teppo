// Types

export type CellId = string

export type CellValue =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "error"; message: string }
  | { kind: "empty" }

export type Expr =
  | { type: "literal"; value: number | string | boolean }
  | { type: "ref"; cell: CellId }
  | { type: "binary"; op: "+" | "-" | "*" | "/"; left: Expr; right: Expr }
  | { type: "call"; fn: string; args: Expr[] }

export interface CellNode {
  id: CellId
  formula?: Expr
  raw?: string
  value: CellValue
  deps: Set<CellId>
  users: Set<CellId>
  dirty: boolean
}

export interface SheetGraph {
  cells: Map<CellId, CellNode>
}

export class SpreadsheetEngine {
  graph: SheetGraph = { cells: new Map() }

  getCell(id: CellId): CellNode {
    if (!this.graph.cells.has(id)) {
      this.graph.cells.set(id, this.createCell(id))
    }
    return this.graph.cells.get(id)!
  }

  setValue(id: CellId, value: CellValue) {
    const cell = this.getCell(id)
    cell.formula = undefined
    cell.raw = undefined
    cell.value = value
    this.markDirtyDownstream(id)
    this.recompute()
  }

  setFormula(id: CellId, expr: Expr, raw?: string) {
    const cell = this.getCell(id)

    for (const dep of cell.deps) {
      this.getCell(dep).users.delete(id)
    }
    cell.deps.clear()

    const deps = extractDeps(expr)
    for (const dep of deps) {
      if (this.createsCycle(id, dep)) {
        cell.value = { kind: "error", message: "Cycle detected" }
        return
      }
      cell.deps.add(dep)
      this.getCell(dep).users.add(id)
    }

    cell.formula = expr
    cell.raw = raw
    cell.dirty = true

    this.markDirtyDownstream(id)
    this.recompute()
  }

  private createCell(id: CellId): CellNode {
    return {
      id,
      value: { kind: "empty" },
      deps: new Set(),
      users: new Set(),
      dirty: false,
    }
  }

  private markDirtyDownstream(id: CellId) {
    const queue = [id]
    const visited = new Set<CellId>()

    while (queue.length) {
      const cur = queue.shift()!
      if (visited.has(cur)) continue
      visited.add(cur)

      const cell = this.getCell(cur)
      cell.dirty = true

      for (const user of cell.users) {
        queue.push(user)
      }
    }
  }

  private recompute() {
    for (const cell of this.graph.cells.values()) {
      if (cell.dirty) {
        cell.value = this.evaluate(cell)
        cell.dirty = false
      }
    }
  }

  private evaluate(cell: CellNode): CellValue {
    if (!cell.formula) return cell.value

    try {
      const result = evalExpr(cell.formula, id => this.getCell(id).value)
      if (typeof result === "number") return { kind: "number", value: result }
      if (typeof result === "boolean") return { kind: "boolean", value: result }
      if (typeof result === "string") return { kind: "string", value: result }
      return { kind: "error", message: "Unsupported result" }
    } catch (error: any) {
      return { kind: "error", message: error.message }
    }
  }

  private createsCycle(start: CellId, dep: CellId): boolean {
    const stack = [dep]
    const visited = new Set<CellId>()

    while (stack.length) {
      const cur = stack.pop()!
      if (cur === start) return true
      if (visited.has(cur)) continue
      visited.add(cur)
      for (const d of this.getCell(cur).deps) {
        stack.push(d)
      }
    }
    return false
  }
}

export function parseExprFromString(text: string): Expr {
  const tokens = tokenizeExpression(text)
  let index = 0

  function peek() {
    return tokens[index]
  }

  function consumeToken(): string {
    const token = tokens[index++]
    if (!token) throw new Error("Unexpected end of formula")
    return token
  }

  function parseExpression(): Expr {
    let node = parseTerm()
    while (true) {
      const op = peek()
      if (op === "+" || op === "-") {
        consumeToken()
        const right = parseTerm()
        node = { type: "binary", op, left: node, right }
        continue
      }
      break
    }
    return node
  }

  function parseTerm(): Expr {
    let node = parseFactor()
    while (true) {
      const op = peek()
      if (op === "*" || op === "/") {
        consumeToken()
        const right = parseFactor()
        node = { type: "binary", op, left: node, right }
        continue
      }
      break
    }
    return node
  }

  function parseFactor(): Expr {
    const token = peek()
    if (!token) throw new Error("Unexpected end of formula")
    if (token === "(") {
      consumeToken()
      const expr = parseExpression()
      if (consumeToken() !== ")") throw new Error("Expected closing parenthesis")
      return expr
    }
    if (/^[0-9]+(\.[0-9]+)?$/.test(token)) {
      consumeToken()
      return { type: "literal", value: Number(token) }
    }
    if (/^TRUE$/i.test(token)) {
      consumeToken()
      return { type: "literal", value: true }
    }
    if (/^FALSE$/i.test(token)) {
      consumeToken()
      return { type: "literal", value: false }
    }
    if (/^[A-Z]+[0-9]+$/i.test(token)) {
      consumeToken()
      return { type: "ref", cell: token.toUpperCase() }
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) {
      const fn = token.toUpperCase()
      consumeToken()
      if (peek() !== "(") throw new Error("Expected call syntax")
      consumeToken()
      const args: Expr[] = []
      if (peek() !== ")") {
        while (true) {
          args.push(parseExpression())
          if (peek() === ",") {
            consumeToken()
            continue
          }
          break
        }
      }
      if (consumeToken() !== ")") throw new Error("Expected closing parenthesis")
      return { type: "call", fn, args }
    }
    throw new Error(`Unexpected token: ${token}`)
  }

  const expr = parseExpression()
  if (peek()) throw new Error(`Unexpected token: ${peek()}`)
  return expr
}

function tokenizeExpression(text: string) {
  const tokens: string[] = []
  const pattern = /\s*([A-Za-z]+\d+|[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|[()=,+*/-])\s*/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text))) {
    const token = match[1]
    if (token) {
      tokens.push(token)
    }
  }
  return tokens
}

function extractDeps(expr: Expr): Set<CellId> {
  const deps = new Set<CellId>()
  function walk(node: Expr) {
    if (node.type === "ref") {
      deps.add(node.cell)
      return
    }
    if (node.type === "binary") {
      walk(node.left)
      walk(node.right)
      return
    }
    if (node.type === "call") {
      for (const arg of node.args) {
        walk(arg)
      }
    }
  }
  walk(expr)
  return deps
}

function evalExpr(expr: Expr, getValue: (id: CellId) => CellValue): any {
  switch (expr.type) {
    case "literal":
      return expr.value
    case "ref": {
      const value = getValue(expr.cell)
      if (value.kind === "error") throw new Error(value.message)
      if (value.kind === "empty") return 0
      return value.value
    }
    case "binary": {
      const left = evalExpr(expr.left, getValue)
      const right = evalExpr(expr.right, getValue)
      switch (expr.op) {
        case "+":
          return left + right
        case "-":
          return left - right
        case "*":
          return left * right
        case "/":
          return left / right
      }
      return 0
    }
    case "call":
      if (expr.fn === "SUM") {
        return expr.args.reduce((sum, arg) => sum + evalExpr(arg, getValue), 0)
      }
      throw new Error(`Unknown function: ${expr.fn}`)
  }
}
