import { createModal } from "./modal"
import { bindNavbarHandlers, renderNavbar } from "./nav"
import { navigate } from "./router"

type SpreadsheetDTO = {
	id: number
	name: string
	description?: string | null
	created_at: string
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	year: "numeric",
	month: "short",
	day: "numeric",
})

export async function renderSpreadsheetsPage() {
	const body = ensureBody()

	body.innerHTML = `
		<div class="app-frame">
			${renderNavbar("spreadsheets")}
			<main class="spreadsheets-page">
				<header class="spreadsheets-header">
					<div>
						<p class="spreadsheets-title">Spreadsheets</p>
						<h1>Organize structured thinking</h1>
					</div>
					<div class="spreadsheets-summary">
						<span>Total spreadsheets</span>
						<strong id="spreadsheets-total">0</strong>
						<span id="spreadsheets-note">Create your first sheet</span>
					</div>
				</header>
				<section class="spreadsheets-controls">
					<button type="button" id="open-spreadsheet-modal">Create spreadsheet</button>
				</section>
				<section class="spreadsheets-list">
					<div class="spreadsheets-list-header">
						<span>Spreadsheet</span>
						<span>Created</span>
						<span></span>
					</div>
					<div class="spreadsheets-rows" id="spreadsheets-rows">
						<p class="spreadsheets-empty">Loading spreadsheets…</p>
					</div>
				</section>
			</main>
		</div>
		<div class="modal-backdrop" id="spreadsheet-modal" aria-hidden="true">
			<form class="modal" id="spreadsheet-form">
				<p class="spreadsheets-title">Create spreadsheet</p>
				<label>
					<span>Name</span>
					<input id="spreadsheet-name" name="name" type="text" required />
				</label>
				<label>
					<span>Description</span>
					<input id="spreadsheet-description" name="description" type="text" />
				</label>
				<p class="modal-error" id="spreadsheet-error" aria-live="polite"></p>
				<div class="modal-actions">
					<button type="button" id="spreadsheet-cancel">Cancel</button>
					<button type="submit">Create</button>
				</div>
			</form>
		</div>
	`

	bindNavbarHandlers(body)

	const openButton = body.querySelector<HTMLButtonElement>(
		"#open-spreadsheet-modal",
	)
	const modalBackdrop = body.querySelector<HTMLDivElement>("#spreadsheet-modal")
	const form = body.querySelector<HTMLFormElement>("#spreadsheet-form")
	const nameInput = body.querySelector<HTMLInputElement>("#spreadsheet-name")
	const descriptionInput =
		body.querySelector<HTMLInputElement>("#spreadsheet-description")
	const errorMessage =
		body.querySelector<HTMLParagraphElement>("#spreadsheet-error")
	const cancelButton = body.querySelector<HTMLButtonElement>("#spreadsheet-cancel")
	const rowsContainer =
		body.querySelector<HTMLDivElement>("#spreadsheets-rows")
	const totalCount = body.querySelector<HTMLSpanElement>("#spreadsheets-total")
	const totalNote = body.querySelector<HTMLSpanElement>("#spreadsheets-note")

	let spreadsheets: SpreadsheetDTO[] = []

	const modal = createModal({
		backdrop: modalBackdrop,
		focusTarget: nameInput,
		onOpen: () => {
			if (errorMessage) {
				errorMessage.textContent = ""
			}
		},
		onClose: () => {
			form?.reset()
			if (errorMessage) {
				errorMessage.textContent = ""
			}
		},
	})

	function updateSummary() {
		if (!totalCount || !totalNote) return
		totalCount.textContent = `${spreadsheets.length}`
		totalNote.textContent =
			spreadsheets.length === 0
				? "Create your first sheet"
				: `${spreadsheets.length} sheet${spreadsheets.length === 1 ? "" : "s"}`
	}

	function renderRows() {
		if (!rowsContainer) return
		if (spreadsheets.length === 0) {
			rowsContainer.innerHTML =
				'<p class="spreadsheets-empty">No spreadsheets yet.</p>'
			return
		}
		const rows = spreadsheets
			.map((spreadsheet) => {
				const description = spreadsheet.description
					? `<div class="spreadsheets-description">${spreadsheet.description}</div>`
					: ""
				return `
					<div class="spreadsheets-row" data-id="${spreadsheet.id}">
						<div>
							<div class="spreadsheets-name">${spreadsheet.name}</div>
							${description}
						</div>
						<div class="spreadsheets-created">
							${formatDate(spreadsheet.created_at)}
						</div>
						<div class="spreadsheets-actions">
							<button
								type="button"
								data-action="open-spreadsheet"
								data-id="${spreadsheet.id}"
							>
								Open
							</button>
						</div>
					</div>
				`
			})
			.join("")
		rowsContainer.innerHTML = rows
	}

	function updateView() {
		updateSummary()
		renderRows()
	}

	async function loadSpreadsheets() {
		const response = await fetch("/api/spreadsheets", {
			credentials: "include",
		})
		if (!response.ok) {
			throw new Error("Failed to load spreadsheets")
		}
		spreadsheets = (await response.json()) as SpreadsheetDTO[]
		updateView()
	}

	openButton?.addEventListener("click", () => modal.open())
	cancelButton?.addEventListener("click", () => modal.close())

	form?.addEventListener("submit", async (event) => {
		event.preventDefault()
		if (!nameInput) return
		if (errorMessage) {
			errorMessage.textContent = ""
		}
		const name = nameInput.value.trim()
		if (!name) {
			if (errorMessage) {
				errorMessage.textContent = "Enter a name"
			}
			return
		}
		const description = descriptionInput?.value.trim() ?? ""
		try {
			const response = await fetch("/api/spreadsheets", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					name,
					description: description || undefined,
				}),
			})
			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as
					| { error?: string }
					| null
				if (errorMessage) {
					errorMessage.textContent =
						payload?.error ?? "Unable to create spreadsheet"
				}
				return
			}
			const payload = await response.json().catch(() => null)
			const createdId =
				payload && typeof payload.id === "number" ? payload.id : null
			if (createdId) {
				spreadsheets = [
					{
						id: createdId,
						name,
						description: description || null,
						created_at: new Date().toISOString(),
					},
					...spreadsheets,
				]
				updateView()
			} else {
				await loadSpreadsheets()
			}
			modal.close()
		} catch (error) {
			console.error("Failed to create spreadsheet", error)
			if (errorMessage) {
				errorMessage.textContent = "Unable to create spreadsheet"
			}
		}
	})

	rowsContainer?.addEventListener("click", (event) => {
		const target = event.target as HTMLElement
		const button = target.closest<HTMLButtonElement>(
			"[data-action='open-spreadsheet']",
		)
		if (!button) return
		const id = Number(button.dataset.id)
		if (!Number.isInteger(id)) return
		navigate(`/spreadsheets/${id}`)
	})

	try {
		await loadSpreadsheets()
	} catch (error) {
		console.error("Failed to load spreadsheets", error)
		if (rowsContainer) {
			rowsContainer.innerHTML =
				'<p class="spreadsheets-empty">Unable to load spreadsheets right now.</p>'
		}
		if (totalCount) {
			totalCount.textContent = "0"
		}
		if (totalNote) {
			totalNote.textContent = "An error occurred"
		}
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
