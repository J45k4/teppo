import type { SessionUser } from "./session"
import { BadRequestError, NotFoundError, UnauthorizedError, jsonResponse, type RequestContext } from "./wrap"
import type { SpreadsheetRow } from "./db"

export type SpreadsheetCreatePayload = {
	name: string
	description?: string
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
