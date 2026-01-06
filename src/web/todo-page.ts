import { createModal } from "./modal"
import { bindNavbarHandlers, renderNavbar } from "./nav"
import { navigate } from "./router"

type ProjectDTO = {
	id: number
	name: string
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

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
	year: "numeric",
})

export async function renderTodoPage() {
	const body = ensureBody()

	body.innerHTML = `
		<div class="app-frame">
			${renderNavbar("todos")}
			<main class="todos-page">
				<header class="todos-header">
					<div>
						<p class="todos-title">Todos</p>
						<h1>Stay on top of work</h1>
					</div>
					<div class="todos-summary">
						<span>Total tasks</span>
						<strong id="todos-total">0</strong>
						<span id="todos-note">0 completed</span>
					</div>
				</header>
				<section class="todos-controls">
					<div class="todos-filters">
						<button type="button" data-filter="all" class="is-active">
							All
						</button>
						<button type="button" data-filter="open">Open</button>
						<button type="button" data-filter="done">Done</button>
					</div>
					<div class="todos-actions">
						<button type="button" id="open-todo-modal">Add todo</button>
						<button type="button" id="todos-create-project" class="todos-secondary">
							Create project
						</button>
					</div>
				</section>
				<p class="todos-hint" id="todos-hint"></p>
				<section class="todos-list">
					<div class="todos-list-header">
						<span>Task</span>
						<span>Project</span>
						<span>Status</span>
						<span></span>
					</div>
					<div class="todos-rows" id="todos-rows">
						<p class="todos-empty">Loading todos…</p>
					</div>
				</section>
			</main>
		</div>
		<div class="modal-backdrop" id="todo-modal" aria-hidden="true">
			<form class="modal" id="todo-form">
				<p class="todos-title">Add todo</p>
				<label>
					<span>Task name</span>
					<input id="todo-name" name="name" type="text" required />
				</label>
				<label>
					<span>Project</span>
					<select id="todo-project" name="project" required></select>
				</label>
				<label>
					<span>Description</span>
					<input id="todo-description" name="description" type="text" />
				</label>
				<label>
					<span>Deadline</span>
					<input id="todo-deadline" name="deadline" type="date" />
				</label>
				<p class="modal-error" id="todo-error" aria-live="polite"></p>
				<div class="modal-actions">
					<button type="button" id="todo-cancel">Cancel</button>
					<button type="submit">Add todo</button>
				</div>
			</form>
		</div>
	`

	bindNavbarHandlers(body)

	const openTodoModalButton =
		body.querySelector<HTMLButtonElement>("#open-todo-modal")
	const createProjectButton =
		body.querySelector<HTMLButtonElement>("#todos-create-project")
	const todoHint = body.querySelector<HTMLParagraphElement>("#todos-hint")
	const todoModalBackdrop = body.querySelector<HTMLDivElement>("#todo-modal")
	const todoForm = body.querySelector<HTMLFormElement>("#todo-form")
	const todoNameInput = body.querySelector<HTMLInputElement>("#todo-name")
	const todoProjectSelect =
		body.querySelector<HTMLSelectElement>("#todo-project")
	const todoDescriptionInput =
		body.querySelector<HTMLInputElement>("#todo-description")
	const todoDeadlineInput =
		body.querySelector<HTMLInputElement>("#todo-deadline")
	const todoError = body.querySelector<HTMLParagraphElement>("#todo-error")
	const todoCancel = body.querySelector<HTMLButtonElement>("#todo-cancel")
	const todosRows = body.querySelector<HTMLDivElement>("#todos-rows")
	const todosTotal = body.querySelector<HTMLSpanElement>("#todos-total")
	const todosNote = body.querySelector<HTMLSpanElement>("#todos-note")
	const filterButtons = body.querySelectorAll<HTMLButtonElement>(
		"[data-filter]",
	)

	const state = {
		filter: "all" as "all" | "open" | "done",
	}

	let todos: TodoDTO[] = []
	let projects: ProjectDTO[] = []
	let projectMap = new Map<number, string>()

	const todoModal = createModal({
		backdrop: todoModalBackdrop,
		focusTarget: todoNameInput,
		onOpen: () => {
			if (todoError) todoError.textContent = ""
		},
		onClose: () => {
			todoForm?.reset()
			if (todoError) todoError.textContent = ""
		},
	})

	function updateFilterButtons() {
		filterButtons.forEach((button) => {
			const filter = button.dataset.filter ?? "all"
			const isActive = filter === state.filter
			button.classList.toggle("is-active", isActive)
			button.setAttribute("aria-pressed", String(isActive))
		})
	}

	function updateProjectOptions() {
		if (!todoProjectSelect) return
		if (projects.length === 0) {
			todoProjectSelect.innerHTML = `<option value="">No projects yet</option>`
			todoProjectSelect.disabled = true
			return
		}
		const options = projects
			.map((project) => `<option value="${project.id}">${project.name}</option>`)
			.join("")
		todoProjectSelect.innerHTML = `
			<option value="" disabled>Select a project</option>
			${options}
		`
		todoProjectSelect.disabled = false
		const currentValue = todoProjectSelect.value
		const hasSelection = projects.some(
			(project) => String(project.id) === currentValue,
		)
		todoProjectSelect.value = hasSelection
			? currentValue
			: String(projects[0]?.id ?? "")
	}

	function updateProjectAvailability() {
		const hasProjects = projects.length > 0
		if (openTodoModalButton) openTodoModalButton.disabled = !hasProjects
		if (todoHint) {
			todoHint.textContent = hasProjects
				? ""
				: "Create a project in Time before adding todos."
		}
		if (createProjectButton) {
			createProjectButton.toggleAttribute("hidden", hasProjects)
		}
	}

	function updateSummary(filtered: TodoDTO[]) {
		if (!todosTotal || !todosNote) return
		const completedCount = todos.filter((todo) => todo.done === 1).length
		todosTotal.textContent = `${todos.length}`
		todosNote.textContent = `${completedCount} completed`
	}

	function getFilteredTodos() {
		if (state.filter === "open") {
			return todos.filter((todo) => todo.done === 0)
		}
		if (state.filter === "done") {
			return todos.filter((todo) => todo.done === 1)
		}
		return todos
	}

	function formatDeadline(deadline: string | null | undefined) {
		if (!deadline) return null
		const parsed = new Date(deadline)
		if (Number.isNaN(parsed.getTime())) {
			return deadline
		}
		return dateFormatter.format(parsed)
	}

	function renderTodosList(filtered: TodoDTO[]) {
		if (!todosRows) return
		if (filtered.length === 0) {
			const emptyMessage =
				state.filter === "done"
					? "No completed todos yet."
					: state.filter === "open"
						? "No open todos yet."
						: "No todos yet."
			todosRows.innerHTML = `<p class="todos-empty">${emptyMessage}</p>`
			return
		}
		const rows = filtered
			.map((todo) => {
				const projectName =
					projectMap.get(todo.project_id) ?? "Unknown project"
				const deadline = formatDeadline(todo.deadline)
				const description = todo.description
					? `<div class="todos-description">${todo.description}</div>`
					: ""
				const deadlineMarkup = deadline
					? `<div class="todos-deadline">Due ${deadline}</div>`
					: ""
				const isDone = todo.done === 1
				return `
					<div class="todos-row">
						<div>
							<div class="todos-name${isDone ? " is-done" : ""}">
								${todo.name}
							</div>
							${description}
							${deadlineMarkup}
						</div>
						<div class="todos-project">${projectName}</div>
						<div class="todos-status${isDone ? " is-done" : ""}">
							${isDone ? "Done" : "Open"}
						</div>
						<div class="todos-row-actions">
							<button
								type="button"
								data-action="toggle-todo"
								data-id="${todo.id}"
							>
								${isDone ? "Reopen" : "Mark done"}
							</button>
							<button type="button" data-action="delete-todo" data-id="${todo.id}">
								Delete
							</button>
						</div>
					</div>
				`
			})
			.join("")
		todosRows.innerHTML = rows
	}

	function updateView() {
		updateFilterButtons()
		const filtered = getFilteredTodos()
		updateSummary(filtered)
		renderTodosList(filtered)
	}

	async function loadProjects() {
		const response = await fetch("/api/projects", { credentials: "include" })
		if (!response.ok) {
			throw new Error("Failed to load projects")
		}
		projects = (await response.json()) as ProjectDTO[]
		projectMap = new Map(projects.map((project) => [project.id, project.name]))
		updateProjectOptions()
		updateProjectAvailability()
		updateView()
	}

	async function loadTodos() {
		const response = await fetch("/api/todos", { credentials: "include" })
		if (!response.ok) {
			throw new Error("Failed to load todos")
		}
		todos = (await response.json()) as TodoDTO[]
		updateView()
	}

	filterButtons.forEach((button) => {
		button.addEventListener("click", () => {
			const filter = button.dataset.filter
			if (filter === "open" || filter === "done" || filter === "all") {
				state.filter = filter
				updateView()
			}
		})
	})

	openTodoModalButton?.addEventListener("click", () => {
		if (projects.length === 0) return
		todoModal.open()
	})

	createProjectButton?.addEventListener("click", () => {
		navigate("/time")
	})

	todoCancel?.addEventListener("click", () => {
		todoModal.close()
	})

	todoForm?.addEventListener("submit", async (event) => {
		event.preventDefault()
		if (!todoNameInput || !todoProjectSelect) return
		if (todoError) todoError.textContent = ""
		const name = todoNameInput.value.trim()
		const projectIdValue = todoProjectSelect.value
		const projectId = Number(projectIdValue)
		if (!name) {
			if (todoError) todoError.textContent = "Enter a task name"
			return
		}
		if (!projectIdValue || Number.isNaN(projectId)) {
			if (todoError) todoError.textContent = "Select a project"
			return
		}
		const description = todoDescriptionInput?.value.trim() ?? ""
		const deadline = todoDeadlineInput?.value.trim() ?? ""
		try {
			const response = await fetch("/api/todo", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					name,
					projectId,
					description: description || undefined,
					deadline: deadline || undefined,
				}),
			})
			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as
					| { error?: string }
					| null
				if (todoError) {
					todoError.textContent = payload?.error ?? "Unable to add todo"
				}
				return
			}
			todoModal.close()
			await loadTodos()
		} catch (error) {
			console.error("Failed to add todo", error)
			if (todoError) {
				todoError.textContent = "Unable to add todo"
			}
		}
	})

	todosRows?.addEventListener("click", async (event) => {
		const target = event.target as HTMLElement
		const button = target.closest<HTMLButtonElement>("[data-action]")
		if (!button) return
		const id = Number(button.dataset.id)
		if (!Number.isInteger(id)) return
		const todo = todos.find((entry) => entry.id === id)
		if (!todo) return

		if (button.dataset.action === "delete-todo") {
			try {
				const response = await fetch(`/api/todo/${id}`, {
					method: "DELETE",
					credentials: "include",
				})
				if (!response.ok) {
					alert("Unable to delete todo")
					return
				}
				todos = todos.filter((entry) => entry.id !== id)
				updateView()
			} catch (error) {
				console.error("Failed to delete todo", error)
				alert("Unable to delete todo")
			}
			return
		}

		if (button.dataset.action === "toggle-todo") {
			const nextDone = todo.done === 0
			try {
				const response = await fetch(`/api/todo/${id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ done: nextDone }),
				})
				if (!response.ok) {
					alert("Unable to update todo")
					return
				}
				const updated = (await response.json()) as TodoDTO
				todos = todos.map((entry) => (entry.id === id ? updated : entry))
				updateView()
			} catch (error) {
				console.error("Failed to update todo", error)
				alert("Unable to update todo")
			}
		}
	})

	try {
		await Promise.all([loadProjects(), loadTodos()])
	} catch (error) {
		console.error("Failed to load todo data", error)
		if (todosRows) {
			todosRows.innerHTML =
				'<p class="todos-empty">Unable to load todos right now.</p>'
		}
		if (todoHint) {
			todoHint.textContent = "An error occurred"
		}
		if (openTodoModalButton) openTodoModalButton.disabled = true
	}
}

function ensureBody() {
	const body = document.querySelector("body")
	if (!body) {
		throw new Error("No body element found")
	}
	return body
}
