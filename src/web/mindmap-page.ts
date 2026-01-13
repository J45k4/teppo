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
								<g data-role="mindmap-sheet-links"></g>
								<g data-role="mindmap-time-links"></g>
								<g data-role="mindmap-time-project-links"></g>
								<g data-role="mindmap-project-links"></g>
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
							<div
								class="mindmap-node is-branch"
								data-node="spreadsheets"
								data-action="open-spreadsheets"
								data-x="78"
								data-y="28"
								role="button"
								tabindex="0"
								aria-label="Open spreadsheets"
								style="--delay: 0.15s"
							>
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

	const spreadsheetNode = root.querySelector<HTMLElement>(
		"[data-action='open-spreadsheets']",
	)
	const openSpreadsheets = () => navigate("/spreadsheets")

	spreadsheetNode?.addEventListener("click", () => {
		if (spreadsheetNode.dataset.wasDragged === "true") {
			spreadsheetNode.dataset.wasDragged = "false"
			return
		}
		openSpreadsheets()
	})

	spreadsheetNode?.addEventListener("keydown", (event) => {
		if (event.key !== "Enter" && event.key !== " ") return
		event.preventDefault()
		openSpreadsheets()
	})

	root.addEventListener("click", (event) => {
		const target = event.target as HTMLElement | null
		const sheetNode = target?.closest<HTMLElement>(
			"[data-action='open-spreadsheet']",
		)
		if (!sheetNode) return
		if (sheetNode.dataset.wasDragged === "true") {
			sheetNode.dataset.wasDragged = "false"
			return
		}
		const id = Number(sheetNode.dataset.id ?? "")
		if (!Number.isInteger(id) || id <= 0) return
		navigate(`/spreadsheets/${id}`)
	})

	root.addEventListener("keydown", (event) => {
		if (!(event instanceof KeyboardEvent)) return
		if (event.key !== "Enter" && event.key !== " ") return
		const target = event.target as HTMLElement | null
		const sheetNode = target?.closest<HTMLElement>(
			"[data-action='open-spreadsheet']",
		)
		if (!sheetNode) return
		event.preventDefault()
		const id = Number(sheetNode.dataset.id ?? "")
		if (!Number.isInteger(id) || id <= 0) return
		navigate(`/spreadsheets/${id}`)
	})

	root.addEventListener("click", (event) => {
		const target = event.target as HTMLElement | null
		const timerNode = target?.closest<HTMLElement>(
			"[data-action='open-time-entry']",
		)
		if (!timerNode) return
		if (timerNode.dataset.wasDragged === "true") {
			timerNode.dataset.wasDragged = "false"
			return
		}
		navigate("/time")
	})

	root.addEventListener("keydown", (event) => {
		if (!(event instanceof KeyboardEvent)) return
		if (event.key !== "Enter" && event.key !== " ") return
		const target = event.target as HTMLElement | null
		const timerNode = target?.closest<HTMLElement>(
			"[data-action='open-time-entry']",
		)
		if (!timerNode) return
		event.preventDefault()
		navigate("/time")
	})
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
	renderSpreadsheetNodes(root, spreadsheets)

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

	const runningEntries = timeEntries.filter((entry) => entry.is_running === 1)
	const runningCount = runningEntries.length
	const timeMeta =
		timeEntries.length === 0
			? "No time entries yet"
			: `${formatCount(timeEntries.length, "entry")} · ${runningCount} running`
	updateNodeMeta(root, "time", timeMeta)
	renderTimeEntryNodes(
		root,
		runningEntries,
	)

	const latestProject = getLatestByDate(projects, (project) => project.created_at)
	const projectsMeta =
		projects.length === 0
			? "No projects yet"
			: latestProject
				? `${formatCount(projects.length, "project")} · Last: ${latestProject.name}`
				: formatCount(projects.length, "project")
	updateNodeMeta(root, "projects", projectsMeta)
	renderProjectNodes(root, projects, runningEntries)

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

