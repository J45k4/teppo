import { bindNavbarHandlers, renderNavbar } from "./nav"
import { navigate } from "./router"

type ReceiptDTO = {
	id: number
	user_id: number
	amount: number
}

type ReceiptItemDTO = {
	id: number
	receipt_id: number
	item_id: number
}

type ItemDTO = {
	id: number
	name: string
	description?: string | null
}

const currencyFormatter = new Intl.NumberFormat(undefined, {
	style: "currency",
	currency: "USD",
})

export async function renderReceiptDetailPage(receiptIdParam: string | undefined) {
	const body = ensureBody()
	const receiptId = Number(receiptIdParam)
	if (!Number.isInteger(receiptId) || receiptId <= 0) {
		navigate("/receipts")
		return
	}

	body.innerHTML = `
		<div class="app-frame">
			${renderNavbar("receipts")}
			<main class="receipt-detail-page">
				<header class="receipt-detail-header">
					<div>
						<p class="receipt-detail-title">Receipt</p>
						<h1 id="receipt-heading">Receipt #${receiptId}</h1>
					</div>
					<div class="receipt-detail-summary">
						<span>Total</span>
						<strong id="receipt-total">$0</strong>
						<button type="button" id="receipt-back">Back to receipts</button>
					</div>
				</header>
				<section class="receipt-detail-controls">
					<form class="receipt-detail-panel" id="receipt-item-form">
						<header>
							<h2>Add item</h2>
							<p>Attach an item to this receipt.</p>
						</header>
						<label>
							<span>Item</span>
							<select id="receipt-item-select" name="itemId" required></select>
						</label>
						<p class="receipt-detail-error" id="receipt-item-error" aria-live="polite"></p>
						<button type="submit">Add item</button>
					</form>
				</section>
				<section class="receipt-detail-list">
					<div class="receipt-detail-list-header">
						<span>Item</span>
						<span></span>
					</div>
					<div class="receipt-detail-rows" id="receipt-items-rows">
						<p class="receipt-detail-empty">Loading receipt items…</p>
					</div>
				</section>
			</main>
		</div>
	`

	bindNavbarHandlers(body)

	const receiptTotal = body.querySelector<HTMLSpanElement>("#receipt-total")
	const backButton = body.querySelector<HTMLButtonElement>("#receipt-back")
	const itemsRows = body.querySelector<HTMLDivElement>("#receipt-items-rows")
	const itemForm = body.querySelector<HTMLFormElement>("#receipt-item-form")
	const itemSelect =
		body.querySelector<HTMLSelectElement>("#receipt-item-select")
	const itemError = body.querySelector<HTMLParagraphElement>(
		"#receipt-item-error",
	)

	backButton?.addEventListener("click", () => {
		navigate("/receipts")
	})

	let receipt: ReceiptDTO | null = null
	let receiptItems: ReceiptItemDTO[] = []
	let items: ItemDTO[] = []
	let itemMap = new Map<number, string>()

	function updateSummary() {
		if (!receiptTotal) return
		receiptTotal.textContent = receipt
			? currencyFormatter.format(receipt.amount)
			: "$0"
	}

	function renderItemOptions() {
		if (!itemSelect) return
		if (items.length === 0) {
			itemSelect.innerHTML = '<option value="">No items available</option>'
			itemSelect.disabled = true
			return
		}
		const options = items
			.map((item) => `<option value="${item.id}">${item.name}</option>`)
			.join("")
		itemSelect.innerHTML = options
		itemSelect.disabled = false
	}

	function renderReceiptItems() {
		if (!itemsRows) return
		if (receiptItems.length === 0) {
			itemsRows.innerHTML =
				'<p class="receipt-detail-empty">No items attached yet.</p>'
			return
		}
		const rows = receiptItems
			.map((receiptItem) => {
				const name =
					itemMap.get(receiptItem.item_id) ?? `Item #${receiptItem.item_id}`
				return `
					<div class="receipt-detail-row">
						<div class="receipt-detail-item">${name}</div>
						<div class="receipt-detail-actions">
							<button
								type="button"
								data-action="delete-receipt-item"
								data-id="${receiptItem.id}"
							>
								Remove
							</button>
						</div>
					</div>
				`
			})
			.join("")
		itemsRows.innerHTML = rows
	}

	function updateView() {
		updateSummary()
		renderItemOptions()
		renderReceiptItems()
	}

	async function loadReceipt() {
		const response = await fetch(`/api/receipts/${receiptId}`, {
			credentials: "include",
		})
		if (!response.ok) {
			throw new Error("Failed to load receipt")
		}
		receipt = (await response.json()) as ReceiptDTO
	}

	async function loadItems() {
		const response = await fetch("/api/items", { credentials: "include" })
		if (!response.ok) {
			throw new Error("Failed to load items")
		}
		items = (await response.json()) as ItemDTO[]
		itemMap = new Map(items.map((item) => [item.id, item.name]))
	}

	async function loadReceiptItems() {
		const url = new URL("/api/receipt-items", window.location.origin)
		url.searchParams.set("receiptId", String(receiptId))
		const response = await fetch(url.toString(), { credentials: "include" })
		if (!response.ok) {
			throw new Error("Failed to load receipt items")
		}
		receiptItems = (await response.json()) as ReceiptItemDTO[]
	}

	itemForm?.addEventListener("submit", async (event) => {
		event.preventDefault()
		if (!itemSelect) return
		if (itemError) itemError.textContent = ""
		const itemId = Number(itemSelect.value)
		if (!Number.isInteger(itemId) || itemId <= 0) {
			if (itemError) itemError.textContent = "Select an item"
			return
		}
		try {
			const response = await fetch("/api/receipt-items", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ receiptId, itemId }),
			})
			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as
					| { error?: string }
					| null
				if (itemError) {
					itemError.textContent =
						payload?.error ?? "Unable to add item"
				}
				return
			}
			const json = await response.json().catch(() => null)
			if (json && typeof json.id === "number") {
				receiptItems = [
					{ id: Number(json.id), receipt_id: receiptId, item_id: itemId },
					...receiptItems,
				]
				updateView()
			} else {
				await loadReceiptItems()
				updateView()
			}
			itemForm.reset()
		} catch (error) {
			console.error("Failed to add receipt item", error)
			if (itemError) itemError.textContent = "Unable to add item"
		}
	})

	itemsRows?.addEventListener("click", async (event) => {
		const target = event.target as HTMLElement
		const button = target.closest<HTMLButtonElement>(
			"[data-action='delete-receipt-item']",
		)
		if (!button) return
		const id = Number(button.dataset.id)
		if (!Number.isInteger(id)) return
		try {
			const response = await fetch(`/api/receipt-items/${id}`, {
				method: "DELETE",
				credentials: "include",
			})
			if (!response.ok) {
				alert("Unable to remove item")
				return
			}
			receiptItems = receiptItems.filter((item) => item.id !== id)
			updateView()
		} catch (error) {
			console.error("Failed to remove receipt item", error)
			alert("Unable to remove item")
		}
	})

	try {
		await Promise.all([loadReceipt(), loadItems(), loadReceiptItems()])
		updateView()
	} catch (error) {
		console.error("Failed to load receipt detail page data", error)
		if (itemsRows) {
			itemsRows.innerHTML =
				'<p class="receipt-detail-empty">Unable to load receipt data.</p>'
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
