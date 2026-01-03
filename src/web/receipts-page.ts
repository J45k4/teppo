import { bindNavbarHandlers, renderNavbar } from "./nav"
import { navigate } from "./router"

type ReceiptDTO = {
	id: number
	user_id: number
	amount: number
}

const currencyFormatter = new Intl.NumberFormat(undefined, {
	style: "currency",
	currency: "USD",
})

export async function renderReceiptsPage() {
	const body = ensureBody()

	body.innerHTML = `
		<div class="app-frame">
			${renderNavbar("receipts")}
			<main class="receipts-page">
				<header class="receipts-header">
					<div>
						<p class="receipts-title">Receipts</p>
						<h1>Track your spend</h1>
					</div>
					<div class="receipts-summary">
						<span>Total spend</span>
						<strong id="receipts-total">$0</strong>
						<span id="receipts-note">0 receipts</span>
					</div>
				</header>
				<section class="receipts-controls">
					<form class="receipts-panel" id="receipt-form">
						<header>
							<h2>Add receipt</h2>
							<p>Record a new purchase total.</p>
						</header>
						<label>
							<span>Amount</span>
							<input
								id="receipt-amount"
								name="amount"
								type="number"
								step="0.01"
								min="0"
								required
							/>
						</label>
						<p class="receipts-panel-error" id="receipt-error" aria-live="polite"></p>
						<button type="submit">Add receipt</button>
					</form>
				</section>
				<section class="receipts-list">
					<div class="receipts-list-header">
						<span>Receipt</span>
						<span>Amount</span>
						<span></span>
					</div>
					<div class="receipts-rows" id="receipts-rows">
						<p class="receipts-empty">Loading receipts…</p>
					</div>
				</section>
			</main>
		</div>
	`

	bindNavbarHandlers(body)

	const receiptForm = body.querySelector<HTMLFormElement>("#receipt-form")
	const receiptAmountInput =
		body.querySelector<HTMLInputElement>("#receipt-amount")
	const receiptError = body.querySelector<HTMLParagraphElement>("#receipt-error")
	const receiptsRows = body.querySelector<HTMLDivElement>("#receipts-rows")
	const receiptsTotal = body.querySelector<HTMLSpanElement>("#receipts-total")
	const receiptsNote = body.querySelector<HTMLSpanElement>("#receipts-note")

	let receipts: ReceiptDTO[] = []

	function updateSummary() {
		if (!receiptsTotal || !receiptsNote) return
		const total = receipts.reduce((sum, receipt) => sum + receipt.amount, 0)
		receiptsTotal.textContent = currencyFormatter.format(total)
		receiptsNote.textContent = `${receipts.length} receipt${
			receipts.length === 1 ? "" : "s"
		}`
	}

	function renderReceipts() {
		if (!receiptsRows) return
		if (receipts.length === 0) {
			receiptsRows.innerHTML =
				'<p class="receipts-empty">No receipts yet.</p>'
			return
		}
		const rows = receipts
			.map(
				(receipt) => `
					<div class="receipts-row">
						<div class="receipts-id">
							<button
								type="button"
								class="receipts-link"
								data-action="open-receipt"
								data-id="${receipt.id}"
							>
								Receipt #${receipt.id}
							</button>
						</div>
						<div class="receipts-amount">${currencyFormatter.format(
							receipt.amount,
						)}</div>
						<div class="receipts-actions">
							<button
								type="button"
								data-action="open-receipt"
								data-id="${receipt.id}"
							>
								View
							</button>
							<button type="button" data-action="delete-receipt" data-id="${receipt.id}">
								Delete
							</button>
						</div>
					</div>
				`,
			)
			.join("")
		receiptsRows.innerHTML = rows
	}

	function updateView() {
		updateSummary()
		renderReceipts()
	}

	async function loadReceipts() {
		const response = await fetch("/api/receipts", { credentials: "include" })
		if (!response.ok) {
			throw new Error("Failed to load receipts")
		}
		receipts = (await response.json()) as ReceiptDTO[]
		updateView()
	}

	receiptForm?.addEventListener("submit", async (event) => {
		event.preventDefault()
		if (!receiptAmountInput) return
		if (receiptError) receiptError.textContent = ""
		const amountValue = receiptAmountInput.value.trim()
		const amount = Number(amountValue)
		if (!amountValue || Number.isNaN(amount)) {
			if (receiptError) receiptError.textContent = "Enter a valid amount"
			return
		}
		try {
			const response = await fetch("/api/receipts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ amount }),
			})
			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as
					| { error?: string }
					| null
				if (receiptError) {
					receiptError.textContent =
						payload?.error ?? "Unable to add receipt"
				}
				return
			}
			const json = await response.json().catch(() => null)
			if (json && typeof json.id === "number") {
				receipts = [
					{ id: Number(json.id), user_id: 0, amount },
					...receipts,
				]
				updateView()
			} else {
				await loadReceipts()
			}
			receiptForm.reset()
		} catch (error) {
			console.error("Failed to add receipt", error)
			if (receiptError) {
				receiptError.textContent = "Unable to add receipt"
			}
		}
	})

	receiptsRows?.addEventListener("click", async (event) => {
		const target = event.target as HTMLElement
		const openButton = target.closest<HTMLButtonElement>(
			"[data-action='open-receipt']",
		)
		if (openButton) {
			const id = Number(openButton.dataset.id)
			if (Number.isInteger(id)) {
				navigate(`/receipts/${id}`)
			}
			return
		}
		const button = target.closest<HTMLButtonElement>(
			"[data-action='delete-receipt']",
		)
		if (!button) return
		const id = Number(button.dataset.id)
		if (!Number.isInteger(id)) return
		try {
			const response = await fetch(`/api/receipts/${id}`, {
				method: "DELETE",
				credentials: "include",
			})
			if (!response.ok) {
				alert("Unable to delete receipt")
				return
			}
			receipts = receipts.filter((receipt) => receipt.id !== id)
			updateView()
		} catch (error) {
			console.error("Failed to delete receipt", error)
			alert("Unable to delete receipt")
		}
	})

	try {
		await loadReceipts()
	} catch (error) {
		console.error("Failed to load receipts page data", error)
		if (receiptsRows) {
			receiptsRows.innerHTML =
				'<p class="receipts-empty">Unable to load receipts right now.</p>'
		}
		if (receiptsTotal) {
			receiptsTotal.textContent = "$0"
		}
		if (receiptsNote) {
			receiptsNote.textContent = "An error occurred"
		}
	}
}

function ensureBody() {
	const body = document.querySelector("body")
	if (!body) {
		throw new Error("No body element found")
	}
	return body
}