function renderSpreadsheetNodes(root: ParentNode, spreadsheets: SpreadsheetDTO[]) {
	const stage = root.querySelector<HTMLElement>("[data-role='mindmap-stage']")
	if (!stage) return
	Array.from(stage.querySelectorAll<HTMLElement>("[data-node='spreadsheet-leaf']")).forEach(
		(node) => node.remove(),
	)
	const linksGroup = root.querySelector<SVGGElement>(
		"[data-role='mindmap-sheet-links']",
	)
	if (linksGroup) linksGroup.innerHTML = ""

	if (spreadsheets.length === 0) return

	const anchorNode = stage.querySelector<HTMLElement>("[data-node='spreadsheets']")
	const anchorX = Number(anchorNode?.dataset.x ?? "78")
	const anchorY = Number(anchorNode?.dataset.y ?? "28")
	const offsets = [
		{ x: 12, y: -10 },
		{ x: 18, y: 6 },
		{ x: 6, y: 16 },
		{ x: 20, y: -18 },
	]
	const clamp = (value: number, min: number, max: number) =>
		Math.min(max, Math.max(min, value))

	spreadsheets.slice(0, offsets.length).forEach((sheet, index) => {
		const offset = offsets[index]
		if (!offset) return
		const x = clamp(anchorX + offset.x, 6, 94)
		const y = clamp(anchorY + offset.y, 6, 94)
		const node = document.createElement("div")
		node.className = "mindmap-node is-leaf"
		node.dataset.node = "spreadsheet-leaf"
		node.dataset.action = "open-spreadsheet"
		node.dataset.id = `${sheet.id}`
		node.dataset.x = `${x}`
		node.dataset.y = `${y}`
		node.setAttribute("role", "button")
		node.setAttribute("tabindex", "0")
		node.setAttribute("aria-label", `Open spreadsheet ${sheet.name}`)
		node.style.setProperty("--delay", `${0.35 + index * 0.05}s`)
		node.innerHTML = `
			<span>${escapeHtml(sheet.name)}</span>
			<small class="mindmap-meta">${formatDate(sheet.created_at)}</small>
		`
		stage.appendChild(node)
		appendSpreadsheetLink(linksGroup, sheet.id)
	})

	initializeMindMapNodes(root)
	updateSpreadsheetLinks(root)
	setupMindMapDrag(root)
}

function renderTimeEntryNodes(root: ParentNode, runningEntries: TimeEntryDTO[]) {
	const stage = root.querySelector<HTMLElement>("[data-role='mindmap-stage']")
	if (!stage) return
	Array.from(stage.querySelectorAll<HTMLElement>("[data-node='time-entry-leaf']")).forEach(
		(node) => node.remove(),
	)
	const linksGroup = root.querySelector<SVGGElement>(
		"[data-role='mindmap-time-links']",
	)
	if (linksGroup) linksGroup.innerHTML = ""
	if (runningEntries.length === 0) return

	const anchorNode = stage.querySelector<HTMLElement>("[data-node='time']")
	const anchorX = Number(anchorNode?.dataset.x ?? "38")
	const anchorY = Number(anchorNode?.dataset.y ?? "90")
	const offsets = [
		{ x: -12, y: -10 },
		{ x: 10, y: -16 },
		{ x: 14, y: 6 },
	]
	const clamp = (value: number, min: number, max: number) =>
		Math.min(max, Math.max(min, value))

	runningEntries
		.slice()
		.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
		.slice(0, offsets.length)
		.forEach((entry, index) => {
			const offset = offsets[index]
			if (!offset) return
			const x = clamp(anchorX + offset.x, 6, 94)
			const y = clamp(anchorY + offset.y, 6, 94)
			const label = entry.description?.trim() || `Timer ${entry.id}`
			const node = document.createElement("div")
			node.className = "mindmap-node is-leaf"
			node.dataset.node = "time-entry-leaf"
			node.dataset.action = "open-time-entry"
			node.dataset.id = `${entry.id}`
			node.dataset.projectId = `${entry.project_id}`
			node.dataset.x = `${x}`
			node.dataset.y = `${y}`
			node.setAttribute("role", "button")
			node.setAttribute("tabindex", "0")
			node.setAttribute("aria-label", `Open running timer ${label}`)
			node.style.setProperty("--delay", `${0.45 + index * 0.05}s`)
			node.innerHTML = `
				<span>${escapeHtml(label)}</span>
				<small class="mindmap-meta">Running · ${formatDate(entry.start_time)}</small>
			`
			stage.appendChild(node)
			appendTimeEntryLink(linksGroup, entry.id)
		})

	initializeMindMapNodes(root)
	updateTimeEntryLinks(root)
	setupMindMapDrag(root)
}

function appendTimeEntryLink(linksGroup: SVGGElement | null, entryId: number) {
	if (!linksGroup) return
	const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
	path.dataset.linkId = `${entryId}`
	linksGroup.appendChild(path)
}

