import type { SessionUser } from "./session";
import type { TimeEntryRow } from "./db";
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
	jsonResponse,
	type JsonEnvelope,
	type RequestContext,
} from "./wrap";

export type TimeEntryCreatePayload = {
	projectId: number
	startTime: string
	endTime: string
	description?: string
}

export type TimeEntryUpdatePayload = {
	projectId?: number
	startTime?: string
	endTime?: string
	description?: string
}

function parseTimeEntryId(idParam: string | undefined): number | null {
	if (!idParam) return null
	const parsed = Number(idParam)
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function isTimeEntryCreatePayload(
	value: unknown,
): value is TimeEntryCreatePayload {
	if (!value || typeof value !== "object") return false;
	const payload = value as Record<string, unknown>;
	return (
		typeof payload.projectId === "number" &&
		typeof payload.startTime === "string" &&
		typeof payload.endTime === "string"
	);
}

export function listTimeEntries(
	ctx: RequestContext<SessionUser>,
): TimeEntryRow[] {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const url = new URL(ctx.req.url);
	const start = url.searchParams.get("start") ?? undefined;
	const end = url.searchParams.get("end") ?? undefined;
	const projectParam = url.searchParams.get("projectId");
	let projectId: number | undefined;
	if (projectParam !== null) {
		const parsed = Number(projectParam);
		if (!Number.isInteger(parsed) || parsed <= 0) {
			throw new BadRequestError("Invalid projectId");
		}
		projectId = parsed;
	}

	return ctx.db.listTimeEntriesForUser(userId, { start, end, projectId });
}

export function getTimeEntry(
	ctx: RequestContext<SessionUser>,
): TimeEntryRow {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const entryId = parseTimeEntryId(ctx.params.id);
	if (!entryId) {
		throw new BadRequestError("Invalid time entry id");
	}

	const entry = ctx.db.getTimeEntryById(entryId);
	if (!entry) {
		throw new NotFoundError("Time entry not found");
	}

	if (entry.user_id !== userId) {
		throw new ForbiddenError();
	}

	return entry;
}

export function createTimeEntry(
	ctx: RequestContext<SessionUser>,
	payload: TimeEntryCreatePayload | undefined,
): JsonEnvelope<{ id: number }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	if (!payload || !isTimeEntryCreatePayload(payload)) {
		throw new BadRequestError("Missing time entry fields");
	}

	const project = ctx.db.getProjectById(payload.projectId);
	if (!project || project.created_by !== userId) {
		throw new BadRequestError("Invalid project");
	}

	const id = ctx.db.createTimeEntry(
		payload.projectId,
		userId,
		payload.startTime,
		payload.endTime,
		payload.description,
	)
	return jsonResponse({ id }, { status: 201 });
}

export function updateTimeEntry(
	ctx: RequestContext<SessionUser>,
	payload: TimeEntryUpdatePayload | undefined,
): TimeEntryRow {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const entryId = parseTimeEntryId(ctx.params.id);
	if (!entryId) {
		throw new BadRequestError("Invalid time entry id");
	}

	const entry = ctx.db.getTimeEntryById(entryId);
	if (!entry) {
		throw new NotFoundError("Time entry not found");
	}

	if (entry.user_id !== userId) {
		throw new ForbiddenError();
	}

	if (!payload || typeof payload !== "object") {
		throw new BadRequestError("Missing update payload");
	}

	let nextProjectId = entry.project_id;
	if (typeof payload.projectId === "number") {
		const project = ctx.db.getProjectById(payload.projectId);
		if (!project || project.created_by !== userId) {
			throw new BadRequestError("Invalid project");
		}
		nextProjectId = payload.projectId;
	}

	const nextStart =
		typeof payload.startTime === "string"
			? payload.startTime
			: entry.start_time;
	const nextEnd =
		typeof payload.endTime === "string" ? payload.endTime : entry.end_time;
	const nextDescription =
		typeof payload.description === "string" ? payload.description : entry.description;

	ctx.db.updateTimeEntry(entryId, nextProjectId, nextStart, nextEnd, nextDescription);
	return ctx.db.getTimeEntryById(entryId) ?? entry;
}

export function deleteTimeEntry(
	ctx: RequestContext<SessionUser>,
): JsonEnvelope<{ ok: true }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const entryId = parseTimeEntryId(ctx.params.id);
	if (!entryId) {
		throw new BadRequestError("Invalid time entry id");
	}

	const entry = ctx.db.getTimeEntryById(entryId);
	if (!entry) {
		throw new NotFoundError("Time entry not found");
	}

	if (entry.user_id !== userId) {
		throw new ForbiddenError();
	}

	ctx.db.deleteTimeEntry(entryId);
	return jsonResponse({ ok: true });
}
