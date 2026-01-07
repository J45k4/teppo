import { TimerManager } from "./TimerManager"
import { bindNavbarHandlers, renderNavbar } from "./nav"

type ProjectDTO = {
	id: number
	name: string
}

type TimeEntryDTO = {
	id: number
	project_id: number
	start_time: string
	end_time: string
	is_running: 0 | 1
	description?: string
}

const rangeOptions = [
	{ value: 7, label: "Last 7 days" },
	{ value: 30, label: "Last 30 days" },
	{ value: 0, label: "All time" },
]

const defaultRangeDays = rangeOptions[0]?.value ?? 7

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	weekday: "short",
	month: "short",
	day: "numeric",
})

const timeFormatter = new Intl.DateTimeFormat(undefined, {
	hour: "2-digit",
	minute: "2-digit",
})

const timeWithSecondsFormatter = new Intl.DateTimeFormat(undefined, {
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
})
export async function renderTimeTrackingPage() {
	const body = ensureBody()

	const rangeOptionsMarkup = rangeOptions
		.map(
			(option) =>
				`<option value="${option.value}"${
					option.value === defaultRangeDays ? " selected" : ""
				}>${option.label}</option>`,
		)
		.join("")

	body.innerHTML = `
		<div class="app-frame">
			${renderNavbar("time")}
			<main class="time-page">
				<header class="time-header">
					<div>
						<p class="time-title">Time tracking</p>
						<h1>This week in focus</h1>
					</div>
					<div class="time-week-total">
						<span>Tracked</span>
						<strong id="total-hours">0h</strong>
						<span id="total-note">Last 7 days • All projects</span>
					</div>
				</header>
				<section class="time-controls">
					<div class="time-control-options">
						<div class="project-picker" id="project-picker">
							<button
								id="project-picker-button"
								type="button"
								aria-haspopup="listbox"
								aria-expanded="false"
							>
								<span class="project-picker-title">Project</span>
								<strong id="project-picker-value">All projects</strong>
								<span class="project-picker-chevron" aria-hidden="true">▾</span>
							</button>
							<div
								class="project-picker-panel"
								id="project-picker-panel"
								aria-hidden="true"
							>
								<header class="project-picker-header">
									<span>No client</span>
									<span id="project-picker-count" class="project-picker-count">0 Projects</span>
								</header>
								<div class="project-picker-search">
									<input
										id="project-search"
										type="search"
										placeholder="Search project or client"
									/>
								</div>
								<div class="project-picker-list" id="project-picker-list">
									<p class="project-picker-empty">Loading projects…</p>
								</div>
								<button
									type="button"
									class="project-picker-create"
									id="project-picker-create"
								>
									+ Create new project
								</button>
							</div>
						</div>
						<label>
							<span>Range</span>
							<select id="range-select">
								${rangeOptionsMarkup}
							</select>
						</label>
						<label>
							<span>Description</span>
							<input
								id="entry-description"
								type="text"
								placeholder="What are you working on?"
							/>
						</label>
					</div>
					<div class="time-control-actions">
						<button id="start-timer" type="button">Start timer</button>
						<button id="create-project" type="button">Create project</button>
					</div>
				</section>
				<section class="time-list">
					<div class="time-list-header">
						<span>Project</span>
						<span>Date</span>
						<span>Duration</span>
					</div>
					<div class="time-rows" id="time-rows">
						<p class="time-empty">Loading entries…</p>
					</div>
				</section>
			</main>
		</div>
		<div
			class="modal-backdrop"
			id="project-modal"
			aria-hidden="true"
		>
			<form class="modal" id="project-form">
				<p class="time-title">Create project</p>
				<label>
					<span>Project name</span>
					<input
						id="project-name"
						name="name"
						type="text"
						placeholder="New initiative"
						required
					/>
				</label>
				<p class="modal-error" id="project-error" aria-live="polite"></p>
				<div class="modal-actions">
					<button type="button" id="project-cancel">Cancel</button>
					<button type="submit">Create</button>
				</div>
			</form>
		</div>
		<div
			class="modal-backdrop"
			id="time-entry-modal"
			aria-hidden="true"
		>
			<form class="modal" id="time-entry-form">
				<p class="time-title">Edit time entry</p>
				<label>
					<span>Start</span>
					<input
						id="time-entry-start"
						name="start"
						type="datetime-local"
						required
					/>
				</label>
				<label>
					<span>End</span>
					<input
						id="time-entry-end"
						name="end"
						type="datetime-local"
						required
					/>
				</label>
				<p class="modal-error" id="time-entry-error" aria-live="polite"></p>
				<div class="modal-actions">
					<button type="button" id="time-entry-cancel">Cancel</button>
					<button type="submit">Save changes</button>
				</div>
			</form>
		</div>
	`

	bindNavbarHandlers(body)

	const rangeSelect = body.querySelector<HTMLSelectElement>("#range-select")
	const projectPicker = body.querySelector<HTMLDivElement>("#project-picker")
	const projectPickerButton = body.querySelector<HTMLButtonElement>(
		"#project-picker-button",
	)
	const projectPickerPanel = body.querySelector<HTMLDivElement>(
		"#project-picker-panel",
	)
	const projectPickerList = body.querySelector<HTMLDivElement>(
		"#project-picker-list",
	)
	const projectPickerSearch = body.querySelector<HTMLInputElement>(
		"#project-search",
	)
	const projectPickerCount = body.querySelector<HTMLSpanElement>(
		"#project-picker-count",
	)
	const projectPickerValue = body.querySelector<HTMLSpanElement>(
		"#project-picker-value",
	)
	const projectPickerCreate = body.querySelector<HTMLButtonElement>(
		"#project-picker-create",
	)
	const rowsContainer = body.querySelector<HTMLDivElement>("#time-rows")
	const totalHours = body.querySelector<HTMLSpanElement>("#total-hours")
	const totalNote = body.querySelector<HTMLSpanElement>("#total-note")
	const createProjectButton = body.querySelector<HTMLButtonElement>(
		"#create-project",
	)
	const startTimerButton = body.querySelector<HTMLButtonElement>(
		"#start-timer",
	)
	const modalBackdrop = body.querySelector<HTMLDivElement>("#project-modal")
	const projectForm = body.querySelector<HTMLFormElement>("#project-form")
	const projectNameInput = body.querySelector<HTMLInputElement>(
		"#project-name",
	)
	const projectError = body.querySelector<HTMLParagraphElement>(
		"#project-error",
	)
	const projectCancel = body.querySelector<HTMLButtonElement>(
		"#project-cancel",
	)
	const entryDescriptionInput = body.querySelector<HTMLInputElement>(
		"#entry-description",
	)
	const timeEntryModalBackdrop =
		body.querySelector<HTMLDivElement>("#time-entry-modal")
	const timeEntryForm = body.querySelector<HTMLFormElement>("#time-entry-form")
	const timeEntryStartInput = body.querySelector<HTMLInputElement>(
		"#time-entry-start",
	)
	const timeEntryEndInput = body.querySelector<HTMLInputElement>(
		"#time-entry-end",
	)
	const timeEntryError = body.querySelector<HTMLParagraphElement>(
		"#time-entry-error",
	)
	const timeEntryCancel = body.querySelector<HTMLButtonElement>(
		"#time-entry-cancel",
	)

	const state = {
		rangeDays: defaultRangeDays,
		projectId: null as number | null,
	}

	let entries: TimeEntryDTO[] = []
	let projects: ProjectDTO[] = []
	let projectMap = new Map<number, string>()
	let projectPickerOpen = false
	let projectFilterTerm = ""
	let editingEntryId: number | null = null
	const timerManager = new TimerManager({
		onTick: (runningIds) => {
			const now = new Date().toISOString()
			entries = entries.map((entry) =>
				runningIds.has(entry.id) ? { ...entry, end_time: now } : entry,
			)
			updateView()
		},
	})

	function updateView() {
		if (!rowsContainer || !totalHours || !totalNote) return
		const filtered = filterEntries(entries, state)
		renderEntries(filtered, projectMap, rowsContainer, timerManager.getRunningIds())
		updateSummary(filtered, totalHours, totalNote, state, projectMap)
	}

	async function stopTimer(entryId: number) {
		const now = new Date().toISOString()
		timerManager.stop(entryId)
		entries = entries.map((entry) =>
			entry.id === entryId
				? { ...entry, end_time: now, is_running: 0 }
				: entry,
		)
		updateView()
		try {
			const response = await fetch(`/api/time-entries/${entryId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ endTime: now, isRunning: false }),
			})
			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as
					| { error?: string }
					| null
				alert(payload?.error ?? "Unable to stop timer")
				timerManager.start(entryId)
				return
			}
			const updated = (await response.json().catch(() => null)) as
				| TimeEntryDTO
				| null
			if (updated && typeof updated.id === "number") {
				entries = entries.map((entry) =>
					entry.id === updated.id ? updated : entry,
				)
				updateView()
			}
		} catch (error) {
			console.error("Failed to stop timer", error)
			alert("Unable to stop timer")
			timerManager.start(entryId)
		}
	}

	function updateProjectButtonLabel() {
		if (!projectPickerValue) return
		const label = state.projectId
			? projectMap.get(state.projectId) ?? "Custom project"
			: "All projects"
		projectPickerValue.textContent = label
	}

	function renderProjectPanelList() {
		if (!projectPickerList) return
		const term = projectFilterTerm.trim().toLowerCase()
		const filteredProjects = term
			? projects.filter((project) =>
					project.name.toLowerCase().includes(term),
			  )
			: projects
		projectPickerCount?.replaceChildren()
		projectPickerCount?.append(
			`${filteredProjects.length} Project${filteredProjects.length === 1 ? "" : "s"}`,
		)
		const rows: string[] = []
		const allSelectedClass = state.projectId === null ? " is-selected" : ""
		rows.push(`
				<button
					type="button"
					class="project-picker-item${allSelectedClass}"
					data-id=""
				>
					<span class="project-picker-dot" aria-hidden="true"></span>
					<span class="project-picker-label">All projects</span>
				</button>
			`)
		if (filteredProjects.length === 0) {
			rows.push('<p class="project-picker-empty">No projects found.</p>')
		} else {
			rows.push(
				...filteredProjects.map(
					(project) => `
						<button
							type="button"
							class="project-picker-item${
								project.id === state.projectId ? " is-selected" : ""
							}"
							data-id="${project.id}"
						>
							<span class="project-picker-dot" aria-hidden="true"></span>
							<span class="project-picker-label">${project.name}</span>
							<span class="project-picker-meta">Create Task</span>
						</button>
					`,
				),
			)
		}
		projectPickerList.innerHTML = rows.join("")
	}

	function setProjectSelection(projectId: number | null) {
		state.projectId = projectId
		updateProjectButtonLabel()
		updateView()
	}

	function closeProjectPicker() {
		if (!projectPickerPanel || !projectPickerButton || !projectPicker) return
		projectPickerOpen = false
		projectPicker.classList.remove("is-open")
		projectPickerPanel.classList.remove("is-open")
		projectPickerPanel.setAttribute("aria-hidden", "true")
		projectPickerButton.setAttribute("aria-expanded", "false")
		if (projectPickerSearch) {
			projectPickerSearch.value = ""
		}
		projectFilterTerm = ""
		document.removeEventListener("click", handleDocumentClick)
	}

	function openProjectPicker() {
		if (!projectPickerPanel || !projectPickerButton || !projectPicker) return
		if (projectPickerOpen) {
			closeProjectPicker()
			return
		}
		projectPickerOpen = true
		projectPicker.classList.add("is-open")
		projectPickerPanel.classList.add("is-open")
		projectPickerPanel.setAttribute("aria-hidden", "false")
		projectPickerButton.setAttribute("aria-expanded", "true")
		projectPickerSearch?.focus()
		renderProjectPanelList()
		document.addEventListener("click", handleDocumentClick)
	}

	const handleDocumentClick = (event: MouseEvent) => {
		if (!projectPickerOpen) return
		if (!projectPicker?.contains(event.target as Node)) {
			closeProjectPicker()
		}
	}

	function toggleProjectPicker() {
		openProjectPicker()
	}

	rangeSelect?.addEventListener("change", () => {
		state.rangeDays = Number(rangeSelect.value)
		updateView()
	})

	projectPickerButton?.addEventListener("click", (event) => {
		event.stopPropagation()
		toggleProjectPicker()
	})

	projectPickerList?.addEventListener("click", (event) => {
		const target = event.target as HTMLElement
		const button = target.closest<HTMLButtonElement>(".project-picker-item")
		if (!button) return
		const selection = button.dataset.id ?? ""
		const selectedId = selection ? Number(selection) : null
		setProjectSelection(selectedId)
		closeProjectPicker()
	})

	projectPickerSearch?.addEventListener("input", () => {
		projectFilterTerm = projectPickerSearch.value
		renderProjectPanelList()
	})

	projectPickerPanel?.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			closeProjectPicker()
			event.stopPropagation()
		}
	})

	projectPickerCreate?.addEventListener("click", () => {
		openModal()
		closeProjectPicker()
	})

	const closeModal = () => {
		modalBackdrop?.classList.remove("is-visible")
		modalBackdrop?.setAttribute("aria-hidden", "true")
		projectForm?.reset()
		if (projectError) {
			projectError.textContent = ""
		}
	}

	const openModal = () => {
		modalBackdrop?.classList.add("is-visible")
		modalBackdrop?.setAttribute("aria-hidden", "false")
		projectNameInput?.focus()
	}

	const closeEntryModal = () => {
		timeEntryModalBackdrop?.classList.remove("is-visible")
		timeEntryModalBackdrop?.setAttribute("aria-hidden", "true")
		timeEntryForm?.reset()
		editingEntryId = null
		if (timeEntryError) {
			timeEntryError.textContent = ""
		}
	}

	const openEntryModal = (entry: TimeEntryDTO) => {
		if (!timeEntryStartInput || !timeEntryEndInput) return
		const startValue = formatDatetimeLocal(entry.start_time)
		const endValue = formatDatetimeLocal(entry.end_time)
		if (!startValue || !endValue) return
		editingEntryId = entry.id
		timeEntryStartInput.value = startValue
		timeEntryEndInput.value = endValue
		timeEntryModalBackdrop?.classList.add("is-visible")
		timeEntryModalBackdrop?.setAttribute("aria-hidden", "false")
		timeEntryStartInput.focus()
		if (timeEntryError) {
			timeEntryError.textContent = ""
		}
	}

	modalBackdrop?.addEventListener("click", (event) => {
		if (event.target === modalBackdrop) {
			closeModal()
		}
	})

	timeEntryModalBackdrop?.addEventListener("click", (event) => {
		if (event.target === timeEntryModalBackdrop) {
			closeEntryModal()
		}
	})

	createProjectButton?.addEventListener("click", openModal)
	startTimerButton?.addEventListener("click", () => {
		void startTimer()
	})
	projectCancel?.addEventListener("click", closeModal)
	timeEntryCancel?.addEventListener("click", closeEntryModal)

	projectForm?.addEventListener("submit", async (event) => {
		event.preventDefault()
		if (!projectNameInput) return
		if (projectError) {
			projectError.textContent = ""
		}
		const name = projectNameInput.value.trim()
		if (!name) {
			if (projectError) {
				projectError.textContent = "Enter a project name"
			}
			return
		}
		try {
			const response = await fetch("/api/projects", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ name }),
			})
			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as
					| { error?: string }
					| null
				if (projectError) {
					projectError.textContent = ""
				}
				projectError?.append(
					payload?.error ?? "Unable to create project",
				)
				return
			}
			const json = await response.json().catch(() => null)
			const createdId =
				typeof json === "object" && json && "id" in json
					? Number(json.id)
					: null
			if (createdId) {
				state.projectId = createdId
			}
			const latestProjects = await fetchProjects()
			projects = latestProjects
			projectMap = new Map(
				latestProjects.map((project) => [project.id, project.name]),
			)
			if (createdId) {
				state.projectId = createdId
			}
			projectFilterTerm = ""
			if (projectPickerSearch) {
				projectPickerSearch.value = ""
			}
			renderProjectPanelList()
			updateProjectButtonLabel()
			updateView()
			closeModal()
		} catch (error) {
			console.error("Failed to create project", error)
			if (projectError) {
				projectError.textContent = "Unable to create project"
			}
		}
	})

	timeEntryForm?.addEventListener("submit", async (event) => {
		event.preventDefault()
		if (!timeEntryStartInput || !timeEntryEndInput) return
		if (timeEntryError) {
			timeEntryError.textContent = ""
		}
		if (!editingEntryId) return
		const startValue = timeEntryStartInput.value
		const endValue = timeEntryEndInput.value
		if (!startValue || !endValue) {
			if (timeEntryError) {
				timeEntryError.textContent = "Start and end are required"
			}
			return
		}
		const startIso = toIsoString(startValue)
		const endIso = toIsoString(endValue)
		if (!startIso || !endIso) {
			if (timeEntryError) {
				timeEntryError.textContent = "Invalid date format"
			}
			return
		}
		if (new Date(endIso).getTime() < new Date(startIso).getTime()) {
			if (timeEntryError) {
				timeEntryError.textContent = "End time must be after start time"
			}
			return
		}
		try {
			const response = await fetch(`/api/time-entries/${editingEntryId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					startTime: startIso,
					endTime: endIso,
					isRunning: false,
				}),
			})
			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as
					| { error?: string }
					| null
				if (timeEntryError) {
					timeEntryError.textContent =
						payload?.error ?? "Unable to update entry"
				}
				return
			}
			const updated = (await response.json().catch(() => null)) as
				| TimeEntryDTO
				| null
			if (updated && typeof updated.id === "number") {
				entries = entries.map((entry) =>
					entry.id === updated.id ? updated : entry,
				)
				timerManager.stop(updated.id)
				updateView()
				closeEntryModal()
			}
		} catch (error) {
			console.error("Failed to update time entry", error)
			if (timeEntryError) {
				timeEntryError.textContent = "Unable to update entry"
			}
		}
	})

	async function startTimer() {
		if (!state.projectId) {
			alert("Please select a project first")
			return
		}
		const description = entryDescriptionInput?.value.trim() ?? ""
		try {
			const now = new Date().toISOString()
			const response = await fetch("/api/time-entries", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					projectId: state.projectId,
					startTime: now,
					endTime: now,
					isRunning: true,
					description: description || undefined,
				}),
			})
			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as
					| { error?: string }
					| null
				alert(payload?.error ?? "Unable to start timer")
				return
			}
			const json = await response.json().catch(() => null)
			if (json && "id" in json) {
				const description = entryDescriptionInput?.value.trim() ?? ""
				const newEntry: TimeEntryDTO = {
					id: Number(json.id),
					project_id: state.projectId,
					start_time: now,
					end_time: now,
					is_running: 1,
					description: description || undefined,
				}
				entries = [newEntry, ...entries]
				timerManager.start(newEntry.id)
				updateView()
			}
		} catch (error) {
			console.error("Failed to start timer", error)
			alert("Unable to start timer")
		}
	}

	try {
		const [loadedEntries, loadedProjects] = await Promise.all([
			fetchTimeEntries(),
			fetchProjects(),
		])
		entries = loadedEntries.sort((a, b) => {
			const aTime = parseTimestamp(a.start_time)?.getTime() ?? 0
			const bTime = parseTimestamp(b.start_time)?.getTime() ?? 0
			return bTime - aTime
		})
		for (const entry of entries) {
			if (entry.is_running === 1) {
				timerManager.start(entry.id)
			}
		}
		projects = loadedProjects
		projectMap = new Map(projects.map((project) => [project.id, project.name]))
		projectFilterTerm = ""
		if (projectPickerSearch) {
			projectPickerSearch.value = ""
		}
		renderProjectPanelList()
		updateProjectButtonLabel()
		updateView()
	} catch (error) {
		console.error("Failed to load time page data", error)
		if (rowsContainer) {
			rowsContainer.innerHTML =
				'<p class="time-empty">Unable to load time entries right now.</p>'
		}
		if (totalHours) {
			totalHours.textContent = "0h"
		}
		if (totalNote) {
			totalNote.textContent = "An error occurred"
		}
	}

	rowsContainer?.addEventListener("click", (event) => {
		const target = event.target as HTMLElement
		const button = target.closest<HTMLButtonElement>("[data-action='stop-timer']")
		if (!button) return
		const entryId = Number(button.dataset.id)
		if (!Number.isInteger(entryId)) return
		void stopTimer(entryId)
	})

	rowsContainer?.addEventListener("click", (event) => {
		const target = event.target as HTMLElement
		if (target.closest("[data-action='stop-timer']")) return
		const row = target.closest<HTMLDivElement>(".time-row")
		if (!row) return
		const entryId = Number(row.dataset.id)
		if (!Number.isInteger(entryId)) return
		const entry = entries.find((item) => item.id === entryId)
		if (!entry) return
		openEntryModal(entry)
	})
}

