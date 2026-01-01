import type { SessionUser } from "./session";
import type { TodoRow } from "./db";
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
	jsonResponse,
	type RequestContext,
} from "./wrap";

export type TodoCreatePayload = {
	name: string;
	projectId: number;
	description?: string | null;
	deadline?: string | null;
	ai?: boolean;
};

export type TodoUpdatePayload = {
	name?: string;
	projectId?: number;
	description?: string | null;
	deadline?: string | null;
	done?: boolean;
};

function parseTodoId(idParam: string | undefined): number | null {
	if (!idParam) return null;
	const parsed = Number(idParam);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isTodoCreatePayload(value: unknown): value is TodoCreatePayload {
	if (!value || typeof value !== "object") return false;
	const payload = value as Record<string, unknown>;
	return typeof payload.name === "string" && typeof payload.projectId === "number";
}

function parseDoneFilter(value: string | null): 0 | 1 | null {
	if (value === null) return null;
	if (value === "1" || value === "true") return 1;
	if (value === "0" || value === "false") return 0;
	return null;
}

export function getTodo(
	ctx: RequestContext<SessionUser>,
): TodoRow {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const todoId = parseTodoId(ctx.params.id);
	if (!todoId) {
		throw new BadRequestError("Invalid todo id");
	}

	const todo = ctx.db.getTodoById(todoId);
	if (!todo) {
		throw new NotFoundError("Todo not found");
	}

	if (todo.user_id !== userId) {
		throw new ForbiddenError();
	}

	return todo;
}

export function createTodo(
	ctx: RequestContext<SessionUser>,
	payload: TodoCreatePayload | undefined,
): ReturnType<typeof jsonResponse<{ id: number }>> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	if (!payload || !isTodoCreatePayload(payload)) {
		throw new BadRequestError("Missing required fields: name, projectId");
	}

	const project = ctx.db.getProjectById(payload.projectId);
	if (!project || project.created_by !== userId) {
		throw new BadRequestError("Invalid project");
	}

	const todoId = ctx.db.createTodo({
		name: payload.name,
		userId,
		projectId: payload.projectId,
		description: payload.description ?? null,
		deadline: payload.deadline ?? null,
		ai: payload.ai ?? false,
	});

	return jsonResponse({ id: todoId }, { status: 201 });
}

export function listTodos(
	ctx: RequestContext<SessionUser>,
): TodoRow[] {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const url = new URL(ctx.req.url);
	const doneParam = url.searchParams.get("done");
	const projectParam = url.searchParams.get("projectId");
	const done = parseDoneFilter(doneParam);
	if (doneParam !== null && done === null) {
		throw new BadRequestError("Invalid done filter");
	}

	let projectId: number | undefined;
	if (projectParam !== null) {
		const parsed = Number(projectParam);
		if (!Number.isInteger(parsed) || parsed <= 0) {
			throw new BadRequestError("Invalid projectId");
		}
		projectId = parsed;
	}

	return ctx.db.listTodosByUser(userId, {
		done: done ?? undefined,
		projectId,
	});
}

export function updateTodo(
	ctx: RequestContext<SessionUser>,
	payload: TodoUpdatePayload | undefined,
): TodoRow {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const todoId = parseTodoId(ctx.params.id);
	if (!todoId) {
		throw new BadRequestError("Invalid todo id");
	}

	const existing = ctx.db.getTodoById(todoId);
	if (!existing) {
		throw new NotFoundError("Todo not found");
	}

	if (existing.user_id !== userId) {
		throw new ForbiddenError();
	}

	if (!payload || typeof payload !== "object") {
		throw new BadRequestError("Missing update payload");
	}

	const nextName =
		typeof payload.name === "string" ? payload.name : existing.name;
	const nextDescription =
		"description" in payload ? payload.description ?? null : existing.description;
	const nextDeadline =
		"deadline" in payload ? payload.deadline ?? null : existing.deadline;
	const nextDone =
		typeof payload.done === "boolean" ? (payload.done ? 1 : 0) : existing.done;
	let nextCompletedAt = existing.completed_at;
	if (typeof payload.done === "boolean") {
		nextCompletedAt = payload.done
			? existing.completed_at ?? new Date().toISOString()
			: null;
	}

	let nextProjectId = existing.project_id;
	if (typeof payload.projectId === "number") {
		const project = ctx.db.getProjectById(payload.projectId);
		if (!project || project.created_by !== userId) {
			throw new BadRequestError("Invalid project");
		}
		nextProjectId = payload.projectId;
	}

	ctx.db.updateTodo(
		todoId,
		nextName,
		nextDescription ?? null,
		nextDone,
		nextDeadline ?? null,
		nextCompletedAt ?? null,
		nextProjectId,
	);

	return ctx.db.getTodoById(todoId) ?? existing;
}

export function deleteTodo(
	ctx: RequestContext<SessionUser>,
): ReturnType<typeof jsonResponse<{ ok: true }>> {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const todoId = parseTodoId(ctx.params.id);
	if (!todoId) {
		throw new BadRequestError("Invalid todo id");
	}

	const existing = ctx.db.getTodoById(todoId);
	if (!existing) {
		throw new NotFoundError("Todo not found");
	}

	if (existing.user_id !== userId) {
		throw new ForbiddenError();
	}

	ctx.db.deleteTodo(todoId);
	return jsonResponse({ ok: true });
}
