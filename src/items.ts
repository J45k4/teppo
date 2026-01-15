import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import type { Db, ItemRow, UserItemRow } from "./db";
import { getSessionUser, type SessionUser } from "./session";
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
	jsonResponse,
	type JsonEnvelope,
	type RequestContext,
	type RouteRequest,
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

const ROOT_UPLOADS_DIR = join(process.cwd(), "uploads")
const ITEM_IMAGE_SUBDIR = "items"
const ITEM_IMAGE_DIR = join(ROOT_UPLOADS_DIR, ITEM_IMAGE_SUBDIR)
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

type ImageTypeEntry = {
	mime: string
	extension: string
}

const IMAGE_TYPES: ImageTypeEntry[] = [
	{ mime: "image/jpeg", extension: ".jpg" },
	{ mime: "image/jpg", extension: ".jpg" },
	{ mime: "image/png", extension: ".png" },
	{ mime: "image/webp", extension: ".webp" },
	{ mime: "image/gif", extension: ".gif" },
	{ mime: "image/svg+xml", extension: ".svg" },
	{ mime: "image/bmp", extension: ".bmp" },
	{ mime: "image/tiff", extension: ".tiff" },
	{ mime: "image/x-icon", extension: ".ico" },
	{ mime: "image/heif", extension: ".heif" },
	{ mime: "image/heic", extension: ".heic" },
]

const MIME_TO_EXTENSION = IMAGE_TYPES.reduce<Record<string, string>>((map, image) => {
	const mimeKey = image.mime.toLowerCase()
	map[mimeKey] = image.extension
	return map
}, {})

const EXTENSION_TO_MIME = IMAGE_TYPES.reduce<Record<string, string>>((map, image) => {
	const extensionKey = image.extension.toLowerCase()
	map[extensionKey] = image.mime
	return map
}, {})

function extensionFromFilename(value: string | null | undefined) {
	if (!value) return null
	const index = value.lastIndexOf(".")
	if (index < 0 || index === value.length - 1) return null
	return value.slice(index).toLowerCase()
}

function determineImageMime(mime: string | undefined, extension: string | null) {
	if (mime && mime.trim().length > 0) {
		const normalized = mime.toLowerCase()
		if (normalized.startsWith("image/")) return normalized
	}
	if (extension) {
		const mapped = EXTENSION_TO_MIME[extension.toLowerCase()]
		if (mapped) return mapped
	}
	return null
}

function getExtensionForMime(mime: string | undefined) {
	if (!mime) return null
	return MIME_TO_EXTENSION[mime.toLowerCase()] ?? null
}

function getItemImageUrl(itemId: number) {
	return `/api/items/${itemId}/image`
}

function getImageAbsolutePath(relativePath: string) {
	return join(ROOT_UPLOADS_DIR, relativePath)
}

async function ensureItemImageDirExists() {
	try {
		await mkdir(ITEM_IMAGE_DIR, { recursive: true })
	} catch {
		// ignore
	}
}

async function deleteStoredImage(relativePath: string) {
	try {
		await rm(getImageAbsolutePath(relativePath))
	} catch {
		// ignore
	}
}

function resolveMimeForPath(relativePath: string, fallback: string | null) {
	const extension = extensionFromFilename(relativePath)
	if (extension) {
		const mapped = EXTENSION_TO_MIME[extension]
		if (mapped) return mapped
	}
	return fallback ?? "application/octet-stream"
}

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

export async function uploadItemImage(
	ctx: RequestContext<SessionUser>,
): Promise<JsonEnvelope<{ imageUrl: string }>> {
	const userId = ctx.user?.userId
	if (!userId) {
		throw new UnauthorizedError()
	}

	const itemId = parseItemId(ctx.params.id)
	if (!itemId) {
		throw new BadRequestError("Invalid item id")
	}

	const item = ctx.db.getItemByIdForUser(itemId, userId)
	if (!item) {
		throw new NotFoundError("Item not found")
	}

	const formData = await ctx.req.formData()
	const imageEntry = formData.get("image")
	if (!imageEntry || !(imageEntry instanceof File)) {
		throw new BadRequestError("Missing image")
	}

	if (imageEntry.size === 0) {
		throw new BadRequestError("Image is empty")
	}

	if (imageEntry.size > MAX_IMAGE_BYTES) {
		throw new BadRequestError("Image is too large")
	}

	const extension =
		getExtensionForMime(imageEntry.type) ?? extensionFromFilename(imageEntry.name)
	if (!extension) {
		throw new BadRequestError("Unsupported image type")
	}

	const mimeType = determineImageMime(imageEntry.type, extension)
	if (!mimeType) {
		throw new BadRequestError("Unsupported image type")
	}

	await ensureItemImageDirExists()
	const fileName = `${crypto.randomUUID()}${extension}`
	const relativePath = `${ITEM_IMAGE_SUBDIR}/${fileName}`
	const absolutePath = getImageAbsolutePath(relativePath)
	await Bun.write(absolutePath, await imageEntry.arrayBuffer())
	ctx.db.setItemImage(itemId, relativePath, mimeType)
	if (item.image_path && item.image_path !== relativePath) {
		await deleteStoredImage(item.image_path)
	}

	return jsonResponse({ imageUrl: getItemImageUrl(itemId) }, { status: 201 })
}

export async function serveItemImage(
	req: RouteRequest,
	db: Db,
): Promise<Response> {
	const user = getSessionUser(req, db)
	if (!user) {
		return Response.json({ error: "Unauthorized" }, { status: 401 })
	}

	const itemId = parseItemId(req.params?.id)
	if (!itemId) {
		return Response.json({ error: "Invalid item id" }, { status: 400 })
	}

	const item = db.getItemByIdForUser(itemId, user.userId)
	if (!item || !item.image_path) {
		return Response.json({ error: "Image not found" }, { status: 404 })
	}

	const absolutePath = getImageAbsolutePath(item.image_path)
	try {
		await stat(absolutePath)
	} catch {
		return Response.json({ error: "Image not found" }, { status: 404 })
	}

	const mime = resolveMimeForPath(item.image_path, item.image_type)
	const file = Bun.file(absolutePath)
	return new Response(file, {
		headers: { "Content-Type": mime },
	})
}
