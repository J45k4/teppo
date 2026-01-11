import { Database } from "bun:sqlite";
import { wrap } from "./wrap";
import index from "./web/index.html"
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
import {
	createSpreadsheet,
	getSpreadsheet,
	listSpreadsheets,
	updateSpreadsheetState,
	type SpreadsheetCreatePayload,
	type SpreadsheetStatePayload,
} from "./spreadsheets";
import type { TodoRow, SpreadsheetRow } from "./db";

const sqlite = new Database(DB_PATH, { create: true });
await runMigrations(sqlite)
const db = new Db({ db: sqlite });
const authOptions = { db, requireAuth: true, getUser: getSessionUser };

const server = Bun.serve({
	routes: {
		"/api/signup": {
			POST: wrap<AuthPayload | undefined, AuthResponse>(signup, { db }),
		},
		"/api/login": {
			POST: wrap<AuthPayload | undefined, AuthResponse>(login, { db }),
		},
		"/api/logout": {
			POST: wrap<undefined, { ok: true }>(logout, {
				...authOptions,
				parseBody: false,
			}),
		},
		"/api/me": {
			GET: wrap<undefined, MeResponse, SessionUser>(me, authOptions),
		},
		"/api/todo/:id": {
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
		"/api/todo": {
			POST: wrap<
				TodoCreatePayload | undefined,
				{ id: number } | { error: string },
				SessionUser
			>(createTodo, authOptions),
		},
		"/api/todos": {
			GET: wrap<undefined, TodoRow[], SessionUser>(listTodos, authOptions),
		},
		"/api/projects": {
			GET: wrap<undefined, ReturnType<typeof listProjects>, SessionUser>(
				listProjects,
				authOptions,
			),
			POST: wrap<ProjectCreatePayload | undefined, { id: number }, SessionUser>(
				createProject,
				authOptions,
			),
		},
		"/api/projects/:id": {
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
		"/api/time-entries": {
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
		"/api/time-entries/:id": {
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
		"/api/containers": {
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
		"/api/containers/:id": {
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
		"/api/containers/:id/users": {
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
		"/api/containers/:id/users/:userId": {
			DELETE: wrap<undefined, { ok: true }, SessionUser>(
				removeContainerUser,
				authOptions,
			),
		},
		"/api/items": {
			GET: wrap<undefined, ReturnType<typeof listItems>, SessionUser>(
				listItems,
				authOptions,
			),
			POST: wrap<ItemCreatePayload | undefined, { id: number }, SessionUser>(
				createItem,
				authOptions,
			),
		},
		"/api/items/:id": {
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
		"/api/items/:id/users": {
			GET: wrap<undefined, ReturnType<typeof listItemUsers>, SessionUser>(
				listItemUsers,
				authOptions,
			),
			POST: wrap<ItemSharePayload | undefined, { ok: true }, SessionUser>(
				addItemUser,
				authOptions,
			),
		},
		"/api/items/:id/users/:userId": {
			DELETE: wrap<undefined, { ok: true }, SessionUser>(
				removeItemUser,
				authOptions,
			),
		},
		"/api/item-logs": {
			GET: wrap<undefined, ReturnType<typeof listItemLogs>, SessionUser>(
				listItemLogs,
				authOptions,
			),
			POST: wrap<ItemLogCreatePayload | undefined, { id: number }, SessionUser>(
				createItemLog,
				authOptions,
			),
		},
		"/api/item-logs/:id": {
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
		"/api/item-metadata": {
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
		"/api/item-metadata/:id": {
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
		"/api/spreadsheets": {
			GET: wrap<undefined, ReturnType<typeof listSpreadsheets>, SessionUser>(
				listSpreadsheets,
				authOptions,
			),
			POST: wrap<
				SpreadsheetCreatePayload | undefined,
				{ id: number },
				SessionUser
			>(createSpreadsheet, authOptions),
		},
		"/api/spreadsheets/:id": {
			GET: wrap<undefined, SpreadsheetRow, SessionUser>(
				getSpreadsheet,
				authOptions,
			),
		},
		"/api/spreadsheets/:id/state": {
			PATCH: wrap<
				SpreadsheetStatePayload | undefined,
				{ ok: true },
				SessionUser
			>(updateSpreadsheetState, authOptions),
		},
		"/api/receipts": {
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
		"/api/receipts/:id": {
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
		"/api/receipt-items": {
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
		"/api/receipt-items/:id": {
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
