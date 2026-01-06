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
						<span id="items-note">Select a container</span>
					</div>
				</header>
				<section class="items-layout">
					<aside class="items-sidebar">
						<div class="items-section-header">
							<h2>Containers</h2>
							<p>Choose where you store items.</p>
						</div>
						<div class="items-containers" id="items-containers">
							<p class="items-empty">Loading containers…</p>
						</div>
						<form class="items-panel" id="container-form">
							<header>
								<h3>Create container</h3>
								<p>Add a new storage location.</p>
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
					</aside>
					<section class="items-content">
						<div class="items-content-header">
							<div>
								<p class="items-subtitle" id="items-container-title">Container</p>
								<h2 id="items-container-name">Select a container</h2>
							</div>
							<div class="items-search">
								<input
									id="items-search"
									type="search"
									placeholder="Search items"
								/>
							</div>
						</div>
						<form class="items-panel" id="item-form">
							<header>
								<h3>Add item</h3>
								<p>Save details for the selected container.</p>
							</header>
							<label>
								<span>Name</span>
								<input id="item-name" name="name" type="text" required />
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
						<section class="items-list">
							<div class="items-list-header">
								<span>Item</span>
								<span>Details</span>
								<span></span>
							</div>
							<div class="items-rows" id="items-rows">
								<p class="items-empty">Select a container to view items.</p>
							</div>
						</section>
					</section>
				</section>
			</main>
		</div>
	`

	bindNavbarHandlers(body)

	const containersList = body.querySelector<HTMLDivElement>("#items-containers")
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
	const itemDescriptionInput = body.querySelector<HTMLInputElement>(
		"#item-description",
	)
	const itemBarcodeInput = body.querySelector<HTMLInputElement>("#item-barcode")
	const itemCostInput = body.querySelector<HTMLInputElement>("#item-cost")
	const itemError = body.querySelector<HTMLParagraphElement>("#item-error")
	const itemsRows = body.querySelector<HTMLDivElement>("#items-rows")
	const itemsTotal = body.querySelector<HTMLSpanElement>("#items-total")
	const itemsNote = body.querySelector<HTMLSpanElement>("#items-note")
	const itemsContainerTitle = body.querySelector<HTMLParagraphElement>(
		"#items-container-title",
	)
	const itemsContainerName = body.querySelector<HTMLHeadingElement>(
		"#items-container-name",
	)
	const searchInput = body.querySelector<HTMLInputElement>("#items-search")

	const state = {
		containerId: null as number | null,
		searchTerm: "",
	}

	let containers: ContainerDTO[] = []
	let items: ItemDTO[] = []
	let containerMap = new Map<number, string>()

	const itemFormInputs = [
		itemNameInput,
		itemDescriptionInput,
		itemBarcodeInput,
		itemCostInput,
	]

	function setItemFormEnabled(enabled: boolean) {
		itemFormInputs.forEach((input) => {
			if (input) input.disabled = !enabled
		})
		const button = itemForm?.querySelector<HTMLButtonElement>("button[type='submit']")
		if (button) button.disabled = !enabled
	}

	function updateContainerHeader() {
		const label = state.containerId
			? containerMap.get(state.containerId) ?? "Selected container"
			: "Select a container"
		if (itemsContainerTitle) {
			itemsContainerTitle.textContent = state.containerId ? "Container" : "No container"
		}
		if (itemsContainerName) {
			itemsContainerName.textContent = label
		}
		setItemFormEnabled(!!state.containerId)
	}

	function renderContainers() {
		if (!containersList) return
		if (containers.length === 0) {
			containersList.innerHTML =
				'<p class="items-empty">No containers yet. Create one below.</p>'
			return
		}
		const rows = containers
			.map((container) => {
				const isActive = container.id === state.containerId
				const description = container.description
					? `<div class="items-container-description">${container.description}</div>`
					: ""
				return `
					<button
						type="button"
						class="items-container-card${isActive ? " is-active" : ""}"
						data-id="${container.id}"
					>
						<div class="items-container-name">${container.name}</div>
						${description}
					</button>
				`
			})
			.join("")
		containersList.innerHTML = rows
	}

	function updateSummary(filtered: ItemDTO[]) {
		if (!itemsTotal || !itemsNote) return
		itemsTotal.textContent = `${filtered.length}`
		const containerLabel = state.containerId
			? containerMap.get(state.containerId) ?? "Selected container"
			: "No container"
		itemsNote.textContent = `${containerLabel} • ${filtered.length} item${
			filtered.length === 1 ? "" : "s"
		}`
	}

	function renderItemsList(filtered: ItemDTO[]) {
		if (!itemsRows) return
		if (!state.containerId) {
			itemsRows.innerHTML =
				'<p class="items-empty">Select a container to view items.</p>'
			return
		}
		if (filtered.length === 0) {
			itemsRows.innerHTML =
				'<p class="items-empty">No items in this container yet.</p>'
			return
		}
		const rows = filtered
			.map((item) => {
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
		if (!state.containerId) {
			items = []
			updateView()
			return
		}
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

	function setSelectedContainer(containerId: number | null) {
		state.containerId = containerId
		updateContainerHeader()
		renderContainers()
		void refreshItems()
	}

	containersList?.addEventListener("click", (event) => {
		const target = event.target as HTMLElement
		const button = target.closest<HTMLButtonElement>(".items-container-card")
		if (!button) return
		const id = Number(button.dataset.id)
		if (!Number.isInteger(id)) return
		setSelectedContainer(id)
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
			const json = await response.json().catch(() => null)
			const createdId =
				json && typeof json.id === "number" ? Number(json.id) : null
			containerForm.reset()
			await loadContainers(createdId)
			updateContainerHeader()
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
		if (!itemNameInput) return
		if (itemError) itemError.textContent = ""
		const name = itemNameInput.value.trim()
		const containerId = state.containerId
		if (!containerId) {
			if (itemError) itemError.textContent = "Select a container first"
			return
		}
		if (!name) {
			if (itemError) itemError.textContent = "Enter a name"
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

	async function loadContainers(preferredId: number | null = null) {
		const response = await fetch("/api/containers", { credentials: "include" })
		if (!response.ok) {
			throw new Error("Failed to load containers")
		}
		containers = (await response.json()) as ContainerDTO[]
		containerMap = new Map(containers.map((container) => [container.id, container.name]))
		const availableIds = new Set(containers.map((container) => container.id))
		if (preferredId && availableIds.has(preferredId)) {
			state.containerId = preferredId
		} else if (state.containerId && availableIds.has(state.containerId)) {
			state.containerId = state.containerId
		} else {
			state.containerId = containers[0]?.id ?? null
		}
		renderContainers()
	}

	try {
		await loadContainers(null)
		updateContainerHeader()
		await refreshItems()
	} catch (error) {
		console.error("Failed to load items page data", error)
		if (containersList) {
			containersList.innerHTML =
				'<p class="items-empty">Unable to load containers right now.</p>'
		}
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
		setItemFormEnabled(false)
	}
}

async function fetchItems(containerId: number) {
	const url = new URL("/api/items", window.location.origin)
	url.searchParams.set("containerId", String(containerId))
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
