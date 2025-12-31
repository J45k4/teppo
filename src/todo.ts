import { getSessionUser, type SessionUser } from "./session";
import type { TodoRow } from "./db";
import { jsonResponse, wrap } from "./wrap";

type TodoCreatePayload = {
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

export const handleGetTodo = wrap<
	undefined,
	TodoRow | { error: string },
	SessionUser
>(
	(ctx) => {
		const userId = ctx.user?.userId;
		if (!userId) {
			return jsonResponse({ error: "Unauthorized" }, { status: 401 });
		}

		const todoId = parseTodoId(ctx.params.id);
		if (!todoId) {
			return jsonResponse({ error: "Invalid todo id" }, { status: 400 });
		}

		const todo = ctx.db.getTodoById(todoId);
		if (!todo) {
			return jsonResponse({ error: "Todo not found" }, { status: 404 });
		}

		if (todo.user_id !== userId) {
			return jsonResponse({ error: "Forbidden" }, { status: 403 });
		}

		return todo;
	},
	{ requireAuth: true, getUser: getSessionUser },
);

export const handleCreateTodo = wrap<
	TodoCreatePayload,
	{ id: number } | { error: string },
	SessionUser
>(
	(ctx, payload) => {
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
	},
	{ requireAuth: true, getUser: getSessionUser },
);
