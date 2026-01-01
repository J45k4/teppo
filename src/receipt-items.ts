import type { ReceiptItemRow } from "./db";
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

export type ReceiptItemCreatePayload = {
	receiptId: number;
	itemId: number;
};

function parseReceiptItemId(idParam: string | undefined): number | null {
	if (!idParam) return null;
	const parsed = Number(idParam);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isReceiptItemCreatePayload(
	value: unknown,
): value is ReceiptItemCreatePayload {
	if (!value || typeof value !== "object") return false;
	const payload = value as Record<string, unknown>;
	return (
		typeof payload.receiptId === "number" && typeof payload.itemId === "number"
	);
}

export function listReceiptItems(
	ctx: RequestContext<SessionUser>,
): ReceiptItemRow[] {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const url = new URL(ctx.req.url);
	const receiptParam = url.searchParams.get("receiptId");
	if (!receiptParam) {
		throw new BadRequestError("Missing receiptId");
	}
	const receiptId = Number(receiptParam);
	if (!Number.isInteger(receiptId) || receiptId <= 0) {
		throw new BadRequestError("Invalid receiptId");
	}

	const receipt = ctx.db.getReceiptById(receiptId);
	if (!receipt) {
		throw new NotFoundError("Receipt not found");
	}

	if (receipt.user_id !== userId) {
		throw new ForbiddenError();
	}

	return ctx.db.listReceiptItemsForUser(receiptId, userId);
}

export function getReceiptItem(
	ctx: RequestContext<SessionUser>,
): ReceiptItemRow {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const receiptItemId = parseReceiptItemId(ctx.params.id);
	if (!receiptItemId) {
		throw new BadRequestError("Invalid receipt item id");
	}

	const item = ctx.db.getReceiptItemByIdForUser(receiptItemId, userId);
	if (!item) {
		throw new NotFoundError("Receipt item not found");
	}

	return item;
}

export function createReceiptItem(
	ctx: RequestContext<SessionUser>,
	payload: ReceiptItemCreatePayload | undefined,
): JsonEnvelope<{ id: number }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	if (!payload || !isReceiptItemCreatePayload(payload)) {
		throw new BadRequestError("Missing receipt item fields");
	}

	const receipt = ctx.db.getReceiptById(payload.receiptId);
	if (!receipt) {
		throw new NotFoundError("Receipt not found");
	}

	if (receipt.user_id !== userId) {
		throw new ForbiddenError();
	}

	if (!ctx.db.hasItemAccess(userId, payload.itemId)) {
		throw new ForbiddenError();
	}

	const id = ctx.db.addReceiptItem(payload.receiptId, payload.itemId);
	return jsonResponse({ id }, { status: 201 });
}

export function deleteReceiptItem(
	ctx: RequestContext<SessionUser>,
): JsonEnvelope<{ ok: true }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const receiptItemId = parseReceiptItemId(ctx.params.id);
	if (!receiptItemId) {
		throw new BadRequestError("Invalid receipt item id");
	}

	const item = ctx.db.getReceiptItemByIdForUser(receiptItemId, userId);
	if (!item) {
		throw new NotFoundError("Receipt item not found");
	}

	ctx.db.deleteReceiptItem(receiptItemId);
	return jsonResponse({ ok: true });
}
