import { bindNavbarHandlers, renderNavbar } from "./nav"
import { navigate } from "./router"
import { parseExprFromString, SpreadsheetEngine } from "./spreadsheet-engine"
import type { CellValue } from "./spreadsheet-engine"

type SpreadsheetDetailDTO = {
	id: number
	name: string
	description?: string | null
	created_at: string
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	year: "numeric",
	month: "short",
	day: "numeric",
	timeZone: "UTC",
})

const columnLabels = ["A", "B", "C", "D", "E", "F", "G", "H"]
const rowLabels = [1, 2, 3, 4, 5, 6, 7, 8]
const defaultSheetPrompt = 'Type "=AI" to insert a Gemini prompt in any cell'

export async function renderSpreadsheetDetailPage(idParam: string | number) {
	const body = ensureBody()

	body.innerHTML = `
		<div class="app-frame">
			${renderNavbar("spreadsheets")}
			<main class="spreadsheet-detail-page">
				<section class="spreadsheet-detail-card">
					<header class="spreadsheet-detail-header">
						<div>
							<p class="spreadsheets-title">Spreadsheet</p>
							<h1 id="spreadsheet-detail-name">Loading…</h1>
						</div>
						<button
							class="spreadsheet-detail-back"
							type="button"
							id="spreadsheet-detail-back"
						>
							Back to list
						</button>
					</header>
					<div class="spreadsheet-detail-body">
						<div class="spreadsheet-detail-meta" id="spreadsheet-detail-meta">
							<span class="spreadsheet-meta-id">ID —</span>
							<span class="spreadsheet-meta-date">Loading…</span>
						</div>
						<div class="spreadsheet-sheet" aria-live="polite">
							<div class="spreadsheet-sheet-col-labels">
								<span></span>
								${columnLabels
									.map(
										(label) =>
											`<span class="spreadsheet-sheet-col-label">${label}</span>`,
									)
									.join("")}
							</div>
							<div class="spreadsheet-sheet-body">
								<div class="spreadsheet-sheet-row-labels">
									${rowLabels
										.map(
											(label) =>
												`<span class="spreadsheet-sheet-row-label">${label}</span>`,
										)
										.join("")}
								</div>
								<div class="spreadsheet-sheet-grid" id="spreadsheet-sheet-grid"></div>
							</div>
						</div>
					</div>
				</section>
			</main>
		</div>
	`

	bindNavbarHandlers(body)

	const nameHeading =
		body.querySelector<HTMLHeadingElement>("#spreadsheet-detail-name")
	const metaId = body.querySelector<HTMLSpanElement>(".spreadsheet-meta-id")
	const metaDate = body.querySelector<HTMLSpanElement>(".spreadsheet-meta-date")
	const sheetGrid = body.querySelector<HTMLDivElement>("#spreadsheet-sheet-grid")
	const columnLabelContainer =
		body.querySelector<HTMLDivElement>(".spreadsheet-sheet-col-labels")
	const rowLabelContainer =
		body.querySelector<HTMLDivElement>(".spreadsheet-sheet-row-labels")
	const backButton = body.querySelector<HTMLButtonElement>("#spreadsheet-detail-back")

	const engine = new SpreadsheetEngine()
	let sheetPrompt = defaultSheetPrompt
	const columnWidths = columnLabels.map(() => 80)
	const rowHeights = rowLabels.map(() => 48)

	backButton?.addEventListener("click", () => navigate("/spreadsheets"))

	applySheetSizing()
	initializeResizers()
	renderSheetGrid(sheetPrompt)

	const spreadsheetId = typeof idParam === "number" ? idParam : Number(idParam)
	if (!Number.isInteger(spreadsheetId) || spreadsheetId <= 0) {
		renderError("Invalid spreadsheet identifier")
		return
	}

	try {
		const response = await fetch(`/api/spreadsheets/${spreadsheetId}`, {
			credentials: "include",
		})
		if (!response.ok) {
			if (response.status === 404) {
				renderError("Spreadsheet not found")
				return
			}
			throw new Error("Failed to load spreadsheet")
		}
		const spreadsheet = (await response.json()) as SpreadsheetDetailDTO
		renderSpreadsheet(spreadsheet)
	} catch (error) {
		console.error("Failed to load spreadsheet detail", error)
		renderError("Unable to load spreadsheet right now")
	}

	function renderSpreadsheet(data: SpreadsheetDetailDTO) {
		if (nameHeading) {
			nameHeading.textContent = data.name
		}
		if (metaId) {
			metaId.textContent = `ID ${data.id}`
		}
		if (metaDate) {
			metaDate.textContent = formatDate(data.created_at)
		}
		sheetPrompt = data.description?.trim() ?? defaultSheetPrompt
		renderSheetGrid(sheetPrompt)
	}

	function renderError(message: string) {
		if (nameHeading) {
			nameHeading.textContent = "Spreadsheet"
		}
		if (metaId) {
			metaId.textContent = ""
		}
		if (metaDate) {
			metaDate.textContent = ""
		}
		if (sheetGrid) {
			sheetGrid.innerHTML = `<p class="spreadsheet-sheet-error">${message}</p>`
		}
	}

	function renderSheetGrid(noteText: string) {
		if (!sheetGrid) return
		applySheetSizing()
		sheetGrid.innerHTML = ""
		const fragment = document.createDocumentFragment()
		rowLabels.forEach((row) => {
			columnLabels.forEach((col) => {
				const cellId = `${col}${row}`
				const cell = document.createElement("div")
				cell.className = "spreadsheet-sheet-cell"
				cell.setAttribute("data-column", col)
				cell.setAttribute("data-row", String(row))
				cell.setAttribute("data-cell", cellId)
				const node = engine.getCell(cellId)
				const display = getCellDisplay(node.value, row, col, noteText)
				cell.textContent = display
				cell.addEventListener("click", (event) => {
					event.preventDefault()
					startEditing(cellId, cell, col, row)
				})
				fragment.append(cell)
			})
		})
		sheetGrid.append(fragment)
	}

	function applySheetSizing() {
		const gridColumns = columnWidths.map((width) => `${width}px`).join(" ")
		const gridRows = rowHeights.map((height) => `${height}px`).join(" ")
		if (sheetGrid) {
			sheetGrid.style.gridTemplateColumns = gridColumns
			sheetGrid.style.gridTemplateRows = gridRows
		}
		if (columnLabelContainer) {
			columnLabelContainer.style.gridTemplateColumns = `40px ${gridColumns}`
		}
		if (rowLabelContainer) {
			rowLabelContainer.style.gridTemplateRows = gridRows
		}
	}

	let activeResize:
		| {
				type: "column" | "row"
				index: number
				start: number
				initial: number
		  }
		| null = null

	function initializeResizers() {
		const columnHeaders =
			columnLabelContainer?.querySelectorAll<HTMLSpanElement>(
				".spreadsheet-sheet-col-label",
			) ?? []
		columnHeaders.forEach((header, index) => {
			let handle = header.querySelector<HTMLDivElement>(
				".spreadsheet-resizer.column",
			)
			if (!handle) {
				handle = document.createElement("div")
				handle.className = "spreadsheet-resizer column"
				header.append(handle)
			}
			handle.dataset.index = String(index)
			handle.addEventListener("pointerdown", startColumnResize)
		})

		const rowHeaders =
			rowLabelContainer?.querySelectorAll<HTMLSpanElement>(
				".spreadsheet-sheet-row-label",
			) ?? []
		rowHeaders.forEach((header, index) => {
			let handle = header.querySelector<HTMLDivElement>(".spreadsheet-resizer.row")
			if (!handle) {
				handle = document.createElement("div")
				handle.className = "spreadsheet-resizer row"
				header.append(handle)
			}
			handle.dataset.index = String(index)
			handle.addEventListener("pointerdown", startRowResize)
		})
	}

	function startColumnResize(event: PointerEvent) {
		const target = event.currentTarget as HTMLElement
		const index = Number(target.dataset.index)
		if (!Number.isInteger(index)) return
		activeResize = {
			type: "column",
			index,
			start: event.clientX,
			initial: columnWidths[index] ?? 80,
		}
		document.addEventListener("pointermove", handlePointerMove)
		document.addEventListener("pointerup", stopResize, { once: true })
		event.preventDefault()
	}

	function startRowResize(event: PointerEvent) {
		const target = event.currentTarget as HTMLElement
		const index = Number(target.dataset.index)
		if (!Number.isInteger(index)) return
		activeResize = {
			type: "row",
			index,
			start: event.clientY,
			initial: rowHeights[index] ?? 48,
		}
		document.addEventListener("pointermove", handlePointerMove)
		document.addEventListener("pointerup", stopResize, { once: true })
		event.preventDefault()
	}

	function handlePointerMove(event: PointerEvent) {
		if (!activeResize) return
		if (activeResize.type === "column") {
			const delta = event.clientX - activeResize.start
			columnWidths[activeResize.index] = Math.max(40, activeResize.initial + delta)
		} else {
			const delta = event.clientY - activeResize.start
			rowHeights[activeResize.index] = Math.max(32, activeResize.initial + delta)
		}
		applySheetSizing()
	}

	function stopResize() {
		activeResize = null
		document.removeEventListener("pointermove", handlePointerMove)
	}

	let activeEditor:
		| {
				element: HTMLDivElement
				finish: (options?: { updateOnly?: boolean }) => void
		  }
		| null = null

	function startEditing(
		cellId: string,
		cell: HTMLDivElement,
		column: string,
		row: number,
	) {
		if (activeEditor && activeEditor.element !== cell) {
			activeEditor.finish({ updateOnly: true })
		}
		if (activeEditor && activeEditor.element === cell) return

		const node = engine.getCell(cellId)
		const initialText = getEditorText(node)
		let committed = false
		const cleanup = () => {
			cell.classList.remove("is-editing")
			cell.removeAttribute("contenteditable")
			cell.removeEventListener("keydown", handleKeydown)
		}

		const finishCommit = (
			text: string | null,
			options?: { updateOnly?: boolean },
		) => {
			if (text !== null) {
				if (!text) {
					engine.setValue(cellId, { kind: "empty" })
				} else {
					try {
						if (text.startsWith("=")) {
							const expr = parseExprFromString(text.slice(1))
							engine.setFormula(cellId, expr, text)
						} else if (!Number.isNaN(Number(text))) {
							engine.setValue(cellId, { kind: "number", value: Number(text) })
						} else if (/^TRUE$/i.test(text) || /^FALSE$/i.test(text)) {
							engine.setValue(cellId, {
								kind: "boolean",
								value: /^TRUE$/i.test(text),
							})
						} else {
							engine.setValue(cellId, { kind: "string", value: text })
						}
					} catch (error: any) {
						engine.setValue(cellId, { kind: "error", message: error.message })
					}
				}
			}
			cleanup()
			activeEditor = null
			applyUpdater(options)
		}

		const applyUpdater = (options?: { updateOnly?: boolean }) => {
			if (options?.updateOnly) {
				updateSingleCell(cellId, column, row)
				return
			}
			refreshCells()
		}

		const handleBlur = () => {
			if (committed) return
			committed = true
			finishCommit(cell.textContent?.trim() ?? null, { updateOnly: true })
		}

		const handleKeydown = (event: KeyboardEvent) => {
			if (event.key === "Enter") {
				event.preventDefault()
				if (committed) return
				committed = true
				finishCommit(cell.textContent?.trim() ?? null)
			}
			if (event.key === "Escape") {
				event.preventDefault()
				if (committed) return
				committed = true
				refreshCells()
			}
		}

		cell.textContent = initialText
		cell.classList.add("is-editing")
		cell.setAttribute("contenteditable", "true")
		cell.addEventListener("keydown", handleKeydown)
		cell.addEventListener("blur", handleBlur, { once: true })
		activeEditor = {
			element: cell,
			finish: (options) => finishCommit(cell.textContent?.trim() ?? null, options),
		}
		setTimeout(() => {
			cell.focus()
			const range = document.createRange()
			range.selectNodeContents(cell)
			const sel = window.getSelection()
			sel?.removeAllRanges()
			sel?.addRange(range)
		}, 0)
	}

	let pendingRefresh = false

	function refreshCells() {
		renderSheetGrid(sheetPrompt)
	}

	function scheduleRefreshCells() {
		if (pendingRefresh) return
		pendingRefresh = true
		requestAnimationFrame(() => {
			pendingRefresh = false
			refreshCells()
		})
	}

	function getCellDisplay(value: CellValue, row: number, col: string, note: string) {
		if (value.kind === "error") return value.message
		if (value.kind === "number") return String(value.value)
		if (value.kind === "boolean") return value.value ? "TRUE" : "FALSE"
		if (value.kind === "string") return value.value
		if (value.kind === "empty" && row === 1 && col === "A") return note
		return ""
	}

	function getEditorText(node: { raw?: string; value: CellValue }) {
		if (node.raw) return node.raw
		switch (node.value.kind) {
			case "number":
				return String(node.value.value)
			case "boolean":
				return node.value.value ? "TRUE" : "FALSE"
			case "string":
				return node.value.value
			default:
				return ""
		}
	}

	function updateSingleCell(id: string, column: string, row: number) {
		if (!sheetGrid) return
		const el = sheetGrid.querySelector<HTMLDivElement>(`[data-cell="${id}"]`)
		if (!el) return
		el.textContent = getCellDisplay(
			engine.getCell(id).value,
			row,
			column,
			sheetPrompt,
		)
	}
}

function formatDate(value: string) {
	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		return value
	}
	return dateFormatter.format(parsed)
}

function ensureBody() {
	const body = document.querySelector("body")
	if (!body) {
		throw new Error("No body element found")
	}
	return body
}