function renderProjectNodes(
	root: ParentNode,
	projects: ProjectDTO[],
	runningEntries: TimeEntryDTO[],
) {
	const stage = root.querySelector<HTMLElement>("[data-role='mindmap-stage']")
	if (!stage) return
	Array.from(stage.querySelectorAll<HTMLElement>("[data-node='project-leaf']")).forEach(
		(node) => node.remove(),
	)
	const linksGroup = root.querySelector<SVGGElement>(
		"[data-role='mindmap-project-links']",
	)
	if (linksGroup) linksGroup.innerHTML = ""
	const timeLinksGroup = root.querySelector<SVGGElement>(
		"[data-role='mindmap-time-project-links']",
	)
	if (timeLinksGroup) timeLinksGroup.innerHTML = ""
	if (projects.length === 0) return

	const runningProjectIds = new Set(runningEntries.map((entry) => entry.project_id))
	const runningProjects = projects.filter((project) =>
		runningProjectIds.has(project.id),
	)
	const idleProjects = projects.filter(
		(project) => !runningProjectIds.has(project.id),
	)
	const displayProjects = [...runningProjects, ...idleProjects]

	const anchorNode = stage.querySelector<HTMLElement>("[data-node='projects']")
	const anchorX = Number(anchorNode?.dataset.x ?? "62")
	const anchorY = Number(anchorNode?.dataset.y ?? "90")
	const offsets = [
		{ x: -14, y: -12 },
		{ x: 12, y: -16 },
		{ x: 14, y: 6 },
		{ x: -10, y: 10 },
	]
	const clamp = (value: number, min: number, max: number) =>
		Math.min(max, Math.max(min, value))

	displayProjects.slice(0, offsets.length).forEach((project, index) => {
		const offset = offsets[index]
		if (!offset) return
		const x = clamp(anchorX + offset.x, 6, 94)
		const y = clamp(anchorY + offset.y, 6, 94)
		const isRunning = runningProjectIds.has(project.id)
		const node = document.createElement("div")
		node.className = "mindmap-node is-leaf"
		node.dataset.node = "project-leaf"
		node.dataset.id = `${project.id}`
		node.dataset.running = isRunning ? "true" : "false"
		node.dataset.x = `${x}`
		node.dataset.y = `${y}`
		node.style.setProperty("--delay", `${0.5 + index * 0.05}s`)
		node.innerHTML = `
			<span>${escapeHtml(project.name)}</span>
			<small class="mindmap-meta">${isRunning ? "Running" : formatDate(project.created_at)}</small>
		`
		stage.appendChild(node)
		appendProjectLink(linksGroup, project.id)
	})

	initializeMindMapNodes(root)
	updateProjectLinks(root)
	updateTimeProjectLinks(root)
	setupMindMapDrag(root)
}

