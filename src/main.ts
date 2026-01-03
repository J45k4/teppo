import { Database } from "bun:sqlite";
import { wrap } from "./wrap";
import index from "./index.html";
import { Db, DB_PATH } from "./db";
import { runMigrations } from "../migrate.ts";
import {
	getSessionUser,
	login,
	logout,
	me,
	signup,
	type AuthPayload,
	type AuthResponse,
	type MeResponse,
	type SessionUser,
} from "./session";
import {
	createTodo,
	deleteTodo,
	getTodo,
	listTodos,
	updateTodo,
	type TodoCreatePayload,
	type TodoUpdatePayload,
} from "./todo";
import {
	createProject,
	deleteProject,
	getProject,
	listProjects,
	updateProject,
	type ProjectCreatePayload,
	type ProjectUpdatePayload,
} from "./projects";
import {
	createTimeEntry,
	deleteTimeEntry,
	getTimeEntry,
	listTimeEntries,
	updateTimeEntry,
	type TimeEntryCreatePayload,
	type TimeEntryUpdatePayload,
} from "./time-entries";
import {
	addContainerUser,
	createContainer,
	deleteContainer,
	getContainer,
	listContainerUsers,
	listContainers,
	removeContainerUser,
	updateContainer,
	type ContainerCreatePayload,
	type ContainerSharePayload,
	type ContainerUpdatePayload,
} from "./containers";
import {
	addItemUser,
	createItem,
	deleteItem,
	getItem,
	listItemUsers,
	listItems,
	removeItemUser,
	updateItem,
	type ItemCreatePayload,
	type ItemSharePayload,
	type ItemUpdatePayload,
} from "./items";
import {
	createItemLog,
	deleteItemLog,
	getItemLog,
	listItemLogs,
	updateItemLog,
	type ItemLogCreatePayload,
	type ItemLogUpdatePayload,
} from "./item-logs";
import {
	createItemMetadata,
	deleteItemMetadata,
	getItemMetadata,
	listItemMetadata,
	updateItemMetadata,
	type ItemMetadataCreatePayload,
	type ItemMetadataUpdatePayload,
} from "./item-metadata";
import {
	createReceipt,
	deleteReceipt,
	getReceipt,
	listReceipts,
	updateReceipt,
	type ReceiptCreatePayload,
	type ReceiptUpdatePayload,
} from "./receipts";
import {
	createReceiptItem,
	deleteReceiptItem,
	getReceiptItem,
	listReceiptItems,
	type ReceiptItemCreatePayload,
} from "./receipt-items";
import type { TodoRow } from "./db";

const sqlite = new Database(DB_PATH, { create: true });
await runMigrations(sqlite)
const db = new Db({ db: sqlite });
const authOptions = { db, requireAuth: true, getUser: getSessionUser };

