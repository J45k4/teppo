import { bindNavbarHandlers, renderNavbar } from "./nav"
import { navigate } from "./router"
import { createModal } from "./modal"

const currencyFormatter = new Intl.NumberFormat(undefined, {
	style: "currency",
	currency: "USD",
})

type ItemDTO = {
	id: number
	name: string
	description?: string | null
	barcode?: string | null
	cost?: number | null
	container_id: number
	image_path?: string | null
}

type ContainerDTO = {
	id: number
	name: string
	description?: string | null
}

export async function renderItemDetailPage(itemIdParam: string | undefined) {
	const body = ensureBody()
	const itemId = Number(itemIdParam)
	if (!Number.isInteger(itemId) || itemId <= 0) {
		navigate("/items")
		return
	}

	body.innerHTML = `
		<div class="app-frame">
			${renderNavbar("items")}
			<main class="item-detail-page">
				<header class="item-detail-header">
					<div>
						<p class="item-detail-title">Item</p>
						<h1 id="item-detail-name">Loading item…</h1>
						<p class="item-detail-container" id="item-detail-container"></p>
					</div>
					<div class="item-detail-actions">
						<button type="button" id="item-detail-back">Back to items</button>
						<button type="button" id="item-detail-upload">Change photo</button>
					</div>
				</header>
				<section class="item-detail-card">
					<div class="item-detail-image" id="item-detail-image"></div>
					<div class="item-detail-info" id="item-detail-info"></div>
				</section>
			</main>
		</div>
		<div class="modal-backdrop" id="item-image-modal" aria-hidden="true">
			<div class="item-image-modal">
				<button type="button" id="item-image-close">Close</button>
				<img alt="Item photo" id="item-image-full" />
			</div>
		</div>
	`

	bindNavbarHandlers(body)

	const nameEl = body.querySelector<HTMLHeadingElement>("#item-detail-name")
	const containerEl = body.querySelector<HTMLParagraphElement>(
		"#item-detail-container",
	)
	const imageEl = body.querySelector<HTMLDivElement>("#item-detail-image")
	const infoEl = body.querySelector<HTMLDivElement>("#item-detail-info")
	const backButton = body.querySelector<HTMLButtonElement>("#item-detail-back")
	const uploadButton = body.querySelector<HTMLButtonElement>("#item-detail-upload")
	const imageModalBackdrop = body.querySelector<HTMLDivElement>(
		"#item-image-modal",
	)
	const imageModalClose = body.querySelector<HTMLButtonElement>(
		"#item-image-close",
	)
	const imageModalImage = body.querySelector<HTMLImageElement>(
		"#item-image-full",
	)

	const imageModal = createModal({
		backdrop: imageModalBackdrop,
		onClose: () => {
			if (imageModalImage) imageModalImage.src = ""
		},
	})

	backButton?.addEventListener("click", () => navigate("/items"))
	uploadButton?.addEventListener("click", () => promptItemImageUpload(itemId))
	imageModalClose?.addEventListener("click", () => imageModal.close())

	try {
		const item = await fetchItem(itemId)
		const container = await fetchContainer(item.container_id)
		const containerName = container?.name ?? `Container #${item.container_id}`
		if (nameEl) nameEl.textContent = item.name
		if (containerEl) containerEl.textContent = containerName
		if (imageEl) {
			if (item.image_path) {
				imageEl.innerHTML = `<img src="/api/items/${item.id}/image" alt="${item.name}" />`
				const image = imageEl.querySelector<HTMLImageElement>("img")
				image?.addEventListener("click", () => {
					if (imageModalImage) {
						imageModalImage.src = `/api/items/${item.id}/image`
						imageModalImage.alt = item.name
					}
					imageModal.open()
				})
			} else {
				imageEl.innerHTML = `<div class="item-detail-placeholder">No photo</div>`
			}
		}
		if (infoEl) {
			const costLabel =
				typeof item.cost === "number"
					? currencyFormatter.format(item.cost)
					: "—"
			const barcodeLabel = item.barcode ? item.barcode : "—"
			const descriptionLabel = item.description ? item.description : "—"
			infoEl.innerHTML = `
				<div class="item-detail-field">
					<span>Barcode</span>
					<strong>${barcodeLabel}</strong>
				</div>
				<div class="item-detail-field">
					<span>Cost</span>
					<strong>${costLabel}</strong>
				</div>
				<div class="item-detail-field item-detail-field--full">
					<span>Description</span>
					<strong>${descriptionLabel}</strong>
				</div>
			`
		}
	} catch (error) {
		console.error("Failed to load item", error)
		if (nameEl) nameEl.textContent = "Unable to load item"
		if (infoEl) {
			infoEl.innerHTML =
				"<p class=\"item-detail-error\">Unable to load item details.</p>"
		}
	}

	async function uploadItemImage(file: File) {
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

	function promptItemImageUpload(targetId: number) {
		const input = document.createElement("input")
		input.type = "file"
		input.accept = "image/*"
		input.addEventListener("change", async () => {
			const file = input.files?.[0]
			if (!file) return
			try {
				await uploadItemImage(file)
				const item = await fetchItem(targetId)
				if (imageEl) {
					if (item.image_path) {
						imageEl.innerHTML = `<img src="/api/items/${item.id}/image" alt="${item.name}" />`
						const image = imageEl.querySelector<HTMLImageElement>("img")
						image?.addEventListener("click", () => {
							if (imageModalImage) {
								imageModalImage.src = `/api/items/${item.id}/image`
								imageModalImage.alt = item.name
							}
							imageModal.open()
						})
					} else {
						imageEl.innerHTML = `<div class="item-detail-placeholder">No photo</div>`
					}
				}
			} catch (uploadError) {
				console.error("Failed to upload item image", uploadError)
				alert(
					uploadError instanceof Error
						? uploadError.message
						: "Unable to upload image",
				)
			}
		})
		input.click()
	}
}

async function fetchItem(itemId: number): Promise<ItemDTO> {
	const response = await fetch(`/api/items/${itemId}`, { credentials: "include" })
	if (!response.ok) {
		throw new Error("Failed to load item")
	}
	return (await response.json()) as ItemDTO
}

async function fetchContainer(containerId: number): Promise<ContainerDTO | null> {
	const response = await fetch(`/api/containers/${containerId}`, {
		credentials: "include",
	})
	if (response.status === 404) return null
	if (!response.ok) {
		throw new Error("Failed to load container")
	}
	return (await response.json()) as ContainerDTO
}

function ensureBody() {
	const body = document.querySelector("body")
	if (!body) {
		throw new Error("No body element found")
	}
	return body
}
