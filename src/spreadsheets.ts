import type { SessionUser } from "./session"
import { BadRequestError, NotFoundError, UnauthorizedError, jsonResponse, type RequestContext } from "./wrap"
import type { SpreadsheetRow } from "./db"

export type SpreadsheetCreatePayload = {
	name: string
	description?: string
}

export type SpreadsheetStatePayload = {
	state: unknown
}

function parseSpreadsheetId(idParam: string | undefined): number | null {
	if (!idParam) return null
	const parsed = Number(idParam)
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function isSpreadsheetCreatePayload(value: unknown): value is SpreadsheetCreatePayload {
	if (!value || typeof value !== "object") return false
	const payload = value as Record<string, unknown>
	return typeof payload.name === "string" && payload.name.trim().length > 0
}

function isSpreadsheetStatePayload(value: unknown): value is SpreadsheetStatePayload {
	if (!value || typeof value !== "object") return false
	return "state" in (value as Record<string, unknown>)
}

export function listSpreadsheets(ctx: RequestContext<SessionUser>): SpreadsheetRow[] {
	const userId = ctx.user?.userId
	if (!userId) {
		throw new UnauthorizedError()
	}
	return ctx.db.listSpreadsheetsForUser(userId)
}

export function getSpreadsheet(ctx: RequestContext<SessionUser>): SpreadsheetRow {
	const userId = ctx.user?.userId
	if (!userId) {
		throw new UnauthorizedError()
	}
	const spreadsheetId = parseSpreadsheetId(ctx.params.id)
	if (!spreadsheetId) {
		throw new BadRequestError("Invalid spreadsheet id")
	}
	const row = ctx.db.getSpreadsheetByIdForUser(spreadsheetId, userId)
	if (!row) {
		throw new NotFoundError("Spreadsheet not found")
	}
	return row
}

export function createSpreadsheet(
	ctx: RequestContext<SessionUser>,
	payload: SpreadsheetCreatePayload | undefined,
) {
	const userId = ctx.user?.userId
	if (!userId) {
		throw new UnauthorizedError()
	}

	if (!payload || !isSpreadsheetCreatePayload(payload)) {
		throw new BadRequestError("Missing spreadsheet name")
	}

	const name = payload.name.trim()
	const descriptionValue =
		typeof payload.description === "string" && payload.description.trim()
			? payload.description.trim()
			: null

	const id = ctx.db.createSpreadsheet(userId, name, descriptionValue)
	return jsonResponse({ id }, { status: 201 })
}

export function updateSpreadsheetState(
	ctx: RequestContext<SessionUser>,
	payload: SpreadsheetStatePayload | undefined,
) {
	const userId = ctx.user?.userId
	if (!userId) {
		throw new UnauthorizedError()
	}

	const spreadsheetId = parseSpreadsheetId(ctx.params.id)
	if (!spreadsheetId) {
		throw new BadRequestError("Invalid spreadsheet id")
	}

	if (!payload || !isSpreadsheetStatePayload(payload)) {
		throw new BadRequestError("Missing spreadsheet state")
	}

	const row = ctx.db.getSpreadsheetByIdForUser(spreadsheetId, userId)
	if (!row) {
		throw new NotFoundError("Spreadsheet not found")
	}

	let stateValue: string | null = null
	if (payload.state !== null) {
		try {
			stateValue = JSON.stringify(payload.state)
		} catch {
			throw new BadRequestError("Invalid spreadsheet state")
		}

		if (stateValue.length > 250_000) {
			throw new BadRequestError("Spreadsheet state too large")
		}
	}

	ctx.db.updateSpreadsheetStateForUser(spreadsheetId, userId, stateValue)
	return jsonResponse({ ok: true as const })
}