const server = Bun.serve({
	routes: {
		"/signup": {
			POST: wrap<AuthPayload | undefined, AuthResponse>(signup, { db }),
		},
		"/login": {
			POST: wrap<AuthPayload | undefined, AuthResponse>(login, { db }),
		},
		"/logout": {
			POST: wrap<undefined, { ok: true }>(logout, {
				...authOptions,
				parseBody: false,
			}),
		},
		"/me": {
			GET: wrap<undefined, MeResponse, SessionUser>(me, authOptions),
		},
		"/todo/:id": {
			GET: wrap<undefined, TodoRow | { error: string }, SessionUser>(
				getTodo,
				authOptions,
			),
			PATCH: wrap<TodoUpdatePayload | undefined, TodoRow, SessionUser>(
				updateTodo,
				authOptions,
			),
			DELETE: wrap<undefined, { ok: true }, SessionUser>(
				deleteTodo,
				authOptions,
			),
		},
		"/todo": {
			POST: wrap<
				TodoCreatePayload | undefined,
				{ id: number } | { error: string },
				SessionUser
			>(createTodo, authOptions),
		},
		"/todos": {
			GET: wrap<undefined, TodoRow[], SessionUser>(listTodos, authOptions),
		},
		"/projects": {
			GET: wrap<undefined, ReturnType<typeof listProjects>, SessionUser>(
				listProjects,
				authOptions,
			),
			POST: wrap<ProjectCreatePayload | undefined, { id: number }, SessionUser>(
				createProject,
				authOptions,
			),
		},
		"/projects/:id": {
			GET: wrap<undefined, ReturnType<typeof getProject>, SessionUser>(
				getProject,
				authOptions,
			),
			PATCH: wrap<
				ProjectUpdatePayload | undefined,
				ReturnType<typeof getProject>,
				SessionUser
			>(updateProject, authOptions),
			DELETE: wrap<undefined, { ok: true }, SessionUser>(
				deleteProject,
				authOptions,
			),
		},
		"/time-entries": {
			GET: wrap<undefined, ReturnType<typeof listTimeEntries>, SessionUser>(
				listTimeEntries,
				authOptions,
			),
			POST: wrap<
				TimeEntryCreatePayload | undefined,
				{ id: number },
				SessionUser
			>(createTimeEntry, authOptions),
		},
		"/time-entries/:id": {
			GET: wrap<undefined, ReturnType<typeof getTimeEntry>, SessionUser>(
				getTimeEntry,
				authOptions,
			),
			PATCH: wrap<
				TimeEntryUpdatePayload | undefined,
				ReturnType<typeof getTimeEntry>,
				SessionUser
			>(updateTimeEntry, authOptions),
			DELETE: wrap<undefined, { ok: true }, SessionUser>(
				deleteTimeEntry,
				authOptions,
			),
		},
		"/containers": {
			GET: wrap<undefined, ReturnType<typeof listContainers>, SessionUser>(
				listContainers,
				authOptions,
			),
			POST: wrap<
				ContainerCreatePayload | undefined,
				{ id: number },
				SessionUser
			>(createContainer, authOptions),
		},
		"/containers/:id": {
			GET: wrap<undefined, ReturnType<typeof getContainer>, SessionUser>(
				getContainer,
				authOptions,
			),
			PATCH: wrap<
				ContainerUpdatePayload | undefined,
				ReturnType<typeof getContainer>,
				SessionUser
			>(updateContainer, authOptions),
			DELETE: wrap<undefined, { ok: true }, SessionUser>(
				deleteContainer,
				authOptions,
			),
		},
		"/containers/:id/users": {
			GET: wrap<undefined, ReturnType<typeof listContainerUsers>, SessionUser>(
				listContainerUsers,
				authOptions,
			),
			POST: wrap<
				ContainerSharePayload | undefined,
				{ ok: true },
				SessionUser
			>(addContainerUser, authOptions),
		},
		"/containers/:id/users/:userId": {
			DELETE: wrap<undefined, { ok: true }, SessionUser>(
				removeContainerUser,
				authOptions,
			),
		},
		"/items": {
			GET: wrap<undefined, ReturnType<typeof listItems>, SessionUser>(
				listItems,
				authOptions,
			),
			POST: wrap<ItemCreatePayload | undefined, { id: number }, SessionUser>(
				createItem,
				authOptions,
			),
		},
		"/items/:id": {
			GET: wrap<undefined, ReturnType<typeof getItem>, SessionUser>(
				getItem,
				authOptions,
			),
			PATCH: wrap<
				ItemUpdatePayload | undefined,
				ReturnType<typeof getItem>,
				SessionUser
			>(updateItem, authOptions),
			DELETE: wrap<undefined, { ok: true }, SessionUser>(
				deleteItem,
				authOptions,
			),
		},
		"/items/:id/users": {
			GET: wrap<undefined, ReturnType<typeof listItemUsers>, SessionUser>(
				listItemUsers,
				authOptions,
			),
			POST: wrap<ItemSharePayload | undefined, { ok: true }, SessionUser>(
				addItemUser,
				authOptions,
			),
		},
		"/items/:id/users/:userId": {
			DELETE: wrap<undefined, { ok: true }, SessionUser>(
				removeItemUser,
				authOptions,
			),
		},
		"/item-logs": {
			GET: wrap<undefined, ReturnType<typeof listItemLogs>, SessionUser>(
				listItemLogs,
				authOptions,
			),
			POST: wrap<ItemLogCreatePayload | undefined, { id: number }, SessionUser>(
				createItemLog,
				authOptions,
			),
		},
		"/item-logs/:id": {
			GET: wrap<undefined, ReturnType<typeof getItemLog>, SessionUser>(
				getItemLog,
				authOptions,
			),
			PATCH: wrap<
				ItemLogUpdatePayload | undefined,
				ReturnType<typeof getItemLog>,
				SessionUser
			>(updateItemLog, authOptions),
			DELETE: wrap<undefined, { ok: true }, SessionUser>(
				deleteItemLog,
				authOptions,
			),
		},
		"/item-metadata": {
			GET: wrap<undefined, ReturnType<typeof listItemMetadata>, SessionUser>(
				listItemMetadata,
				authOptions,
			),
			POST: wrap<
				ItemMetadataCreatePayload | undefined,
				{ id: number },
				SessionUser
			>(createItemMetadata, authOptions),
		},
		"/item-metadata/:id": {
			GET: wrap<undefined, ReturnType<typeof getItemMetadata>, SessionUser>(
				getItemMetadata,
				authOptions,
			),
			PATCH: wrap<
				ItemMetadataUpdatePayload | undefined,
				ReturnType<typeof getItemMetadata>,
				SessionUser
			>(updateItemMetadata, authOptions),
			DELETE: wrap<undefined, { ok: true }, SessionUser>(
				deleteItemMetadata,
				authOptions,
			),
		},
		"/receipts": {
			GET: wrap<undefined, ReturnType<typeof listReceipts>, SessionUser>(
				listReceipts,
				authOptions,
			),
			POST: wrap<
				ReceiptCreatePayload | undefined,
				{ id: number },
				SessionUser
			>(createReceipt, authOptions),
		},
		"/receipts/:id": {
			GET: wrap<undefined, ReturnType<typeof getReceipt>, SessionUser>(
				getReceipt,
				authOptions,
			),
			PATCH: wrap<
				ReceiptUpdatePayload | undefined,
				ReturnType<typeof getReceipt>,
				SessionUser
			>(updateReceipt, authOptions),
			DELETE: wrap<undefined, { ok: true }, SessionUser>(
				deleteReceipt,
				authOptions,
			),
		},
		"/receipt-items": {
			GET: wrap<undefined, ReturnType<typeof listReceiptItems>, SessionUser>(
				listReceiptItems,
				authOptions,
			),
			POST: wrap<
				ReceiptItemCreatePayload | undefined,
				{ id: number },
				SessionUser
			>(createReceiptItem, authOptions),
		},
		"/receipt-items/:id": {
			GET: wrap<undefined, ReturnType<typeof getReceiptItem>, SessionUser>(
				getReceiptItem,
				authOptions,
			),
			DELETE: wrap<undefined, { ok: true }, SessionUser>(
				deleteReceiptItem,
				authOptions,
			),
		},
		"/*": index,
	},
});

console.log(`listening on http://localhost:${server.port}`);
