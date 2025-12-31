import type { SessionUser } from "./session";
import type { TodoRow } from "./db";
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
	jsonResponse,
	type JsonEnvelope,
	type RequestContext,
} from "./wrap";

export type TodoCreatePayload = {
	name: string;
	projectId: number;
	description?: string | null;
	deadline?: string | null;
	ai?: boolean;
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

export function getTodo(
	ctx: RequestContext<SessionUser>,
): TodoRow | JsonEnvelope<{ error: string }> {
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
): JsonEnvelope<{ id: number } | { error: string }> {
	const userId = ctx.user?.userId;
	if (!userId) {
		return jsonResponse({ error: "Unauthorized" }, { status: 401 });
	}

	if (!payload || !isTodoCreatePayload(payload)) {
		return jsonResponse(
			{ error: "Missing required fields: name, projectId" },
			{ status: 400 },
		);
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