function appendProjectLink(linksGroup: SVGGElement | null, projectId: number) {
	if (!linksGroup) return
	const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
	path.dataset.linkId = `${projectId}`
	linksGroup.appendChild(path)
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

function appendSpreadsheetLink(linksGroup: SVGGElement | null, sheetId: number) {
	if (!linksGroup) return
	const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
	path.dataset.linkId = `${sheetId}`
	linksGroup.appendChild(path)
}

function updateSpreadsheetLinks(root: ParentNode) {
	const linksGroup = root.querySelector<SVGGElement>(
		"[data-role='mindmap-sheet-links']",
	)
	if (!linksGroup) return
	const canvas = root.querySelector<HTMLElement>("[data-role='mindmap-canvas']")
	if (!canvas) return
	const anchorNode = root.querySelector<HTMLElement>("[data-node='spreadsheets']")
	if (!anchorNode) return
	const canvasRect = canvas.getBoundingClientRect()
	const anchorPos = getNodePositionPx(anchorNode, canvasRect)
	if (!anchorPos) return

	const leafNodes = Array.from(
		root.querySelectorAll<HTMLElement>("[data-node='spreadsheet-leaf']"),
	)
	leafNodes.forEach((leaf) => {
		const id = leaf.dataset.id
		if (!id) return
		const path = linksGroup.querySelector<SVGPathElement>(
			`path[data-link-id='${id}']`,
		)
		if (!path) return
		const leafPos = getNodePositionPx(leaf, canvasRect)
		if (!leafPos) return
		const start = mapToViewBox(anchorPos, canvasRect)
		const end = mapToViewBox(leafPos, canvasRect)
		const controlX = start.x + (end.x - start.x) * 0.4
		const controlY = start.y + (end.y - start.y) * 0.4
		path.setAttribute(
			"d",
			`M${start.x} ${start.y} C${controlX} ${controlY} ${controlX} ${controlY} ${end.x} ${end.y}`,
		)
	})
}

function updateProjectLinks(root: ParentNode) {
	const linksGroup = root.querySelector<SVGGElement>(
		"[data-role='mindmap-project-links']",
	)
	if (!linksGroup) return
	const canvas = root.querySelector<HTMLElement>("[data-role='mindmap-canvas']")
	if (!canvas) return
	const anchorNode = root.querySelector<HTMLElement>("[data-node='projects']")
	if (!anchorNode) return
	const canvasRect = canvas.getBoundingClientRect()
	const anchorPos = getNodePositionPx(anchorNode, canvasRect)
	if (!anchorPos) return

	const leafNodes = Array.from(
		root.querySelectorAll<HTMLElement>("[data-node='project-leaf']"),
	)
	leafNodes.forEach((leaf) => {
		const id = leaf.dataset.id
		if (!id) return
		const path = linksGroup.querySelector<SVGPathElement>(
			`path[data-link-id='${id}']`,
		)
		if (!path) return
		const leafPos = getNodePositionPx(leaf, canvasRect)
		if (!leafPos) return
		const start = mapToViewBox(anchorPos, canvasRect)
		const end = mapToViewBox(leafPos, canvasRect)
		const controlX = start.x + (end.x - start.x) * 0.4
		const controlY = start.y + (end.y - start.y) * 0.4
		path.setAttribute(
			"d",
			`M${start.x} ${start.y} C${controlX} ${controlY} ${controlX} ${controlY} ${end.x} ${end.y}`,
		)
	})
}

function updateTimeEntryLinks(root: ParentNode) {
	const linksGroup = root.querySelector<SVGGElement>(
		"[data-role='mindmap-time-links']",
	)
	if (!linksGroup) return
	const canvas = root.querySelector<HTMLElement>("[data-role='mindmap-canvas']")
	if (!canvas) return
	const anchorNode = root.querySelector<HTMLElement>("[data-node='time']")
	if (!anchorNode) return
	const canvasRect = canvas.getBoundingClientRect()
	const anchorPos = getNodePositionPx(anchorNode, canvasRect)
	if (!anchorPos) return

	const leafNodes = Array.from(
		root.querySelectorAll<HTMLElement>("[data-node='time-entry-leaf']"),
	)
	leafNodes.forEach((leaf) => {
		const id = leaf.dataset.id
		if (!id) return
		const path = linksGroup.querySelector<SVGPathElement>(
			`path[data-link-id='${id}']`,
		)
		if (!path) return
		const leafPos = getNodePositionPx(leaf, canvasRect)
		if (!leafPos) return
		const start = mapToViewBox(anchorPos, canvasRect)
		const end = mapToViewBox(leafPos, canvasRect)
		const controlX = start.x + (end.x - start.x) * 0.4
		const controlY = start.y + (end.y - start.y) * 0.4
		path.setAttribute(
			"d",
			`M${start.x} ${start.y} C${controlX} ${controlY} ${controlX} ${controlY} ${end.x} ${end.y}`,
		)
	})
}

function updateTimeProjectLinks(root: ParentNode) {
	const linksGroup = root.querySelector<SVGGElement>(
		"[data-role='mindmap-time-project-links']",
	)
	if (!linksGroup) return
	const canvas = root.querySelector<HTMLElement>("[data-role='mindmap-canvas']")
	if (!canvas) return
	const canvasRect = canvas.getBoundingClientRect()

	const projectNodes = Array.from(
		root.querySelectorAll<HTMLElement>("[data-node='project-leaf']"),
	)
	const projectPositions = new Map<string, { x: number; y: number }>()
	projectNodes.forEach((project) => {
		const id = project.dataset.id
		if (!id) return
		const pos = getNodePositionPx(project, canvasRect)
		if (!pos) return
		projectPositions.set(id, pos)
	})

	const timerNodes = Array.from(
		root.querySelectorAll<HTMLElement>("[data-node='time-entry-leaf']"),
	)
	const activeLinkIds = new Set<string>()

	timerNodes.forEach((timer) => {
		const id = timer.dataset.id
		const projectId = timer.dataset.projectId
		if (!id || !projectId) return
		const timerPos = getNodePositionPx(timer, canvasRect)
		const projectPos = projectPositions.get(projectId)
		if (!timerPos || !projectPos) return
		activeLinkIds.add(id)
		let path = linksGroup.querySelector<SVGPathElement>(
			`path[data-link-id='${id}']`,
		)
		if (!path) {
			path = document.createElementNS("http://www.w3.org/2000/svg", "path")
			path.dataset.linkId = id
			linksGroup.appendChild(path)
		}
		const start = mapToViewBox(timerPos, canvasRect)
		const end = mapToViewBox(projectPos, canvasRect)
		const controlX = start.x + (end.x - start.x) * 0.4
		const controlY = start.y + (end.y - start.y) * 0.4
		path.setAttribute(
			"d",
			`M${start.x} ${start.y} C${controlX} ${controlY} ${controlX} ${controlY} ${end.x} ${end.y}`,
		)
	})

	Array.from(linksGroup.querySelectorAll<SVGPathElement>("path")).forEach(
		(path) => {
			const id = path.dataset.linkId
			if (!id || !activeLinkIds.has(id)) path.remove()
		},
	)
}

function getNodePositionPx(node: HTMLElement, canvasRect: DOMRect) {
	const xPx = Number(node.dataset.xPx ?? "")
	const yPx = Number(node.dataset.yPx ?? "")
	if (Number.isFinite(xPx) && Number.isFinite(yPx)) {
		return { x: xPx, y: yPx }
	}
	const xPercent = Number(node.dataset.x ?? "")
	const yPercent = Number(node.dataset.y ?? "")
	if (!Number.isFinite(xPercent) || !Number.isFinite(yPercent)) return null
	return {
		x: canvasRect.width * (xPercent / 100),
		y: canvasRect.height * (yPercent / 100),
	}
}

function mapToViewBox(pos: { x: number; y: number }, canvasRect: DOMRect) {
	const viewBoxWidth = 800
	const viewBoxHeight = 520
	return {
		x: (pos.x / canvasRect.width) * viewBoxWidth,
		y: (pos.y / canvasRect.height) * viewBoxHeight,
	}
}

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;")
}

