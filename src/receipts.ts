import type { ReceiptRow } from "./db";
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

export type ReceiptCreatePayload = {
	amount: number;
};

export type ReceiptUpdatePayload = {
	amount?: number;
};

function parseReceiptId(idParam: string | undefined): number | null {
	if (!idParam) return null;
	const parsed = Number(idParam);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isReceiptCreatePayload(
	value: unknown,
): value is ReceiptCreatePayload {
	if (!value || typeof value !== "object") return false;
	const payload = value as Record<string, unknown>;
	return typeof payload.amount === "number";
}

export function listReceipts(
	ctx: RequestContext<SessionUser>,
): ReceiptRow[] {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	return ctx.db.listReceiptsByUser(userId);
}

export function getReceipt(ctx: RequestContext<SessionUser>): ReceiptRow {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const receiptId = parseReceiptId(ctx.params.id);
	if (!receiptId) {
		throw new BadRequestError("Invalid receipt id");
	}

	const receipt = ctx.db.getReceiptById(receiptId);
	if (!receipt) {
		throw new NotFoundError("Receipt not found");
	}

	if (receipt.user_id !== userId) {
		throw new ForbiddenError();
	}

	return receipt;
}

export function createReceipt(
	ctx: RequestContext<SessionUser>,
	payload: ReceiptCreatePayload | undefined,
): JsonEnvelope<{ id: number }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	if (!payload || !isReceiptCreatePayload(payload)) {
		throw new BadRequestError("Missing receipt amount");
	}

	const id = ctx.db.createReceipt(userId, payload.amount);
	return jsonResponse({ id }, { status: 201 });
}

export function updateReceipt(
	ctx: RequestContext<SessionUser>,
	payload: ReceiptUpdatePayload | undefined,
): ReceiptRow {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const receiptId = parseReceiptId(ctx.params.id);
	if (!receiptId) {
		throw new BadRequestError("Invalid receipt id");
	}

	const receipt = ctx.db.getReceiptById(receiptId);
	if (!receipt) {
		throw new NotFoundError("Receipt not found");
	}

	if (receipt.user_id !== userId) {
		throw new ForbiddenError();
	}

	if (!payload || typeof payload !== "object") {
		throw new BadRequestError("Missing update payload");
	}

	const nextAmount =
		typeof payload.amount === "number" ? payload.amount : receipt.amount;

	ctx.db.updateReceipt(receiptId, nextAmount);
	return ctx.db.getReceiptById(receiptId) ?? receipt;
}

export function deleteReceipt(
	ctx: RequestContext<SessionUser>,
): JsonEnvelope<{ ok: true }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const receiptId = parseReceiptId(ctx.params.id);
	if (!receiptId) {
		throw new BadRequestError("Invalid receipt id");
	}

	const receipt = ctx.db.getReceiptById(receiptId);
	if (!receipt) {
		throw new NotFoundError("Receipt not found");
	}

	if (receipt.user_id !== userId) {
		throw new ForbiddenError();
	}

	ctx.db.deleteReceipt(receiptId);
	return jsonResponse({ ok: true });
}
