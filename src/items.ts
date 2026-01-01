import type { ItemRow, UserItemRow } from "./db";
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

export type ItemCreatePayload = {
	name: string;
	containerId: number;
	description?: string | null;
	barcode?: string | null;
	cost?: number | null;
};

export type ItemUpdatePayload = {
	name?: string;
	containerId?: number;
	description?: string | null;
	barcode?: string | null;
	cost?: number | null;
};

export type ItemSharePayload = {
	userId: number;
};

function parseItemId(idParam: string | undefined): number | null {
	if (!idParam) return null;
	const parsed = Number(idParam);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseUserId(idParam: string | undefined): number | null {
	if (!idParam) return null;
	const parsed = Number(idParam);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isItemCreatePayload(value: unknown): value is ItemCreatePayload {
	if (!value || typeof value !== "object") return false;
	const payload = value as Record<string, unknown>;
	return (
		typeof payload.name === "string" &&
		payload.name.trim().length > 0 &&
		typeof payload.containerId === "number"
	);
}

export function listItems(ctx: RequestContext<SessionUser>): ItemRow[] {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const url = new URL(ctx.req.url);
	const containerParam = url.searchParams.get("containerId");
	if (containerParam) {
		const parsed = Number(containerParam);
		if (!Number.isInteger(parsed) || parsed <= 0) {
			throw new BadRequestError("Invalid containerId");
		}
		if (!ctx.db.hasContainerAccess(userId, parsed)) {
			throw new ForbiddenError();
		}
		return ctx.db.listItemsByContainerForUser(userId, parsed);
	}

	return ctx.db.listItemsForUser(userId);
}

export function getItem(ctx: RequestContext<SessionUser>): ItemRow {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const itemId = parseItemId(ctx.params.id);
	if (!itemId) {
		throw new BadRequestError("Invalid item id");
	}

	const item = ctx.db.getItemByIdForUser(itemId, userId);
	if (!item) {
		throw new NotFoundError("Item not found");
	}

	return item;
}

export function createItem(
	ctx: RequestContext<SessionUser>,
	payload: ItemCreatePayload | undefined,
): JsonEnvelope<{ id: number }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	if (!payload || !isItemCreatePayload(payload)) {
		throw new BadRequestError("Missing item fields");
	}

	if (!ctx.db.hasContainerAccess(userId, payload.containerId)) {
		throw new ForbiddenError();
	}

	const id = ctx.db.createItemForUser(userId, {
		name: payload.name.trim(),
		description: payload.description ?? null,
		barcode: payload.barcode ?? null,
		cost: payload.cost ?? null,
		containerId: payload.containerId,
	});

	return jsonResponse({ id }, { status: 201 });
}

export function updateItem(
	ctx: RequestContext<SessionUser>,
	payload: ItemUpdatePayload | undefined,
): ItemRow {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const itemId = parseItemId(ctx.params.id);
	if (!itemId) {
		throw new BadRequestError("Invalid item id");
	}

	const item = ctx.db.getItemByIdForUser(itemId, userId);
	if (!item) {
		throw new NotFoundError("Item not found");
	}

	if (!payload || typeof payload !== "object") {
		throw new BadRequestError("Missing update payload");
	}

	const nextName =
		typeof payload.name === "string" && payload.name.trim().length > 0
			? payload.name.trim()
			: item.name;
	const nextDescription =
		"description" in payload ? payload.description ?? null : item.description;
	const nextBarcode =
		"barcode" in payload ? payload.barcode ?? null : item.barcode;
	const nextCost = "cost" in payload ? payload.cost ?? null : item.cost;
	let nextContainerId = item.container_id;
	if (typeof payload.containerId === "number") {
		if (!ctx.db.hasContainerAccess(userId, payload.containerId)) {
			throw new ForbiddenError();
		}
		nextContainerId = payload.containerId;
	}

	ctx.db.updateItem(
		itemId,
		nextName,
		nextDescription,
		nextBarcode,
		nextCost,
		nextContainerId,
	);

	return ctx.db.getItemById(itemId) ?? item;
}

export function deleteItem(
	ctx: RequestContext<SessionUser>,
): JsonEnvelope<{ ok: true }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const itemId = parseItemId(ctx.params.id);
	if (!itemId) {
		throw new BadRequestError("Invalid item id");
	}

	const item = ctx.db.getItemByIdForUser(itemId, userId);
	if (!item) {
		throw new NotFoundError("Item not found");
	}

	ctx.db.deleteItem(itemId);
	return jsonResponse({ ok: true });
}

export function listItemUsers(
	ctx: RequestContext<SessionUser>,
): UserItemRow[] {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const itemId = parseItemId(ctx.params.id);
	if (!itemId) {
		throw new BadRequestError("Invalid item id");
	}

	if (!ctx.db.hasItemAccess(userId, itemId)) {
		throw new ForbiddenError();
	}

	return ctx.db.listUserItemsByItem(itemId);
}

export function addItemUser(
	ctx: RequestContext<SessionUser>,
	payload: ItemSharePayload | undefined,
): JsonEnvelope<{ ok: true }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const itemId = parseItemId(ctx.params.id);
	if (!itemId) {
		throw new BadRequestError("Invalid item id");
	}

	if (!payload || typeof payload.userId !== "number") {
		throw new BadRequestError("Missing userId");
	}

	if (!ctx.db.hasItemAccess(userId, itemId)) {
		throw new ForbiddenError();
	}

	const targetUser = ctx.db.getUserById(payload.userId);
	if (!targetUser) {
		throw new NotFoundError("User not found");
	}

	ctx.db.addUserToItem(payload.userId, itemId);
	return jsonResponse({ ok: true }, { status: 201 });
}

export function removeItemUser(
	ctx: RequestContext<SessionUser>,
): JsonEnvelope<{ ok: true }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const itemId = parseItemId(ctx.params.id);
	const targetUserId = parseUserId(ctx.params.userId);
	if (!itemId || !targetUserId) {
		throw new BadRequestError("Invalid item id or user id");
	}

	if (!ctx.db.hasItemAccess(userId, itemId)) {
		throw new ForbiddenError();
	}

	ctx.db.removeUserFromItem(targetUserId, itemId);
	return jsonResponse({ ok: true });
}
