import type { SessionUser } from "./session";
import type { ProjectRow } from "./db";
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
	jsonResponse,
	type JsonEnvelope,
	type RequestContext,
} from "./wrap";

export type ProjectCreatePayload = {
	name: string;
};

export type ProjectUpdatePayload = {
	name?: string;
};

function parseProjectId(idParam: string | undefined): number | null {
	if (!idParam) return null;
	const parsed = Number(idParam);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isProjectCreatePayload(value: unknown): value is ProjectCreatePayload {
	if (!value || typeof value !== "object") return false;
	const payload = value as Record<string, unknown>;
	return typeof payload.name === "string" && payload.name.trim().length > 0;
}

export function listProjects(
	ctx: RequestContext<SessionUser>,
): ProjectRow[] {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	return ctx.db.listProjectsByUser(userId);
}

export function getProject(
	ctx: RequestContext<SessionUser>,
): ProjectRow {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const projectId = parseProjectId(ctx.params.id);
	if (!projectId) {
		throw new BadRequestError("Invalid project id");
	}

	const project = ctx.db.getProjectById(projectId);
	if (!project) {
		throw new NotFoundError("Project not found");
	}

	if (project.created_by !== userId) {
		throw new ForbiddenError();
	}

	return project;
}

export function createProject(
	ctx: RequestContext<SessionUser>,
	payload: ProjectCreatePayload | undefined,
): JsonEnvelope<{ id: number }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	if (!payload || !isProjectCreatePayload(payload)) {
		throw new BadRequestError("Missing project name");
	}

	const id = ctx.db.createProject(payload.name.trim(), userId);
	return jsonResponse({ id }, { status: 201 });
}

export function updateProject(
	ctx: RequestContext<SessionUser>,
	payload: ProjectUpdatePayload | undefined,
): ProjectRow {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const projectId = parseProjectId(ctx.params.id);
	if (!projectId) {
		throw new BadRequestError("Invalid project id");
	}

	const project = ctx.db.getProjectById(projectId);
	if (!project) {
		throw new NotFoundError("Project not found");
	}

	if (project.created_by !== userId) {
		throw new ForbiddenError();
	}

	if (!payload || typeof payload !== "object") {
		throw new BadRequestError("Missing update payload");
	}

	const nextName =
		typeof payload.name === "string" && payload.name.trim().length > 0
			? payload.name.trim()
			: project.name;

	ctx.db.updateProject(projectId, nextName);
	return ctx.db.getProjectById(projectId) ?? project;
}

export function deleteProject(
	ctx: RequestContext<SessionUser>,
): JsonEnvelope<{ ok: true }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const projectId = parseProjectId(ctx.params.id);
	if (!projectId) {
		throw new BadRequestError("Invalid project id");
	}

	const project = ctx.db.getProjectById(projectId);
	if (!project) {
		throw new NotFoundError("Project not found");
	}

	if (project.created_by !== userId) {
		throw new ForbiddenError();
	}

	ctx.db.deleteProject(projectId);
	return jsonResponse({ ok: true });
}
