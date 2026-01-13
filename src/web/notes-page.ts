import { bindNavbarHandlers, renderNavbar } from "./nav"

type NoteDTO = {
	id: number
	title: string
	body?: string | null
	created_at: string
	updated_at: string
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
	year: "numeric",
})

export async function renderNotesPage() {
	const body = ensureBody()

	body.innerHTML = `
		<div class="app-frame">
			${renderNavbar("notes")}
			<main class="notes-page">
				<header class="notes-toolbar">
					<div class="notes-toolbar-title">
						<p class="notes-title">Notes</p>
						<h1>Notes</h1>
						<div class="notes-summary">
							<strong id="notes-total">0</strong>
							<span id="notes-note">No notes yet</span>
						</div>
					</div>
					<div class="notes-toolbar-actions">
						<div class="notes-search">
							<input
								id="notes-search-input"
								type="search"
								placeholder="Search"
								aria-label="Search notes"
							/>
						</div>
						<button type="button" id="notes-new">New note</button>
					</div>
				</header>
				<section class="notes-layout">
					<aside class="notes-sidebar">
						<div class="notes-sidebar-header">
							<p class="notes-section-title">All notes</p>
							<span class="notes-section-subtitle">Private</span>
						</div>
						<div class="notes-list" id="notes-list">
							<p class="notes-empty">Loading notes…</p>
						</div>
					</aside>
					<section class="notes-editor">
						<div class="notes-editor-header">
							<div>
								<h2 id="notes-selected-title">Select a note</h2>
								<p class="notes-meta" id="notes-meta"></p>
							</div>
							<div class="notes-editor-actions">
								<button type="button" id="notes-save" disabled>Save</button>
								<button type="button" id="notes-delete" disabled>Delete</button>
							</div>
						</div>
						<form class="notes-form" id="notes-form">
							<label>
								<span class="notes-field-label">Details</span>
								<textarea
									id="notes-body-input"
									name="body"
									rows="18"
									placeholder="Start typing"
								></textarea>
							</label>
							<p class="notes-error" id="notes-error" aria-live="polite"></p>
						</form>
					</section>
				</section>
			</main>
		</div>
	`

	bindNavbarHandlers(body)

	const notesNewButton = body.querySelector<HTMLButtonElement>("#notes-new")
	const notesList = body.querySelector<HTMLDivElement>("#notes-list")
	const notesTotal = body.querySelector<HTMLSpanElement>("#notes-total")
	const notesNote = body.querySelector<HTMLSpanElement>("#notes-note")
	const notesSelectedTitle = body.querySelector<HTMLHeadingElement>(
		"#notes-selected-title",
	)
	const notesMeta = body.querySelector<HTMLParagraphElement>("#notes-meta")
	const notesForm = body.querySelector<HTMLFormElement>("#notes-form")
	const notesBodyInput = body.querySelector<HTMLTextAreaElement>(
		"#notes-body-input",
	)
	const notesSave = body.querySelector<HTMLButtonElement>("#notes-save")
	const notesDelete = body.querySelector<HTMLButtonElement>("#notes-delete")
	const notesError = body.querySelector<HTMLParagraphElement>("#notes-error")
	const notesSearchInput = body.querySelector<HTMLInputElement>(
		"#notes-search-input",
	)

	let notes: NoteDTO[] = []
	let activeNoteId: number | null = null
	let searchQuery = ""

	const formatDate = (value: string) => {
		const parsed = new Date(value)
		if (Number.isNaN(parsed.getTime())) return value
		return dateFormatter.format(parsed)
	}

	const getTitleFromBody = (value: string) => {
		const titleLine = value
			.split("\n")
			.map((line) => line.trim())
			.find((line) => line.length > 0)
		if (!titleLine) return ""
		return titleLine.length > 80 ? `${titleLine.slice(0, 80)}…` : titleLine
	}

	const setError = (message: string) => {
		if (notesError) notesError.textContent = message
	}

	const clearError = () => {
		if (notesError) notesError.textContent = ""
	}

	const getActiveNote = () =>
		activeNoteId === null
			? null
			: notes.find((note) => note.id === activeNoteId) ?? null

	const getFilteredNotes = () => {
		if (!searchQuery) return notes
		const query = searchQuery.toLowerCase()
		return notes.filter((note) => {
			const title = note.title.toLowerCase()
			const body = note.body?.toLowerCase() ?? ""
			return title.includes(query) || body.includes(query)
		})
	}

	const updateSummary = () => {
		if (!notesTotal || !notesNote) return
		notesTotal.textContent = `${notes.length}`
		if (notes.length === 0) {
			notesNote.textContent = "No notes yet"
			return
		}
		if (searchQuery) {
			const filtered = getFilteredNotes()
			notesNote.textContent = `Showing ${filtered.length} of ${notes.length}`
			return
		}
		const latest = notes[0]
		const label = latest?.updated_at
			? `Last updated ${formatDate(latest.updated_at)}`
			: ""
		notesNote.textContent = label
	}

	const updateEditorHeader = (note: NoteDTO | null) => {
		if (notesSelectedTitle) {
			notesSelectedTitle.textContent = note ? note.title : "Select a note"
		}
		if (notesMeta) {
			if (!note) {
				notesMeta.textContent = ""
				return
			}
			const updated = note.updated_at ? formatDate(note.updated_at) : ""
			notesMeta.textContent = updated ? `Updated ${updated}` : ""
		}
	}

	const updateForm = (note: NoteDTO | null) => {
		if (!notesBodyInput) return
		notesBodyInput.value = note?.body ?? ""
		updateEditorHeader(note)
		if (notesDelete) {
			notesDelete.disabled = !note
		}
		if (notesSave) {
			notesSave.disabled = notesBodyInput.value.trim().length === 0
		}
	}

	const updateDraftHeader = () => {
		if (!notesSelectedTitle || activeNoteId !== null) return
		const title = getTitleFromBody(notesBodyInput?.value ?? "")
		notesSelectedTitle.textContent = title || "New note"
		if (notesMeta) notesMeta.textContent = ""
	}

	const renderNotesList = () => {
		if (!notesList) return
		const filteredNotes = getFilteredNotes()
		if (notes.length === 0) {
			notesList.innerHTML = '<p class="notes-empty">No notes yet.</p>'
			return
		}
		if (filteredNotes.length === 0) {
			notesList.innerHTML = '<p class="notes-empty">No matches found.</p>'
			return
		}
		notesList.innerHTML = filteredNotes
			.map((note) => {
				const isActive = note.id === activeNoteId
				const updated = note.updated_at
					? `Updated ${formatDate(note.updated_at)}`
					: ""
				return `
					<button type="button" class="notes-card${
						isActive ? " is-active" : ""
					}" data-note-id="${note.id}">
						<div class="notes-card-title">${note.title}</div>
						<div class="notes-card-meta">${updated}</div>
					</button>
				`
			})
			.join("")
	}

	const setActiveNote = (noteId: number | null) => {
		activeNoteId = noteId
		const note = getActiveNote()
		updateForm(note)
		renderNotesList()
	}

	const refreshView = () => {
		updateSummary()
		const filteredNotes = getFilteredNotes()
		if (searchQuery && filteredNotes.length > 0) {
			if (!filteredNotes.some((note) => note.id === activeNoteId)) {
				activeNoteId = filteredNotes[0]?.id ?? null
			}
		}
		renderNotesList()
		if (activeNoteId !== null && !getActiveNote()) {
			activeNoteId = null
		}
		updateForm(getActiveNote())
	}

	const loadNotes = async () => {
		const response = await fetch("/api/notes", { credentials: "include" })
		if (!response.ok) {
			throw new Error("Failed to load notes")
		}
		notes = (await response.json()) as NoteDTO[]
		if (notes.length > 0 && activeNoteId === null) {
			activeNoteId = notes[0]?.id ?? null
		}
		refreshView()
	}

	const saveNote = async () => {
		if (!notesBodyInput || !notesSave) return
		clearError()
		const bodyValue = notesBodyInput.value.trim()
		if (!bodyValue) {
			setError("Add some note text")
			return
		}
		const title = getTitleFromBody(bodyValue) || "Untitled"
		const payload = {
			title,
			body: bodyValue.length > 0 ? bodyValue : null,
		}

		notesSave.disabled = true
		try {
			if (activeNoteId === null) {
				const response = await fetch("/api/notes", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify(payload),
				})
				if (!response.ok) {
					const errorPayload = (await response.json().catch(() => null)) as
						| { error?: string }
						| null
					throw new Error(errorPayload?.error ?? "Failed to save note")
				}
				const created = (await response.json()) as { id: number }
				activeNoteId = created.id
				await loadNotes()
				return
			}

			const response = await fetch(`/api/notes/${activeNoteId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(payload),
			})
			if (!response.ok) {
				const errorPayload = (await response.json().catch(() => null)) as
					| { error?: string }
					| null
				throw new Error(errorPayload?.error ?? "Failed to update note")
			}
			const updated = (await response.json()) as NoteDTO
			notes = notes.map((note) => (note.id === updated.id ? updated : note))
			activeNoteId = updated.id
			refreshView()
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to save"
			setError(message)
		} finally {
			if (notesSave) {
				notesSave.disabled = notesBodyInput.value.trim().length === 0
			}
		}
	}

	const deleteNote = async () => {
		if (!notesDelete || activeNoteId === null) return
		clearError()
		const response = await fetch(`/api/notes/${activeNoteId}`, {
			method: "DELETE",
			credentials: "include",
		})
		if (!response.ok) {
			setError("Failed to delete note")
			return
		}
		notes = notes.filter((note) => note.id !== activeNoteId)
		activeNoteId = notes[0]?.id ?? null
		refreshView()
	}

	notesNewButton?.addEventListener("click", () => {
		activeNoteId = null
		updateForm(null)
		updateDraftHeader()
		renderNotesList()
		clearError()
	})

	notesList?.addEventListener("click", (event) => {
		const target = event.target as HTMLElement | null
		const button = target?.closest<HTMLButtonElement>("[data-note-id]")
		if (!button) return
		const idValue = button.dataset.noteId ?? ""
		const parsed = Number(idValue)
		if (!Number.isInteger(parsed)) return
		setActiveNote(parsed)
		clearError()
	})

	notesBodyInput?.addEventListener("input", () => {
		if (notesSave) {
			notesSave.disabled = notesBodyInput.value.trim().length === 0
		}
		updateDraftHeader()
	})

	notesSearchInput?.addEventListener("input", () => {
		searchQuery = notesSearchInput.value.trim()
		refreshView()
	})

	notesSave?.addEventListener("click", () => {
		void saveNote()
	})

	notesDelete?.addEventListener("click", () => {
		void deleteNote()
	})

	notesForm?.addEventListener("submit", (event) => {
		event.preventDefault()
		void saveNote()
	})

	try {
		await loadNotes()
	} catch (error) {
		if (notesList) {
			notesList.innerHTML =
				'<p class="notes-empty">Failed to load notes.</p>'
		}
	}
}

function ensureBody() {
	const body = document.querySelector("body")
	if (!body) throw new Error("No body element found")
	return body
}
