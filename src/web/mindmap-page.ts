import { bindNavbarHandlers, renderNavbar } from "./nav"
import { navigate } from "./router"

export function renderMindMapPage() {
	const body = ensureBody()

	body.innerHTML = `
		<div class="app-frame">
			${renderNavbar("home")}
			<main class="mindmap-page">
				<header class="mindmap-header">
					<div>
						<p class="mindmap-kicker">Mind map</p>
						<h1>Shape the next focus sprint</h1>
						<p class="mindmap-subtitle">
							Map the core areas of Teppo and keep the workflows connected.
						</p>
					</div>
					<div class="mindmap-actions">
						<button type="button" class="mindmap-primary">Add node</button>
						<button type="button" class="mindmap-secondary">Export view</button>
					</div>
				</header>
				<section class="mindmap-layout">
					<aside class="mindmap-panel">
						<h2>Core modules</h2>
						<p>These areas power the daily workflow.</p>
						<ul class="mindmap-list">
							<li>
								<span class="mindmap-dot" style="--dot: #f05a28"></span>
								<span class="mindmap-label">Receipts</span>
								<strong class="mindmap-count" data-count="receipts">0</strong>
							</li>
							<li>
								<span class="mindmap-dot" style="--dot: #f3b43f"></span>
								<span class="mindmap-label">Spreadsheets</span>
								<strong class="mindmap-count" data-count="spreadsheets">0</strong>
							</li>
							<li>
								<span class="mindmap-dot" style="--dot: #39a2ae"></span>
								<span class="mindmap-label">Items</span>
								<strong class="mindmap-count" data-count="items">0</strong>
							</li>
							<li>
								<span class="mindmap-dot" style="--dot: #6d7fdb"></span>
								<span class="mindmap-label">Todos</span>
								<strong class="mindmap-count" data-count="todos">0</strong>
							</li>
							<li>
								<span class="mindmap-dot" style="--dot: #9c6fdb"></span>
								<span class="mindmap-label">Time tracking</span>
								<strong class="mindmap-count" data-count="time">0</strong>
							</li>
							<li>
								<span class="mindmap-dot" style="--dot: #2e7d54"></span>
								<span class="mindmap-label">Projects</span>
								<strong class="mindmap-count" data-count="projects">0</strong>
							</li>
						</ul>
						<div class="mindmap-panel-note">
							<h3>Quick routes</h3>
							<p>Jump into any area from the nav or home.</p>
							<button type="button" data-action="open-receipts">
								Open receipts
							</button>
						</div>
					</aside>
					<div class="mindmap-canvas" data-role="mindmap-canvas">
						<div class="mindmap-stage" data-role="mindmap-stage">
							<svg
								class="mindmap-links"
								viewBox="0 0 800 520"
								preserveAspectRatio="none"
								aria-hidden="true"
							>
								<path d="M400 260 C320 210 250 190 170 160" />
								<path d="M400 260 C330 270 260 300 170 340" />
								<path d="M400 260 C460 200 520 170 630 150" />
								<path d="M400 260 C460 280 520 310 630 340" />
								<path d="M400 260 C380 330 350 380 300 440" />
								<path d="M400 260 C430 330 470 380 520 440" />
							</svg>
							<div class="mindmap-node is-root" data-x="50" data-y="50" style="--delay: 0s">
								<span>Teppo workspace</span>
								<small class="mindmap-meta" data-node-meta="root">
									Loading overview
								</small>
							</div>
							<div class="mindmap-node is-branch" data-node="receipts" data-x="22" data-y="30" style="--delay: 0.05s">
								<span>Receipts</span>
								<small class="mindmap-meta">Loading receipts</small>
							</div>
							<div class="mindmap-node is-branch" data-node="items" data-x="22" data-y="65" style="--delay: 0.1s">
								<span>Items</span>
								<small class="mindmap-meta">Loading items</small>
							</div>
							<div class="mindmap-node is-branch" data-node="spreadsheets" data-x="78" data-y="28" style="--delay: 0.15s">
								<span>Spreadsheets</span>
								<small class="mindmap-meta">Loading spreadsheets</small>
							</div>
							<div class="mindmap-node is-branch" data-node="todos" data-x="78" data-y="65" style="--delay: 0.2s">
								<span>Todos</span>
								<small class="mindmap-meta">Loading todos</small>
							</div>
							<div class="mindmap-node is-branch" data-node="time" data-x="38" data-y="90" style="--delay: 0.25s">
								<span>Time tracking</span>
								<small class="mindmap-meta">Loading time entries</small>
							</div>
							<div class="mindmap-node is-branch" data-node="projects" data-x="62" data-y="90" style="--delay: 0.3s">
								<span>Projects</span>
								<small class="mindmap-meta">Loading projects</small>
							</div>
						</div>
						<div class="mindmap-footer">
							<span>System overview</span>
							<span>Drag nodes to regroup</span>
						</div>
					</div>
				</section>
			</main>
		</div>
	`

	bindNavbarHandlers(body)
	bindMindMapActions(body)
	setupMindMapDrag(body)
	setupMindMapPan(body)
	void loadMindMapData(body)
}

