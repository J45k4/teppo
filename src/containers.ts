import type { ContainerRow, UserContainerRow } from "./db";
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

export type ContainerCreatePayload = {
	name: string;
	description?: string | null;
};

export type ContainerUpdatePayload = {
	name?: string;
	description?: string | null;
};

export type ContainerSharePayload = {
	userId: number;
};

function parseContainerId(idParam: string | undefined): number | null {
	if (!idParam) return null;
	const parsed = Number(idParam);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseUserId(idParam: string | undefined): number | null {
	if (!idParam) return null;
	const parsed = Number(idParam);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isContainerCreatePayload(
	value: unknown,
): value is ContainerCreatePayload {
	if (!value || typeof value !== "object") return false;
	const payload = value as Record<string, unknown>;
	return typeof payload.name === "string" && payload.name.trim().length > 0;
}

export function listContainers(
	ctx: RequestContext<SessionUser>,
): ContainerRow[] {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	return ctx.db.listContainersForUser(userId);
}

export function getContainer(
	ctx: RequestContext<SessionUser>,
): ContainerRow {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const containerId = parseContainerId(ctx.params.id);
	if (!containerId) {
		throw new BadRequestError("Invalid container id");
	}

	const container = ctx.db.getContainerByIdForUser(containerId, userId);
	if (!container) {
		throw new NotFoundError("Container not found");
	}

	return container;
}

export function createContainer(
	ctx: RequestContext<SessionUser>,
	payload: ContainerCreatePayload | undefined,
): JsonEnvelope<{ id: number }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	if (!payload || !isContainerCreatePayload(payload)) {
		throw new BadRequestError("Missing container name");
	}

	const id = ctx.db.createContainerForUser(
		userId,
		payload.name.trim(),
		payload.description ?? null,
	);

	return jsonResponse({ id }, { status: 201 });
}

export function updateContainer(
	ctx: RequestContext<SessionUser>,
	payload: ContainerUpdatePayload | undefined,
): ContainerRow {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const containerId = parseContainerId(ctx.params.id);
	if (!containerId) {
		throw new BadRequestError("Invalid container id");
	}

	const container = ctx.db.getContainerByIdForUser(containerId, userId);
	if (!container) {
		throw new NotFoundError("Container not found");
	}

	if (!payload || typeof payload !== "object") {
		throw new BadRequestError("Missing update payload");
	}

	const nextName =
		typeof payload.name === "string" && payload.name.trim().length > 0
			? payload.name.trim()
			: container.name;
	const nextDescription =
		"description" in payload ? payload.description ?? null : container.description;

	ctx.db.updateContainer(containerId, nextName, nextDescription);
	return ctx.db.getContainerById(containerId) ?? container;
}

export function deleteContainer(
	ctx: RequestContext<SessionUser>,
): JsonEnvelope<{ ok: true }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const containerId = parseContainerId(ctx.params.id);
	if (!containerId) {
		throw new BadRequestError("Invalid container id");
	}

	const container = ctx.db.getContainerByIdForUser(containerId, userId);
	if (!container) {
		throw new NotFoundError("Container not found");
	}

	ctx.db.deleteContainer(containerId);
	return jsonResponse({ ok: true });
}

export function listContainerUsers(
	ctx: RequestContext<SessionUser>,
): UserContainerRow[] {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const containerId = parseContainerId(ctx.params.id);
	if (!containerId) {
		throw new BadRequestError("Invalid container id");
	}

	if (!ctx.db.hasContainerAccess(userId, containerId)) {
		throw new ForbiddenError();
	}

	return ctx.db.listUserContainersByContainer(containerId);
}

export function addContainerUser(
	ctx: RequestContext<SessionUser>,
	payload: ContainerSharePayload | undefined,
): JsonEnvelope<{ ok: true }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const containerId = parseContainerId(ctx.params.id);
	if (!containerId) {
		throw new BadRequestError("Invalid container id");
	}

	if (!payload || typeof payload.userId !== "number") {
		throw new BadRequestError("Missing userId");
	}

	if (!ctx.db.hasContainerAccess(userId, containerId)) {
		throw new ForbiddenError();
	}

	const targetUser = ctx.db.getUserById(payload.userId);
	if (!targetUser) {
		throw new NotFoundError("User not found");
	}

	ctx.db.addUserToContainer(payload.userId, containerId);
	return jsonResponse({ ok: true }, { status: 201 });
}

export function removeContainerUser(
	ctx: RequestContext<SessionUser>,
): JsonEnvelope<{ ok: true }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const containerId = parseContainerId(ctx.params.id);
	const targetUserId = parseUserId(ctx.params.userId);
	if (!containerId || !targetUserId) {
		throw new BadRequestError("Invalid container id or user id");
	}

	if (!ctx.db.hasContainerAccess(userId, containerId)) {
		throw new ForbiddenError();
	}

	ctx.db.removeUserFromContainer(targetUserId, containerId);
	return jsonResponse({ ok: true });
}
