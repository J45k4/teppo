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
					<div class="todos-actions">
						<button type="button" id="open-todo-modal">Add todo</button>
						<button type="button" id="todos-create-project" class="todos-secondary">
							Create project
						</button>
					</div>
				</section>
				<p class="todos-hint" id="todos-hint"></p>
				<section class="todos-board" id="todos-board">
					<p class="todos-empty">Loading todos…</p>
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
	const todosBoard = body.querySelector<HTMLDivElement>("#todos-board")
	const todosTotal = body.querySelector<HTMLSpanElement>("#todos-total")
	const todosNote = body.querySelector<HTMLSpanElement>("#todos-note")

	let todos: TodoDTO[] = []
	let projects: ProjectDTO[] = []

	const getProjectIdFromDrop = (target: EventTarget | null) => {
		if (!(target instanceof HTMLElement)) return null
		const column = target.closest<HTMLElement>("[data-project-id]")
		if (!column) return null
		const id = column.dataset.projectId ?? ""
		if (!id || id === "unassigned") return null
		const parsed = Number(id)
		return Number.isInteger(parsed) ? parsed : null
	}

	const getStatusFromDrop = (target: EventTarget | null) => {
		if (!(target instanceof HTMLElement)) return null
		const section = target.closest<HTMLElement>("[data-status]")
		const status = section?.dataset.status ?? null
		if (status === "open" || status === "done") return status
		return null
	}

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

	function formatDeadline(deadline: string | null | undefined) {
		if (!deadline) return null
		const parsed = new Date(deadline)
		if (Number.isNaN(parsed.getTime())) {
			return deadline
		}
		return dateFormatter.format(parsed)
	}

	function renderTodosBoard() {
		if (!todosBoard) return
		const projectIds = new Set(projects.map((project) => project.id))
		const orphanedTodos = todos.filter(
			(todo) => !projectIds.has(todo.project_id),
		)

		const renderCards = (entries: TodoDTO[], stateLabel: string) => {
			if (entries.length === 0) {
				return `<p class="todos-column-empty">No ${stateLabel} todos.</p>`
			}
			return entries
				.map((todo) => {
					const deadline = formatDeadline(todo.deadline)
					const description = todo.description
						? `<div class="todos-description">${todo.description}</div>`
						: ""
					const deadlineMarkup = deadline
						? `<div class="todos-deadline">Due ${deadline}</div>`
						: ""
					const isDone = todo.done === 1
					return `
						<div class="todos-card${isDone ? " is-done" : ""}" draggable="true" data-todo-id="${todo.id}">
							<div class="todos-name${isDone ? " is-done" : ""}">
								${todo.name}
							</div>
							${description}
							${deadlineMarkup}
							<div class="todos-card-actions">
								<button
									type="button"
									data-action="toggle-todo"
									data-id="${todo.id}"
								>
									${isDone ? "Reopen" : "Mark done"}
								</button>
								<button
									type="button"
									data-action="delete-todo"
									data-id="${todo.id}"
								>
									Delete
								</button>
							</div>
						</div>
					`
				})
				.join("")
		}

		const columns = projects
			.map((project) => {
				const projectTodos = todos.filter(
					(todo) => todo.project_id === project.id,
				)
				const openTodos = projectTodos.filter((todo) => todo.done === 0)
				const doneTodos = projectTodos.filter((todo) => todo.done === 1)

				return `
					<section class="todos-column" data-project-id="${project.id}">
						<header class="todos-column-header">
							<div class="todos-column-title">${project.name}</div>
							<div class="todos-column-meta">
								${openTodos.length} open • ${doneTodos.length} done
							</div>
						</header>
						<div class="todos-column-section" data-status="open">
							<p class="todos-column-label">Open</p>
							<div class="todos-card-list">
								${renderCards(openTodos, "open")}
							</div>
						</div>
						<div class="todos-column-section" data-status="done">
							<p class="todos-column-label">Done</p>
							<div class="todos-card-list">
								${renderCards(doneTodos, "completed")}
							</div>
						</div>
					</section>
				`
			})
			.join("")

		const orphanColumn = orphanedTodos.length
			? `
				<section class="todos-column" data-project-id="unassigned">
					<header class="todos-column-header">
						<div class="todos-column-title">Unassigned</div>
						<div class="todos-column-meta">
							${orphanedTodos.filter((todo) => todo.done === 0).length} open • ${
				orphanedTodos.filter((todo) => todo.done === 1).length
			} done
						</div>
					</header>
					<div class="todos-column-section" data-status="open">
						<p class="todos-column-label">Open</p>
						<div class="todos-card-list">
							${renderCards(
								orphanedTodos.filter((todo) => todo.done === 0),
								"open",
							)}
						</div>
					</div>
					<div class="todos-column-section" data-status="done">
						<p class="todos-column-label">Done</p>
						<div class="todos-card-list">
							${renderCards(
								orphanedTodos.filter((todo) => todo.done === 1),
								"completed",
							)}
						</div>
					</div>
				</section>
			`
			: ""

		const boardMarkup = [columns, orphanColumn].filter(Boolean).join("")
		todosBoard.innerHTML =
			boardMarkup || `<p class="todos-empty">No todos yet.</p>`
	}

	function updateView() {
		updateSummary(todos)
		renderTodosBoard()
	}

	async function loadProjects() {
		const response = await fetch("/api/projects", { credentials: "include" })
		if (!response.ok) {
			throw new Error("Failed to load projects")
		}
		projects = (await response.json()) as ProjectDTO[]
		updateProjectOptions()
		updateProjectAvailability()
		updateView()
	}

	async function loadTodos() {
		const response = await fetch("/api/todos", { credentials: "include" })
		if (!response.ok) {
			throw new Error("Failed to load todos")
		}
		const payload = (await response.json()) as TodoDTO[]
		todos = payload.map((todo) => ({
			...todo,
			project_id: Number(todo.project_id),
			done: todo.done ? 1 : 0,
		}))
		updateView()
	}

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

	todosBoard?.addEventListener("click", async (event) => {
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

	todosBoard?.addEventListener("dragstart", (event) => {
		const target = event.target as HTMLElement
		const card = target.closest<HTMLElement>("[data-todo-id]")
		if (!card || !(event instanceof DragEvent)) return
		const id = card.dataset.todoId
		if (!id) return
		event.dataTransfer?.setData("text/plain", id)
		event.dataTransfer?.setData("application/x-teppo-todo", id)
		event.dataTransfer?.setDragImage(card, 20, 20)
		card.classList.add("is-dragging")
	})

	todosBoard?.addEventListener("dragend", (event) => {
		const target = event.target as HTMLElement
		const card = target.closest<HTMLElement>("[data-todo-id]")
		card?.classList.remove("is-dragging")
	})

	todosBoard?.addEventListener("dragover", (event) => {
		const target = event.target as HTMLElement
		if (!target.closest("[data-project-id]")) return
		event.preventDefault()
	})

	todosBoard?.addEventListener("drop", async (event) => {
		event.preventDefault()
		const data =
			event.dataTransfer?.getData("application/x-teppo-todo") ??
			event.dataTransfer?.getData("text/plain")
		const id = Number(data)
		if (!Number.isInteger(id)) return
		const todo = todos.find((entry) => entry.id === id)
		if (!todo) return
		const nextProjectId = getProjectIdFromDrop(event.target)
		const status = getStatusFromDrop(event.target)
		if (!nextProjectId || !status) return
		const nextDone = status === "done"
		if (todo.project_id === nextProjectId && todo.done === (nextDone ? 1 : 0)) {
			return
		}
		try {
			const response = await fetch(`/api/todo/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					projectId: nextProjectId,
					done: nextDone,
				}),
			})
			if (!response.ok) {
				alert("Unable to move todo")
				return
			}
			const updated = (await response.json()) as TodoDTO
			todos = todos.map((entry) => (entry.id === id ? updated : entry))
			updateView()
		} catch (error) {
			console.error("Failed to move todo", error)
			alert("Unable to move todo")
		}
	})

	try {
		await Promise.all([loadProjects(), loadTodos()])
	} catch (error) {
		console.error("Failed to load todo data", error)
		if (todosBoard) {
			todosBoard.innerHTML =
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