function ensureBody() {
	const body = document.querySelector("body")
	if (!body) throw new Error("No body element found")
	return body
}

type ReceiptDTO = {
	id: number
	user_id: number
	amount: number
}

type SpreadsheetDTO = {
	id: number
	user_id: number
	name: string
	description?: string | null
	state?: string | null
	created_at: string
}

type ItemDTO = {
	id: number
	name: string
	description?: string | null
	barcode?: string | null
	cost?: number | null
	container_id: number
}

type TodoDTO = {
	id: number
	name: string
	description?: string | null
	done: 0 | 1
	created_at: string
	completed_at?: string | null
	deadline?: string | null
	project_id: number
}

type TimeEntryDTO = {
	id: number
	project_id: number
	start_time: string
	end_time: string
	is_running: 0 | 1
	description: string | null
}

type ProjectDTO = {
	id: number
	name: string
	created_at: string
}

const currencyFormatter = new Intl.NumberFormat(undefined, {
	style: "currency",
	currency: "USD",
})

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
})

function bindMindMapActions(root: ParentNode) {
	const openReceiptsButton = root.querySelector<HTMLButtonElement>(
		"[data-action='open-receipts']",
	)
	openReceiptsButton?.addEventListener("click", () => navigate("/receipts"))
}

async function loadMindMapData(root: ParentNode) {
	const results = await Promise.allSettled([
		fetchJson<ReceiptDTO[]>("/api/receipts"),
		fetchJson<SpreadsheetDTO[]>("/api/spreadsheets"),
		fetchJson<ItemDTO[]>("/api/items"),
		fetchJson<TodoDTO[]>("/api/todos"),
		fetchJson<TimeEntryDTO[]>("/api/time-entries"),
		fetchJson<ProjectDTO[]>("/api/projects"),
	])

	const receipts = getSettledValue(results[0], [])
	const spreadsheets = getSettledValue(results[1], [])
	const items = getSettledValue(results[2], [])
	const todos = getSettledValue(results[3], [])
	const timeEntries = getSettledValue(results[4], [])
	const projects = getSettledValue(results[5], [])

	updateCount(root, "receipts", receipts.length)
	updateCount(root, "spreadsheets", spreadsheets.length)
	updateCount(root, "items", items.length)
	updateCount(root, "todos", todos.length)
	updateCount(root, "time", timeEntries.length)
	updateCount(root, "projects", projects.length)

	const totalReceiptAmount = receipts.reduce((sum, receipt) => sum + receipt.amount, 0)
	const receiptsMeta =
		receipts.length === 0
			? "No receipts yet"
			: `${formatCount(receipts.length, "receipt")} · ${currencyFormatter.format(totalReceiptAmount)}`
	updateNodeMeta(root, "receipts", receiptsMeta)

	const latestSpreadsheet = getLatestByDate(spreadsheets, (sheet) => sheet.created_at)
	const spreadsheetMeta =
		spreadsheets.length === 0
			? "No spreadsheets yet"
			: latestSpreadsheet
				? `${formatCount(spreadsheets.length, "sheet")} · Last: ${latestSpreadsheet.name}`
				: formatCount(spreadsheets.length, "sheet")
	updateNodeMeta(root, "spreadsheets", spreadsheetMeta)

	const itemsMeta =
		items.length === 0
			? "No items yet"
			: formatCount(items.length, "item")
	updateNodeMeta(root, "items", itemsMeta)

	const completedTodos = todos.filter((todo) => todo.done === 1).length
	const todosMeta =
		todos.length === 0
			? "No todos yet"
			: `${formatCount(todos.length - completedTodos, "open")} · ${completedTodos} done`
	updateNodeMeta(root, "todos", todosMeta)

	const runningCount = timeEntries.filter((entry) => entry.is_running === 1).length
	const timeMeta =
		timeEntries.length === 0
			? "No time entries yet"
			: `${formatCount(timeEntries.length, "entry")} · ${runningCount} running`
	updateNodeMeta(root, "time", timeMeta)

	const latestProject = getLatestByDate(projects, (project) => project.created_at)
	const projectsMeta =
		projects.length === 0
			? "No projects yet"
			: latestProject
				? `${formatCount(projects.length, "project")} · Last: ${latestProject.name}`
				: formatCount(projects.length, "project")
	updateNodeMeta(root, "projects", projectsMeta)

	const rootMeta = `Total records ${[
		receipts.length,
		spreadsheets.length,
		items.length,
		todos.length,
		timeEntries.length,
		projects.length,
	].reduce((sum, value) => sum + value, 0)}`
	const rootMetaEl = root.querySelector<HTMLElement>("[data-node-meta='root']")
	if (rootMetaEl) rootMetaEl.textContent = rootMeta

	const footer = root.querySelector(".mindmap-footer span:first-child")
	if (footer) {
		footer.textContent = latestSpreadsheet
			? `Last update ${formatDate(latestSpreadsheet.created_at)}`
			: "System overview"
	}
}

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url, { credentials: "include" })
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}`)
	}
	return response.json() as Promise<T>
}

function getSettledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
	if (result.status === "fulfilled") return result.value
	return fallback
}

function updateCount(root: ParentNode, key: string, value: number) {
	const counter = root.querySelector<HTMLElement>(`[data-count='${key}']`)
	if (!counter) return
	counter.textContent = `${value}`
}

function updateNodeMeta(root: ParentNode, key: string, text: string) {
	const meta = root.querySelector<HTMLElement>(`[data-node='${key}'] .mindmap-meta`)
	if (!meta) return
	meta.textContent = text
}

function formatCount(value: number, label: string) {
	return `${value} ${label}${value === 1 ? "" : "s"}`
}

function getLatestByDate<T>(entries: T[], getDate: (entry: T) => string) {
	return entries.reduce<T | null>((latest, entry) => {
		const date = new Date(getDate(entry)).getTime()
		if (Number.isNaN(date)) return latest
		if (!latest) return entry
		const latestDate = new Date(getDate(latest)).getTime()
		return date > latestDate ? entry : latest
	}, null)
}

function formatDate(value: string) {
	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) return value
	return dateFormatter.format(parsed)
}

function setupMindMapDrag(root: ParentNode) {
	const canvas = root.querySelector<HTMLElement>("[data-role='mindmap-canvas']")
	if (!canvas) return
	const nodes = Array.from(root.querySelectorAll<HTMLElement>(".mindmap-node"))
	if (nodes.length === 0) return

	const setNodePosition = (node: HTMLElement, x: number, y: number) => {
		node.style.setProperty("--x", `${x}px`)
		node.style.setProperty("--y", `${y}px`)
		node.dataset.xPx = `${x}`
		node.dataset.yPx = `${y}`
	}

	const clamp = (value: number, min: number, max: number) =>
		Math.min(max, Math.max(min, value))

	const initializeNodes = () => {
		const rect = canvas.getBoundingClientRect()
		nodes.forEach((node) => {
			const xPercent = Number(node.dataset.x ?? "50")
			const yPercent = Number(node.dataset.y ?? "50")
			const x = rect.width * (xPercent / 100)
			const y = rect.height * (yPercent / 100)
			setNodePosition(node, x, y)
		})
	}

	initializeNodes()

	nodes.forEach((node) => {
		node.addEventListener("pointerdown", (event) => {
			const startX = Number(node.dataset.xPx ?? "0")
			const startY = Number(node.dataset.yPx ?? "0")
			const canvasRect = canvas.getBoundingClientRect()
			const nodeRect = node.getBoundingClientRect()
			const halfWidth = nodeRect.width / 2
			const halfHeight = nodeRect.height / 2
			const minX = halfWidth
			const maxX = canvasRect.width - halfWidth
			const minY = halfHeight
			const maxY = canvasRect.height - halfHeight

			let isDragging = true
			node.classList.add("is-dragging")
			node.setPointerCapture(event.pointerId)

			const handleMove = (moveEvent: PointerEvent) => {
				if (!isDragging) return
				const dx = moveEvent.clientX - event.clientX
				const dy = moveEvent.clientY - event.clientY
				const nextX = clamp(startX + dx, minX, maxX)
				const nextY = clamp(startY + dy, minY, maxY)
				setNodePosition(node, nextX, nextY)
			}

			const handleUp = () => {
				if (!isDragging) return
				isDragging = false
				node.classList.remove("is-dragging")
				node.releasePointerCapture(event.pointerId)
				window.removeEventListener("pointermove", handleMove)
				window.removeEventListener("pointerup", handleUp)
			}

			window.addEventListener("pointermove", handleMove)
			window.addEventListener("pointerup", handleUp)
		})
	})
}

function setupMindMapPan(root: ParentNode) {
	const canvas = root.querySelector<HTMLElement>("[data-role='mindmap-canvas']")
	const stage = root.querySelector<HTMLElement>("[data-role='mindmap-stage']")
	if (!canvas || !stage) return

	let panX = 0
	let panY = 0

	const updatePan = () => {
		stage.style.setProperty("--pan-x", `${panX}px`)
		stage.style.setProperty("--pan-y", `${panY}px`)
	}

	updatePan()

	canvas.addEventListener("pointerdown", (event) => {
		if (event.button !== 1) return
		event.preventDefault()

		const startX = event.clientX
		const startY = event.clientY
		const startPanX = panX
		const startPanY = panY

		let isPanning = true
		canvas.setPointerCapture(event.pointerId)

		const handleMove = (moveEvent: PointerEvent) => {
			if (!isPanning) return
			panX = startPanX + (moveEvent.clientX - startX)
			panY = startPanY + (moveEvent.clientY - startY)
			updatePan()
		}

		const handleUp = () => {
			if (!isPanning) return
			isPanning = false
			canvas.releasePointerCapture(event.pointerId)
			window.removeEventListener("pointermove", handleMove)
			window.removeEventListener("pointerup", handleUp)
		}

		window.addEventListener("pointermove", handleMove)
		window.addEventListener("pointerup", handleUp)
	})
}