function renderEntries(
	entries: TimeEntryDTO[],
	projectMap: Map<number, string>,
	container: HTMLDivElement,
	runningEntryIds: Set<number>,
) {
	if (entries.length === 0) {
		container.innerHTML =
			'<p class="time-empty">No time was recorded for the selected filters.</p>'
		return
	}
	const rows = entries
		.map((entry) => {
			const projectName =
				projectMap.get(entry.project_id) ?? "Unknown project"
			const description = entry.description
				? `<div class="time-description">${entry.description}</div>`
				: ""
			const isActive = runningEntryIds.has(entry.id)
			const rowClass = isActive ? "time-row time-row--active" : "time-row"
			const actionMarkup = isActive
				? `<button class="time-stop" type="button" data-action="stop-timer" data-id="${entry.id}">Stop</button>`
				: ""
			return `
				<div class="${rowClass}" data-id="${entry.id}">
					<div>
						<div class="time-task">${projectName}</div>
						${description}
						<div class="time-meta">${formatEntryDate(entry.start_time)}</div>
					</div>
					<div class="time-range">${formatTimeRange(
						entry.start_time,
						entry.end_time,
						isActive,
					)}</div>
					<div class="time-duration">
						<span>${formatDurationSeconds(entry, isActive)}</span>
						${actionMarkup}
					</div>
				</div>
			`
		})
		.join("")
	container.innerHTML = rows
}

