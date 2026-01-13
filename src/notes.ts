import type { NoteRow } from "./db"
import type { SessionUser } from "./session"
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
	jsonResponse,
	type JsonEnvelope,
	type RequestContext,
} from "./wrap"

export type NoteCreatePayload = {
	title: string
	body?: string | null
}

export type NoteUpdatePayload = {
	title?: string
	body?: string | null
}

function parseNoteId(idParam: string | undefined): number | null {
	if (!idParam) return null
	const parsed = Number(idParam)
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function isNoteCreatePayload(value: unknown): value is NoteCreatePayload {
	if (!value || typeof value !== "object") return false
	const payload = value as Record<string, unknown>
	return typeof payload.title === "string"
}

function normalizeTitle(title: string): string {
	return title.trim()
}

export function listNotes(ctx: RequestContext<SessionUser>): NoteRow[] {
	const userId = ctx.user?.userId
	if (!userId) {
		throw new UnauthorizedError()
	}

	return ctx.db.listNotesByUser(userId)
}

export function getNote(ctx: RequestContext<SessionUser>): NoteRow {
	const userId = ctx.user?.userId
	if (!userId) {
		throw new UnauthorizedError()
	}

	const noteId = parseNoteId(ctx.params.id)
	if (!noteId) {
		throw new BadRequestError("Invalid note id")
	}

	const note = ctx.db.getNoteById(noteId)
	if (!note) {
		throw new NotFoundError("Note not found")
	}

	if (note.user_id !== userId) {
		throw new ForbiddenError()
	}

	return note
}

export function createNote(
	ctx: RequestContext<SessionUser>,
	payload: NoteCreatePayload | undefined,
): JsonEnvelope<{ id: number }> {
	const userId = ctx.user?.userId
	if (!userId) {
		throw new UnauthorizedError()
	}

	if (!payload || !isNoteCreatePayload(payload)) {
		throw new BadRequestError("Missing note title")
	}

	const title = normalizeTitle(payload.title)
	if (!title) {
		throw new BadRequestError("Missing note title")
	}

	const id = ctx.db.createNote(userId, title, payload.body ?? null)
	return jsonResponse({ id }, { status: 201 })
}

export function updateNote(
	ctx: RequestContext<SessionUser>,
	payload: NoteUpdatePayload | undefined,
): NoteRow {
	const userId = ctx.user?.userId
	if (!userId) {
		throw new UnauthorizedError()
	}

	const noteId = parseNoteId(ctx.params.id)
	if (!noteId) {
		throw new BadRequestError("Invalid note id")
	}

	const note = ctx.db.getNoteById(noteId)
	if (!note) {
		throw new NotFoundError("Note not found")
	}

	if (note.user_id !== userId) {
		throw new ForbiddenError()
	}

	if (!payload || typeof payload !== "object") {
		throw new BadRequestError("Missing update payload")
	}

	const nextTitle =
		typeof payload.title === "string"
			? normalizeTitle(payload.title)
			: note.title
	if (!nextTitle) {
		throw new BadRequestError("Missing note title")
	}

	const nextBody =
		"body" in payload ? payload.body ?? null : note.body

	ctx.db.updateNote(noteId, nextTitle, nextBody)
	return ctx.db.getNoteById(noteId) ?? note
}

export function deleteNote(
	ctx: RequestContext<SessionUser>,
): JsonEnvelope<{ ok: true }> {
	const userId = ctx.user?.userId
	if (!userId) {
		throw new UnauthorizedError()
	}

	const noteId = parseNoteId(ctx.params.id)
	if (!noteId) {
		throw new BadRequestError("Invalid note id")
	}

	const note = ctx.db.getNoteById(noteId)
	if (!note) {
		throw new NotFoundError("Note not found")
	}

	if (note.user_id !== userId) {
		throw new ForbiddenError()
	}

	ctx.db.deleteNote(noteId)
	return jsonResponse({ ok: true })
}
