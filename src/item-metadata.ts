import type { ItemMetadataRow } from "./db";
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

export type ItemMetadataCreatePayload = {
	itemId: number;
	key: string;
	value: string;
};

export type ItemMetadataUpdatePayload = {
	key?: string;
	value?: string;
};

function parseItemMetadataId(idParam: string | undefined): number | null {
	if (!idParam) return null;
	const parsed = Number(idParam);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isItemMetadataCreatePayload(
	value: unknown,
): value is ItemMetadataCreatePayload {
	if (!value || typeof value !== "object") return false;
	const payload = value as Record<string, unknown>;
	return (
		typeof payload.itemId === "number" &&
		typeof payload.key === "string" &&
		typeof payload.value === "string"
	);
}

export function listItemMetadata(
	ctx: RequestContext<SessionUser>,
): ItemMetadataRow[] {
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

	return ctx.db.listItemMetadata(itemId);
}

export function getItemMetadata(
	ctx: RequestContext<SessionUser>,
): ItemMetadataRow {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const metadataId = parseItemMetadataId(ctx.params.id);
	if (!metadataId) {
		throw new BadRequestError("Invalid metadata id");
	}

	const metadata = ctx.db.getItemMetadataById(metadataId);
	if (!metadata) {
		throw new NotFoundError("Metadata not found");
	}

	if (!ctx.db.hasItemAccess(userId, metadata.item_id)) {
		throw new ForbiddenError();
	}

	return metadata;
}

export function createItemMetadata(
	ctx: RequestContext<SessionUser>,
	payload: ItemMetadataCreatePayload | undefined,
): JsonEnvelope<{ id: number }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	if (!payload || !isItemMetadataCreatePayload(payload)) {
		throw new BadRequestError("Missing metadata fields");
	}

	if (!ctx.db.hasItemAccess(userId, payload.itemId)) {
		throw new ForbiddenError();
	}

	const id = ctx.db.addItemMetadata(
		payload.itemId,
		payload.key,
		payload.value,
	);
	return jsonResponse({ id }, { status: 201 });
}

export function updateItemMetadata(
	ctx: RequestContext<SessionUser>,
	payload: ItemMetadataUpdatePayload | undefined,
): ItemMetadataRow {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const metadataId = parseItemMetadataId(ctx.params.id);
	if (!metadataId) {
		throw new BadRequestError("Invalid metadata id");
	}

	const metadata = ctx.db.getItemMetadataById(metadataId);
	if (!metadata) {
		throw new NotFoundError("Metadata not found");
	}

	if (!ctx.db.hasItemAccess(userId, metadata.item_id)) {
		throw new ForbiddenError();
	}

	if (!payload || typeof payload !== "object") {
		throw new BadRequestError("Missing update payload");
	}

	const nextKey =
		typeof payload.key === "string" ? payload.key : metadata.key;
	const nextValue =
		typeof payload.value === "string" ? payload.value : metadata.value;

	ctx.db.updateItemMetadata(metadataId, nextKey, nextValue);
	return ctx.db.getItemMetadataById(metadataId) ?? metadata;
}

export function deleteItemMetadata(
	ctx: RequestContext<SessionUser>,
): JsonEnvelope<{ ok: true }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const metadataId = parseItemMetadataId(ctx.params.id);
	if (!metadataId) {
		throw new BadRequestError("Invalid metadata id");
	}

	const metadata = ctx.db.getItemMetadataById(metadataId);
	if (!metadata) {
		throw new NotFoundError("Metadata not found");
	}

	if (!ctx.db.hasItemAccess(userId, metadata.item_id)) {
		throw new ForbiddenError();
	}

	ctx.db.deleteItemMetadata(metadataId);
	return jsonResponse({ ok: true });
}