function filterEntries(
	rawEntries: TimeEntryDTO[],
	state: {
		rangeDays: number
		projectId: number | null
	},
) {
	let filtered = rawEntries
	if (state.rangeDays > 0) {
		const threshold = new Date()
		threshold.setDate(threshold.getDate() - state.rangeDays)
		filtered = filtered.filter((entry) => {
			const parsed = parseTimestamp(entry.start_time)
			return parsed ? parsed >= threshold : true
		})
	}
	if (state.projectId) {
		filtered = filtered.filter(
			(entry) => entry.project_id === state.projectId,
		)
	}
	return filtered
}

function updateSummary(
	entries: TimeEntryDTO[],
	totalHoursEl: HTMLSpanElement,
	totalNoteEl: HTMLSpanElement,
	state: {
		rangeDays: number
		projectId: number | null
	},
	projectMap: Map<number, string>,
) {
	const seconds = entries.reduce(
		(sum, entry) => sum + entryDurationSeconds(entry),
		0,
	)
	totalHoursEl.textContent = formatTotalDuration(seconds)
	const rangeLabel =
		rangeOptions.find((option) => option.value === state.rangeDays)?.label ??
		"Custom range"
	const projectLabel = state.projectId
		? projectMap.get(state.projectId) ?? "Custom project"
		: "All projects"
	totalNoteEl.textContent = `${rangeLabel} • ${projectLabel}`
}

