import { bindNavbarHandlers, renderNavbar } from "./nav"

type ContainerDTO = {
	id: number
	name: string
	description?: string | null
}

type ItemDTO = {
	id: number
	name: string
	description?: string | null
	barcode?: string | null
	cost?: number | null
	container_id: number
}

const currencyFormatter = new Intl.NumberFormat(undefined, {
	style: "currency",
	currency: "USD",
})

export async function renderItemsPage() {
	const body = ensureBody()

	body.innerHTML = `
		<div class="app-frame">
			${renderNavbar("items")}
			<main class="items-page">
				<header class="items-header">
					<div>
						<p class="items-title">Inventory</p>
						<h1>Manage your items</h1>
					</div>
					<div class="items-summary">
						<span>Total items</span>
						<strong id="items-total">0</strong>
						<span id="items-note">All containers</span>
					</div>
				</header>
				<section class="items-controls">
					<label>
						<span>Container</span>
						<select id="items-container-filter">
							<option value="">All containers</option>
						</select>
					</label>
					<label>
						<span>Search</span>
						<input
							id="items-search"
							type="search"
							placeholder="Search items"
						/>
					</label>
				</section>
				<section class="items-panels">
					<form class="items-panel" id="container-form">
						<header>
							<h2>Create container</h2>
							<p>Organize items by storage location.</p>
						</header>
						<label>
							<span>Name</span>
							<input id="container-name" name="name" type="text" required />
						</label>
						<label>
							<span>Description</span>
							<input id="container-description" name="description" type="text" />
						</label>
						<p class="items-panel-error" id="container-error" aria-live="polite"></p>
						<button type="submit">Add container</button>
					</form>
					<form class="items-panel" id="item-form">
						<header>
							<h2>Add item</h2>
							<p>Track cost, barcode, and notes.</p>
						</header>
						<label>
							<span>Name</span>
							<input id="item-name" name="name" type="text" required />
						</label>
						<label>
							<span>Container</span>
							<select id="item-container" name="containerId" required></select>
						</label>
						<label>
							<span>Description</span>
							<input id="item-description" name="description" type="text" />
						</label>
						<label>
							<span>Barcode</span>
							<input id="item-barcode" name="barcode" type="text" />
						</label>
						<label>
							<span>Cost</span>
							<input id="item-cost" name="cost" type="number" step="0.01" />
						</label>
						<p class="items-panel-error" id="item-error" aria-live="polite"></p>
						<button type="submit">Add item</button>
					</form>
				</section>
				<section class="items-list">
					<div class="items-list-header">
						<span>Item</span>
						<span>Container</span>
						<span>Details</span>
						<span></span>
					</div>
					<div class="items-rows" id="items-rows">
						<p class="items-empty">Loading items…</p>
					</div>
				</section>
			</main>
		</div>
	`

	bindNavbarHandlers(body)

	const containerFilter = body.querySelector<HTMLSelectElement>(
		"#items-container-filter",
	)
	const searchInput = body.querySelector<HTMLInputElement>("#items-search")
	const containerForm = body.querySelector<HTMLFormElement>("#container-form")
	const containerNameInput = body.querySelector<HTMLInputElement>("#container-name")
	const containerDescriptionInput = body.querySelector<HTMLInputElement>(
		"#container-description",
	)
	const containerError = body.querySelector<HTMLParagraphElement>(
		"#container-error",
	)
	const itemForm = body.querySelector<HTMLFormElement>("#item-form")
	const itemNameInput = body.querySelector<HTMLInputElement>("#item-name")
	const itemContainerSelect =
		body.querySelector<HTMLSelectElement>("#item-container")
	const itemDescriptionInput =
		body.querySelector<HTMLInputElement>("#item-description")
	const itemBarcodeInput = body.querySelector<HTMLInputElement>("#item-barcode")
	const itemCostInput = body.querySelector<HTMLInputElement>("#item-cost")
	const itemError = body.querySelector<HTMLParagraphElement>("#item-error")
	const itemsRows = body.querySelector<HTMLDivElement>("#items-rows")
	const itemsTotal = body.querySelector<HTMLSpanElement>("#items-total")
	const itemsNote = body.querySelector<HTMLSpanElement>("#items-note")

	const state = {
		containerId: null as number | null,
		searchTerm: "",
	}

	let containers: ContainerDTO[] = []
	let items: ItemDTO[] = []
	let containerMap = new Map<number, string>()

	function updateFilterOptions() {
		if (!containerFilter || !itemContainerSelect) return
		const options = [
			'<option value="">All containers</option>',
			...containers.map(
				(container) =>
					`<option value="${container.id}">${container.name}</option>`,
			),
		]
		containerFilter.innerHTML = options.join("")

		const itemOptions = containers.map(
			(container) =>
				`<option value="${container.id}">${container.name}</option>`,
		)
		itemContainerSelect.innerHTML = itemOptions.join("")
		itemContainerSelect.disabled = containers.length === 0
		if (containers.length === 0) {
			itemContainerSelect.innerHTML =
				'<option value="">Create a container first</option>'
		}
	}

	function updateSummary(filtered: ItemDTO[]) {
		if (!itemsTotal || !itemsNote) return
		itemsTotal.textContent = `${filtered.length}`
		const containerLabel = state.containerId
			? containerMap.get(state.containerId) ?? "Selected container"
			: "All containers"
		itemsNote.textContent = `${containerLabel} • ${filtered.length} item${
			filtered.length === 1 ? "" : "s"
		}`
	}

	function renderItemsList(filtered: ItemDTO[]) {
		if (!itemsRows) return
		if (filtered.length === 0) {
			itemsRows.innerHTML =
				'<p class="items-empty">No items match your filters.</p>'
			return
		}
		const rows = filtered
			.map((item) => {
				const containerName =
					containerMap.get(item.container_id) ?? "Unknown container"
				const description = item.description
					? `<div class="items-description">${item.description}</div>`
					: ""
				const cost =
					typeof item.cost === "number"
						? currencyFormatter.format(item.cost)
						: null
				const details = [
					item.barcode ? `Barcode: ${item.barcode}` : null,
					cost ? `Cost: ${cost}` : null,
				].filter(Boolean)
				return `
					<div class="items-row">
						<div>
							<div class="items-name">${item.name}</div>
							${description}
						</div>
						<div class="items-container">${containerName}</div>
						<div class="items-details">
							${details.length > 0 ? details.join(" • ") : "—"}
						</div>
						<div class="items-actions">
							<button type="button" data-action="delete-item" data-id="${item.id}">
								Delete
							</button>
						</div>
					</div>
				`
			})
			.join("")
		itemsRows.innerHTML = rows
	}

	function updateView() {
		const term = state.searchTerm.trim().toLowerCase()
		const filtered = items.filter((item) =>
			term ? item.name.toLowerCase().includes(term) : true,
		)
		updateSummary(filtered)
		renderItemsList(filtered)
	}

	async function refreshItems() {
		try {
			const loaded = await fetchItems(state.containerId)
			items = loaded
			updateView()
		} catch (error) {
			console.error("Failed to load items", error)
			if (itemsRows) {
				itemsRows.innerHTML =
					'<p class="items-empty">Unable to load items right now.</p>'
			}
		}
	}

	containerFilter?.addEventListener("change", () => {
		const value = containerFilter.value
		state.containerId = value ? Number(value) : null
		void refreshItems()
	})

	searchInput?.addEventListener("input", () => {
		state.searchTerm = searchInput.value
		updateView()
	})

	containerForm?.addEventListener("submit", async (event) => {
		event.preventDefault()
		if (!containerNameInput) return
		if (containerError) containerError.textContent = ""
		const name = containerNameInput.value.trim()
		const description = containerDescriptionInput?.value.trim() ?? ""
		if (!name) {
			if (containerError) containerError.textContent = "Enter a name"
			return
		}
		try {
			const response = await fetch("/api/containers", {
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
				if (containerError) {
					containerError.textContent =
						payload?.error ?? "Unable to create container"
				}
				return
			}
			containerForm.reset()
			await loadContainers()
			updateFilterOptions()
			await refreshItems()
		} catch (error) {
			console.error("Failed to create container", error)
			if (containerError) {
				containerError.textContent = "Unable to create container"
			}
		}
	})

	itemForm?.addEventListener("submit", async (event) => {
		event.preventDefault()
		if (!itemNameInput || !itemContainerSelect) return
		if (itemError) itemError.textContent = ""
		const name = itemNameInput.value.trim()
		const containerId = Number(itemContainerSelect.value)
		if (!name) {
			if (itemError) itemError.textContent = "Enter a name"
			return
		}
		if (!Number.isInteger(containerId) || containerId <= 0) {
			if (itemError) itemError.textContent = "Select a container"
			return
		}
		const description = itemDescriptionInput?.value.trim() ?? ""
		const barcode = itemBarcodeInput?.value.trim() ?? ""
		const costValue = itemCostInput?.value.trim() ?? ""
		const cost = costValue ? Number(costValue) : null
		if (costValue && Number.isNaN(cost)) {
			if (itemError) itemError.textContent = "Enter a valid cost"
			return
		}
		try {
			const response = await fetch("/api/items", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					name,
					containerId,
					description: description || undefined,
					barcode: barcode || undefined,
					cost: costValue ? cost : undefined,
				}),
			})
			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as
					| { error?: string }
					| null
				if (itemError) {
					itemError.textContent = payload?.error ?? "Unable to create item"
				}
				return
			}
			itemForm.reset()
			await refreshItems()
		} catch (error) {
			console.error("Failed to create item", error)
			if (itemError) {
				itemError.textContent = "Unable to create item"
			}
		}
	})

	itemsRows?.addEventListener("click", async (event) => {
		const target = event.target as HTMLElement
		const button = target.closest<HTMLButtonElement>(
			"[data-action='delete-item']",
		)
		if (!button) return
		const id = Number(button.dataset.id)
		if (!Number.isInteger(id)) return
		try {
			const response = await fetch(`/api/items/${id}`, {
				method: "DELETE",
				credentials: "include",
			})
			if (!response.ok) {
				alert("Unable to delete item")
				return
			}
			items = items.filter((item) => item.id !== id)
			updateView()
		} catch (error) {
			console.error("Failed to delete item", error)
			alert("Unable to delete item")
		}
	})

	async function loadContainers() {
		const response = await fetch("/api/containers", { credentials: "include" })
		if (!response.ok) {
			throw new Error("Failed to load containers")
		}
		containers = (await response.json()) as ContainerDTO[]
		containerMap = new Map(containers.map((container) => [container.id, container.name]))
	}

	try {
		await loadContainers()
		updateFilterOptions()
		await refreshItems()
	} catch (error) {
		console.error("Failed to load items page data", error)
		if (itemsRows) {
			itemsRows.innerHTML =
				'<p class="items-empty">Unable to load items right now.</p>'
		}
		if (itemsTotal) {
			itemsTotal.textContent = "0"
		}
		if (itemsNote) {
			itemsNote.textContent = "An error occurred"
		}
	}
}

async function fetchItems(containerId: number | null) {
	const url = new URL("/api/items", window.location.origin)
	if (containerId) {
		url.searchParams.set("containerId", String(containerId))
	}
	const response = await fetch(url.toString(), { credentials: "include" })
	if (!response.ok) {
		throw new Error("Failed to load items")
	}
	return (await response.json()) as ItemDTO[]
}

function ensureBody() {
	const body = document.querySelector("body")
	if (!body) {
		throw new Error("No body element found")
	}
	return body
}