function initializeMindMapNodes(root: ParentNode) {
	const canvas = root.querySelector<HTMLElement>("[data-role='mindmap-canvas']")
	if (!canvas) return
	const nodes = Array.from(root.querySelectorAll<HTMLElement>(".mindmap-node"))
	if (nodes.length === 0) return
	const rect = canvas.getBoundingClientRect()
	nodes.forEach((node) => {
		const xPercent = Number(node.dataset.x ?? "50")
		const yPercent = Number(node.dataset.y ?? "50")
		const x = rect.width * (xPercent / 100)
		const y = rect.height * (yPercent / 100)
		setNodePosition(node, x, y)
	})
}

function setNodePosition(node: HTMLElement, x: number, y: number) {
	node.style.setProperty("--x", `${x}px`)
	node.style.setProperty("--y", `${y}px`)
	node.dataset.xPx = `${x}`
	node.dataset.yPx = `${y}`
}

function setupMindMapDrag(root: ParentNode) {
	const canvas = root.querySelector<HTMLElement>("[data-role='mindmap-canvas']")
	if (!canvas) return
	const nodes = Array.from(root.querySelectorAll<HTMLElement>(".mindmap-node"))
	if (nodes.length === 0) return

	const clamp = (value: number, min: number, max: number) =>
		Math.min(max, Math.max(min, value))

	initializeMindMapNodes(root)

	nodes.forEach((node) => {
		if (node.dataset.dragReady === "true") return
		node.dataset.dragReady = "true"
		node.addEventListener("pointerdown", (event) => {
			const startX = Number(node.dataset.xPx ?? "0")
			const startY = Number(node.dataset.yPx ?? "0")
			node.dataset.wasDragged = "false"
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
				if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
					node.dataset.wasDragged = "true"
				}
				const nextX = clamp(startX + dx, minX, maxX)
				const nextY = clamp(startY + dy, minY, maxY)
				setNodePosition(node, nextX, nextY)
				if (
					node.dataset.node === "spreadsheets" ||
					node.dataset.node === "spreadsheet-leaf"
				) {
					updateSpreadsheetLinks(root)
				}
				if (
					node.dataset.node === "time" ||
					node.dataset.node === "time-entry-leaf"
				) {
					updateTimeEntryLinks(root)
				}
				if (
					node.dataset.node === "projects" ||
					node.dataset.node === "project-leaf"
				) {
					updateProjectLinks(root)
				}
				if (
					node.dataset.node === "time-entry-leaf" ||
					node.dataset.node === "project-leaf"
				) {
					updateTimeProjectLinks(root)
				}
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