function entryDurationSeconds(entry: TimeEntryDTO) {
	const start = parseTimestamp(entry.start_time)?.getTime()
	const end = parseTimestamp(entry.end_time)?.getTime()
	if (!start || !end) {
		return 0
	}
	const duration = Math.max(0, end - start)
	return Math.round(duration / 1000)
}

function formatDurationSeconds(entry: TimeEntryDTO, showSeconds = false) {
	const seconds = entryDurationSeconds(entry)
	return showSeconds ? formatActiveDuration(seconds) : formatTotalDuration(seconds)
}

function formatTotalDuration(totalSeconds: number) {
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const parts: string[] = []
	if (hours > 0) {
		parts.push(`${hours}h`)
	}
	if (minutes > 0 || hours === 0) {
		parts.push(`${minutes}m`)
	}
	return parts.join(" ")
}

function formatActiveDuration(totalSeconds: number) {
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60
	const parts: string[] = []
	if (hours > 0) {
		parts.push(`${hours}h`)
	}
	parts.push(`${minutes}m`)
	parts.push(`${seconds}s`)
	return parts.join(" ")
}

function formatEntryDate(value: string) {
	const parsed = parseTimestamp(value)
	return parsed ? dateFormatter.format(parsed) : value
}

function formatTimeRange(start: string, end: string, showSeconds = false) {
	const startDate = parseTimestamp(start)
	const endDate = parseTimestamp(end)
	if (!startDate || !endDate) {
		return `${start} — ${end}`
	}
	const formatter = showSeconds ? timeWithSecondsFormatter : timeFormatter
	if (showSeconds) {
		return `${formatter.format(startDate)} — Now`
	}
	return `${formatter.format(startDate)} — ${formatter.format(endDate)}`
}

