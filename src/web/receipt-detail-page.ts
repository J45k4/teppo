import { createModal } from "./modal"
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
	barcode?: string | null
	container_id: number
}

type ContainerDTO = {
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
					<div class="receipt-detail-panel">
						<header>
							<h2>Scan items</h2>
							<p>Use a barcode scanner to add items quickly.</p>
						</header>
						<button type="button" id="open-scanner-modal">Scanner</button>
					</div>
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
		<div class="modal-backdrop" id="scanner-modal" aria-hidden="true">
			<form class="modal" id="receipt-barcode-form">
				<p class="items-title">Scanner</p>
				<label>
					<span>Barcode</span>
					<input
						id="receipt-barcode-input"
						name="barcode"
						type="text"
						placeholder="Scan barcode"
						autocomplete="off"
					/>
				</label>
				<p class="modal-error" id="receipt-barcode-error" aria-live="polite"></p>
				<div class="modal-actions">
					<button type="button" id="receipt-barcode-cancel">Close</button>
					<button type="submit">Add item</button>
				</div>
			</form>
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
	const scannerOpenButton = body.querySelector<HTMLButtonElement>(
		"#open-scanner-modal",
	)
	const scannerModalBackdrop =
		body.querySelector<HTMLDivElement>("#scanner-modal")
	const barcodeForm =
		body.querySelector<HTMLFormElement>("#receipt-barcode-form")
	const barcodeInput = body.querySelector<HTMLInputElement>(
		"#receipt-barcode-input",
	)
	const barcodeError = body.querySelector<HTMLParagraphElement>(
		"#receipt-barcode-error",
	)
	const barcodeCancel = body.querySelector<HTMLButtonElement>(
		"#receipt-barcode-cancel",
	)
	const scannerModal = createModal({
		backdrop: scannerModalBackdrop,
		focusTarget: barcodeInput,
		onOpen: () => {
			if (barcodeError) barcodeError.textContent = ""
		},
		onClose: () => {
			barcodeForm?.reset()
			if (barcodeError) barcodeError.textContent = ""
		},
	})

	scannerOpenButton?.addEventListener("click", () => {
		scannerModal.open()
	})

	barcodeCancel?.addEventListener("click", () => {
		scannerModal.close()
	})

	backButton?.addEventListener("click", () => {
		navigate("/receipts")
	})

	let receipt: ReceiptDTO | null = null
	let receiptItems: ReceiptItemDTO[] = []
	let items: ItemDTO[] = []
	let containers: ContainerDTO[] = []
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

	async function loadContainers() {
		const response = await fetch("/api/containers", {
			credentials: "include",
		})
		if (!response.ok) {
			throw new Error("Failed to load containers")
		}
		containers = (await response.json()) as ContainerDTO[]
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

	async function addReceiptItemById(
		itemId: number,
		errorTarget: HTMLParagraphElement | null,
		resetTarget?: HTMLFormElement,
	) {
		if (errorTarget) errorTarget.textContent = ""
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
				if (errorTarget) {
					errorTarget.textContent =
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
			resetTarget?.reset()
		} catch (error) {
			console.error("Failed to add receipt item", error)
			if (errorTarget) errorTarget.textContent = "Unable to add item"
		}
	}

	async function createContainerForScan(name: string) {
		const response = await fetch("/api/containers", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ name }),
		})
		if (!response.ok) {
			throw new Error("Unable to create container")
		}
		const json = (await response.json().catch(() => null)) as
			| { id?: number }
			| null
		if (!json || typeof json.id !== "number") {
			throw new Error("Unable to create container")
		}
		const id = Number(json.id)
		containers = [{ id, name, description: null }, ...containers]
		return id
	}

	async function createItemFromBarcode(
		name: string,
		containerId: number,
		barcode: string,
	) {
		const response = await fetch("/api/items", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({
				name,
				containerId,
				barcode,
			}),
		})
		if (!response.ok) {
			const payload = (await response.json().catch(() => null)) as
				| { error?: string }
				| null
			throw new Error(payload?.error ?? "Unable to create item")
		}
		const json = (await response.json().catch(() => null)) as
			| { id?: number }
			| null
		if (!json || typeof json.id !== "number") {
			throw new Error("Unable to create item")
		}
		const id = Number(json.id)
		const newItem: ItemDTO = {
			id,
			name,
			description: null,
			barcode,
			container_id: containerId,
		}
		items = [newItem, ...items]
		itemMap.set(id, name)
		renderItemOptions()
		return id
	}

	itemForm?.addEventListener("submit", async (event) => {
		event.preventDefault()
		if (!itemSelect) return
		const itemId = Number(itemSelect.value)
		if (!Number.isInteger(itemId) || itemId <= 0) {
			if (itemError) itemError.textContent = "Select an item"
			return
		}
		await addReceiptItemById(itemId, itemError, itemForm)
	})

	barcodeForm?.addEventListener("submit", async (event) => {
		event.preventDefault()
		if (barcodeError) barcodeError.textContent = ""
		const barcode = barcodeInput?.value.trim() ?? ""
		if (!barcode) {
			if (barcodeError) barcodeError.textContent = "Scan a barcode"
			return
		}
		try {
			let containerId = containers[0]?.id
			if (!containerId) {
				containerId = await createContainerForScan("Scanned items")
			}
			const name = `Barcode ${barcode}`
			const newItemId = await createItemFromBarcode(
				name,
				containerId,
				barcode,
			)
			if (itemSelect) itemSelect.value = String(newItemId)
			await addReceiptItemById(newItemId, barcodeError, barcodeForm)
			barcodeInput?.focus()
		} catch (error) {
			console.error("Failed to add scanned item", error)
			if (barcodeError) {
				barcodeError.textContent =
					error instanceof Error ? error.message : "Unable to add item"
			}
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
		await Promise.all([
			loadReceipt(),
			loadItems(),
			loadContainers(),
			loadReceiptItems(),
		])
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
