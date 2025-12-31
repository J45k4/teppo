import { Database } from "bun:sqlite";
import { wrap } from "./wrap";
import index from "./index.html";
import { Db, DB_PATH } from "./db";
import { runMigrations } from "../migrate.ts";
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

const sqlite = new Database(DB_PATH, { create: true });
runMigrations(sqlite);
const db = new Db({ db: sqlite });

const server = Bun.serve({
	routes: {
		"/": index,
		"/signup": {
			POST: wrap<AuthPayload | undefined, AuthResponse>(signup, { db }),
		},
		"/login": {
			POST: wrap<AuthPayload | undefined, AuthResponse>(login, { db }),
		},
		"/logout": {
			POST: wrap<undefined, { ok: true }>(logout, { db, parseBody: false }),
		},
		"/todo/:id": {
			GET: wrap<undefined, TodoRow | { error: string }, SessionUser>(
				getTodo,
				{
					db,
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
			>(createTodo, { db, requireAuth: true, getUser: getSessionUser }),
		},
	},
})

console.log(`listening on http://localhost:${server.port}`)