function parseTimestamp(value: string) {
	const direct = new Date(value)
	if (!Number.isNaN(direct.getTime())) {
		return direct
	}
	if (value.includes(" ")) {
		const normalized = value.replace(" ", "T")
		const parsed = new Date(normalized)
		if (!Number.isNaN(parsed.getTime())) {
			return parsed
		}
	}
	return null
}

function formatDatetimeLocal(value: string) {
	const parsed = parseTimestamp(value)
	if (!parsed) return ""
	const year = parsed.getFullYear()
	const month = String(parsed.getMonth() + 1).padStart(2, "0")
	const day = String(parsed.getDate()).padStart(2, "0")
	const hours = String(parsed.getHours()).padStart(2, "0")
	const minutes = String(parsed.getMinutes()).padStart(2, "0")
	return `${year}-${month}-${day}T${hours}:${minutes}`
}

function toIsoString(value: string) {
	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) return null
	return parsed.toISOString()
}

async function fetchTimeEntries() {
	const response = await fetch("/api/time-entries", {
		credentials: "include",
	})
	if (!response.ok) {
		throw new Error("Failed to load time entries")
	}
	return (await response.json()) as TimeEntryDTO[]
}

async function fetchProjects() {
	const response = await fetch("/api/projects", {
		credentials: "include",
	})
	if (!response.ok) {
		throw new Error("Failed to load projects")
	}
	return (await response.json()) as ProjectDTO[]
}

function ensureBody() {
	const body = document.querySelector("body")
	if (!body) {
		throw new Error("No body element found")
	}
	return body
}
