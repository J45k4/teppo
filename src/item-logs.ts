import type { ItemLogRow } from "./db";
import type { SessionUser } from "./session";
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
	jsonResponse,
	type JsonEnvelope,
	type RequestContext,
} from "./wrap";

export type ItemLogCreatePayload = {
	itemId: number;
	log: string;
	timestamp?: string;
};

export type ItemLogUpdatePayload = {
	log?: string;
	timestamp?: string;
};

function parseItemLogId(idParam: string | undefined): number | null {
	if (!idParam) return null;
	const parsed = Number(idParam);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isItemLogCreatePayload(
	value: unknown,
): value is ItemLogCreatePayload {
	if (!value || typeof value !== "object") return false;
	const payload = value as Record<string, unknown>;
	return (
		typeof payload.itemId === "number" &&
		typeof payload.log === "string" &&
		payload.log.trim().length > 0
	);
}

export function listItemLogs(
	ctx: RequestContext<SessionUser>,
): ItemLogRow[] {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const url = new URL(ctx.req.url);
	const itemParam = url.searchParams.get("itemId");
	if (!itemParam) {
		throw new BadRequestError("Missing itemId");
	}
	const itemId = Number(itemParam);
	if (!Number.isInteger(itemId) || itemId <= 0) {
		throw new BadRequestError("Invalid itemId");
	}

	if (!ctx.db.hasItemAccess(userId, itemId)) {
		throw new ForbiddenError();
	}

	return ctx.db.listItemLogsByItemForUser(userId, itemId);
}

export function getItemLog(ctx: RequestContext<SessionUser>): ItemLogRow {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const logId = parseItemLogId(ctx.params.id);
	if (!logId) {
		throw new BadRequestError("Invalid item log id");
	}

	const log = ctx.db.getItemLogById(logId);
	if (!log) {
		throw new NotFoundError("Item log not found");
	}

	if (log.user_id !== userId) {
		throw new ForbiddenError();
	}

	return log;
}

export function createItemLog(
	ctx: RequestContext<SessionUser>,
	payload: ItemLogCreatePayload | undefined,
): JsonEnvelope<{ id: number }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	if (!payload || !isItemLogCreatePayload(payload)) {
		throw new BadRequestError("Missing log fields");
	}

	if (!ctx.db.hasItemAccess(userId, payload.itemId)) {
		throw new ForbiddenError();
	}

	const id = ctx.db.addItemLog(
		payload.itemId,
		userId,
		payload.log.trim(),
		payload.timestamp,
	);
	return jsonResponse({ id }, { status: 201 });
}

export function updateItemLog(
	ctx: RequestContext<SessionUser>,
	payload: ItemLogUpdatePayload | undefined,
): ItemLogRow {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const logId = parseItemLogId(ctx.params.id);
	if (!logId) {
		throw new BadRequestError("Invalid item log id");
	}

	const log = ctx.db.getItemLogById(logId);
	if (!log) {
		throw new NotFoundError("Item log not found");
	}

	if (log.user_id !== userId) {
		throw new ForbiddenError();
	}

	if (!payload || typeof payload !== "object") {
		throw new BadRequestError("Missing update payload");
	}

	const nextLog =
		typeof payload.log === "string" && payload.log.trim().length > 0
			? payload.log.trim()
			: log.log;
	const nextTimestamp =
		typeof payload.timestamp === "string" ? payload.timestamp : log.timestamp;

	ctx.db.updateItemLog(logId, nextLog, nextTimestamp);
	return ctx.db.getItemLogById(logId) ?? log;
}

export function deleteItemLog(
	ctx: RequestContext<SessionUser>,
): JsonEnvelope<{ ok: true }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const logId = parseItemLogId(ctx.params.id);
	if (!logId) {
		throw new BadRequestError("Invalid item log id");
	}

	const log = ctx.db.getItemLogById(logId);
	if (!log) {
		throw new NotFoundError("Item log not found");
	}

	if (log.user_id !== userId) {
		throw new ForbiddenError();
	}

	ctx.db.deleteItemLog(logId);
	return jsonResponse({ ok: true });
}
