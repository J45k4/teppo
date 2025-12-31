import {
	getSessionUser,
	login,
	logout,
	signup,
	type AuthPayload,
	type AuthResponse,
	type SessionUser,
} from "./session";
import { createTodo, getTodo, type TodoCreatePayload } from "./todo";
import type { TodoRow } from "./db";
import { wrap } from "./wrap";

Bun.serve({
	routes: {
		"/signup": {
			POST: wrap<AuthPayload | undefined, AuthResponse>(signup),
		},
		"/login": {
			POST: wrap<AuthPayload | undefined, AuthResponse>(login),
		},
		"/logout": {
			POST: wrap<undefined, { ok: true }>(logout, { parseBody: false }),
		},
		"/todo/:id": {
			GET: wrap<undefined, TodoRow | { error: string }, SessionUser>(
				getTodo,
				{
					requireAuth: true,
					getUser: getSessionUser,
				},
			),
		},
		"/todo": {
			POST: wrap<
				TodoCreatePayload | undefined,
				{ id: number } | { error: string },
				SessionUser
			>(createTodo, { requireAuth: true, getUser: getSessionUser }),
		},
	},
});
