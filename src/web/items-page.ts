import { createModal } from "./modal"
import { bindNavbarHandlers, renderNavbar } from "./nav"
import { navigate } from "./router"

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
	image_path?: string | null
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
						<div class="items-panel">
							<header>
								<h3>Create container</h3>
								<p>Add a new storage location.</p>
							</header>
							<button type="button" id="open-container-modal">Add container</button>
						</div>
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
						<div class="items-panel">
							<header>
								<h3>Add item</h3>
								<p>Save details for the selected container.</p>
							</header>
							<button type="button" id="open-item-modal">Add item</button>
						</div>
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
		<div class="modal-backdrop" id="container-modal" aria-hidden="true">
			<form class="modal" id="container-form">
				<p class="items-title">Create container</p>
				<label>
					<span>Name</span>
					<input id="container-name" name="name" type="text" required />
				</label>
				<label>
					<span>Description</span>
					<input id="container-description" name="description" type="text" />
				</label>
				<p class="modal-error" id="container-error" aria-live="polite"></p>
				<div class="modal-actions">
					<button type="button" id="container-cancel">Cancel</button>
					<button type="submit">Add container</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop" id="item-modal" aria-hidden="true">
			<form class="modal" id="item-form">
				<p class="items-title">Add item</p>
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
				<label>
					<span>Photo</span>
					<input id="item-image" name="image" type="file" accept="image/*" />
				</label>
				<p class="modal-error" id="item-error" aria-live="polite"></p>
				<div class="modal-actions">
					<button type="button" id="item-cancel">Cancel</button>
					<button type="submit">Add item</button>
				</div>
			</form>
		</div>
	`

	bindNavbarHandlers(body)

	const containersList = body.querySelector<HTMLDivElement>("#items-containers")
	const openContainerModalButton = body.querySelector<HTMLButtonElement>(
		"#open-container-modal",
	)
	const openItemModalButton =
		body.querySelector<HTMLButtonElement>("#open-item-modal")
	const containerModalBackdrop =
		body.querySelector<HTMLDivElement>("#container-modal")
	const containerForm = body.querySelector<HTMLFormElement>("#container-form")
	const containerNameInput = body.querySelector<HTMLInputElement>("#container-name")
	const containerDescriptionInput = body.querySelector<HTMLInputElement>(
		"#container-description",
	)
	const containerError = body.querySelector<HTMLParagraphElement>(
		"#container-error",
	)
	const containerCancel = body.querySelector<HTMLButtonElement>("#container-cancel")
	const itemModalBackdrop = body.querySelector<HTMLDivElement>("#item-modal")
	const itemForm = body.querySelector<HTMLFormElement>("#item-form")
	const itemNameInput = body.querySelector<HTMLInputElement>("#item-name")
	const itemDescriptionInput = body.querySelector<HTMLInputElement>(
		"#item-description",
	)
	const itemBarcodeInput = body.querySelector<HTMLInputElement>("#item-barcode")
	const itemCostInput = body.querySelector<HTMLInputElement>("#item-cost")
	const itemImageInput = body.querySelector<HTMLInputElement>("#item-image")
	const itemError = body.querySelector<HTMLParagraphElement>("#item-error")
	const itemCancel = body.querySelector<HTMLButtonElement>("#item-cancel")
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
		itemImageInput,
	]

	const containerModal = createModal({
		backdrop: containerModalBackdrop,
		focusTarget: containerNameInput,
		onOpen: () => {
			if (containerError) containerError.textContent = ""
		},
		onClose: () => {
			containerForm?.reset()
			if (containerError) containerError.textContent = ""
		},
	})

	const itemModal = createModal({
		backdrop: itemModalBackdrop,
		focusTarget: itemNameInput,
		onOpen: () => {
			if (itemError) itemError.textContent = ""
		},
		onClose: () => {
			itemForm?.reset()
			if (itemError) itemError.textContent = ""
		},
	})

	function setItemFormEnabled(enabled: boolean) {
		itemFormInputs.forEach((input) => {
			if (input) input.disabled = !enabled
		})
		if (openItemModalButton) openItemModalButton.disabled = !enabled
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
				const imageMarkup = item.image_path
					? `<img class="items-image" src="/api/items/${item.id}/image" alt="${item.name}" loading="lazy" />`
					: '<span class="items-image-placeholder">No photo</span>'

				return `
					<div class="items-row">
						<button
							type="button"
							class="items-main items-main-button"
							data-action="view-item"
							data-id="${item.id}"
						>
							<div class="items-image-wrapper">
								${imageMarkup}
							</div>
							<div>
								<div class="items-name">${item.name}</div>
								${description}
							</div>
						</button>
						<div class="items-details">
							${details.length > 0 ? details.join(" • ") : "—"}
						</div>
						<div class="items-actions">
							<button
								type="button"
								data-action="upload-image"
								data-id="${item.id}"
							>
								${item.image_path ? "Change photo" : "Add photo"}
							</button>
							<button
								type="button"
								data-action="delete-item"
								data-id="${item.id}"
							>
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

	openContainerModalButton?.addEventListener("click", () => {
		containerModal.open()
	})

	openItemModalButton?.addEventListener("click", () => {
		if (!state.containerId) return
		itemModal.open()
	})

	containerCancel?.addEventListener("click", () => {
		containerModal.close()
	})

	itemCancel?.addEventListener("click", () => {
		itemModal.close()
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
			containerModal.close()
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
		const imageFile = itemImageInput?.files?.[0] ?? null
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
			const json = await response.json().catch(() => null)
			const createdId =
				json && typeof json.id === "number" ? Number(json.id) : null
			if (!createdId) {
				if (itemError) {
					itemError.textContent = "Unable to create item"
				}
				return
			}
			if (imageFile) {
				try {
					await uploadItemImage(createdId, imageFile)
				} catch (uploadError) {
					console.error("Failed to upload item image", uploadError)
					const message =
						uploadError instanceof Error
							? uploadError.message
							: "Unable to upload image"
					if (itemError) {
						itemError.textContent = message
					}
					await refreshItems()
					return
				}
			}
			itemModal.close()
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
		const uploadButton = target.closest<HTMLButtonElement>(
			"[data-action='upload-image']",
		)
		if (uploadButton) {
			const id = Number(uploadButton.dataset.id)
			if (!Number.isInteger(id)) return
			promptItemImageUpload(id)
			return
		}
		const viewButton = target.closest<HTMLButtonElement>(
			"[data-action='view-item']",
		)
		if (viewButton) {
			const id = Number(viewButton.dataset.id)
			if (!Number.isInteger(id)) return
			navigate(`/items/${id}`)
			return
		}
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

	async function uploadItemImage(itemId: number, file: File) {
		const formData = new FormData()
		formData.append("image", file)
		const response = await fetch(`/api/items/${itemId}/image`, {
			method: "POST",
			credentials: "include",
			body: formData,
		})
		if (!response.ok) {
			const payload = (await response.json().catch(() => null)) as
				| { error?: string }
				| null
			const message = payload?.error ?? "Unable to upload image"
			throw new Error(message)
		}
	}

	function promptItemImageUpload(itemId: number) {
		const input = document.createElement("input")
		input.type = "file"
		input.accept = "image/*"
		input.addEventListener("change", async () => {
			const file = input.files?.[0]
			if (!file) return
			try {
				await uploadItemImage(itemId, file)
				await refreshItems()
			} catch (error) {
				console.error("Failed to upload item image", error)
				alert(error instanceof Error ? error.message : "Unable to upload image")
			}
		})
		input.click()
	}

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
