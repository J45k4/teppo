import { Database } from "bun:sqlite";

export const DB_PATH = process.env.DB_PATH ?? "teppo.sqlite";

export type UserRow = {
	id: number;
	email: string;
	password_hash: string;
	created_at: string;
};

export type SessionRow = {
	id: number;
	user_id: number;
	token: string;
	created_at: string;
	expires_at: string;
};

export type ProjectRow = {
	id: number;
	name: string;
	created_by: number;
	created_at: string;
};

export type TimeEntryRow = {
	id: number;
	project_id: number;
	user_id: number;
	start_time: string;
	end_time: string;
};

export type ContainerRow = {
	id: number;
	name: string;
	description: string | null;
};

export type ItemRow = {
	id: number;
	name: string;
	description: string | null;
	barcode: string | null;
	cost: number | null;
	container_id: number;
};

export type ItemLogRow = {
	id: number;
	item_id: number;
	user_id: number;
	log: string;
	timestamp: string;
};

export type ItemMetadataRow = {
	id: number;
	item_id: number;
	key: string;
	value: string;
};

export type TodoRow = {
	id: number;
	name: string;
	description: string | null;
	done: 0 | 1;
	user_id: number;
	ai: 0 | 1;
	created_at: string;
	completed_at: string | null;
	deadline: string | null;
	project_id: number;
};

export type ReceiptRow = {
	id: number;
	user_id: number;
	amount: number;
};

export type ReceiptItemRow = {
	id: number;
	receipt_id: number;
	item_id: number;
};

export type DbOptions = {
	db?: Database;
	dbPath?: string;
};

export class Db {
	private sqlite: Database;
	private lastInsertId: ReturnType<Database["query"]>;
	private insertUser: ReturnType<Database["query"]>;
	private getUserByEmailQuery: ReturnType<Database["query"]>;
	private getUserByIdQuery: ReturnType<Database["query"]>;
	private insertSession: ReturnType<Database["query"]>;
	private getSessionByTokenQuery: ReturnType<Database["query"]>;
	private deleteSessionByTokenQuery: ReturnType<Database["query"]>;
	private insertProject: ReturnType<Database["query"]>;
	private listProjectsByUserQuery: ReturnType<Database["query"]>;
	private getProjectByIdQuery: ReturnType<Database["query"]>;
	private insertTimeEntry: ReturnType<Database["query"]>;
	private listTimeEntriesByUserQuery: ReturnType<Database["query"]>;
	private insertContainer: ReturnType<Database["query"]>;
	private listContainersQuery: ReturnType<Database["query"]>;
	private getContainerByIdQuery: ReturnType<Database["query"]>;
	private insertItem: ReturnType<Database["query"]>;
	private listItemsByContainerQuery: ReturnType<Database["query"]>;
	private getItemByIdQuery: ReturnType<Database["query"]>;
	private insertItemLog: ReturnType<Database["query"]>;
	private listItemLogsByItemQuery: ReturnType<Database["query"]>;
	private insertItemMetadata: ReturnType<Database["query"]>;
	private listItemMetadataByItemQuery: ReturnType<Database["query"]>;
	private insertTodo: ReturnType<Database["query"]>;
	private listTodosByUserQuery: ReturnType<Database["query"]>;
	private getTodoByIdQuery: ReturnType<Database["query"]>;
	private markTodoDoneQuery: ReturnType<Database["query"]>;
	private insertReceipt: ReturnType<Database["query"]>;
	private listReceiptsByUserQuery: ReturnType<Database["query"]>;
	private insertReceiptItem: ReturnType<Database["query"]>;
	private listReceiptItemsQuery: ReturnType<Database["query"]>;

	constructor(options: DbOptions = {}) {
		this.sqlite =
			options.db ?? new Database(options.dbPath ?? DB_PATH, { create: true });
		this.sqlite.run("PRAGMA journal_mode = WAL;");
		this.sqlite.run("PRAGMA foreign_keys = ON;");

		this.lastInsertId = this.sqlite.query<{ id: number }, any>(
			"SELECT last_insert_rowid() AS id",
		);

		this.insertUser = this.sqlite.query(
			"INSERT INTO users (email, password_hash) VALUES (?, ?)",
		);
		this.getUserByEmailQuery = this.sqlite.query<UserRow, string>(
			"SELECT * FROM users WHERE email = ?",
		);
		this.getUserByIdQuery = this.sqlite.query<UserRow, number>(
			"SELECT * FROM users WHERE id = ?",
		);

		this.insertSession = this.sqlite.query(
			"INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
		);
		this.getSessionByTokenQuery = this.sqlite.query<SessionRow, string>(
			"SELECT * FROM sessions WHERE token = ?",
		);
		this.deleteSessionByTokenQuery = this.sqlite.query(
			"DELETE FROM sessions WHERE token = ?",
		);

		this.insertProject = this.sqlite.query(
			"INSERT INTO projects (name, created_by) VALUES (?, ?)",
		);
		this.listProjectsByUserQuery = this.sqlite.query<ProjectRow, number>(
			"SELECT * FROM projects WHERE created_by = ? ORDER BY created_at DESC",
		);
		this.getProjectByIdQuery = this.sqlite.query<ProjectRow, number>(
			"SELECT * FROM projects WHERE id = ?",
		);

		this.insertTimeEntry = this.sqlite.query(
			"INSERT INTO time_entries (project_id, user_id, start_time, end_time) VALUES (?, ?, ?, ?)",
		);
		this.listTimeEntriesByUserQuery = this.sqlite.query<
			TimeEntryRow,
			{ userId: number; start?: string | null; end?: string | null }
		>(`
			SELECT * FROM time_entries
			WHERE user_id = $userId
				AND ($start IS NULL OR start_time >= $start)
				AND ($end IS NULL OR end_time <= $end)
			ORDER BY start_time DESC
		`);

		this.insertContainer = this.sqlite.query(
			"INSERT INTO containers (name, description) VALUES (?, ?)",
		);
		this.listContainersQuery = this.sqlite.query<ContainerRow, any>(
			"SELECT * FROM containers ORDER BY name",
		);
		this.getContainerByIdQuery = this.sqlite.query<ContainerRow, number>(
			"SELECT * FROM containers WHERE id = ?",
		);

		this.insertItem = this.sqlite.query(
			"INSERT INTO items (name, description, barcode, cost, container_id) VALUES (?, ?, ?, ?, ?)",
		);
		this.listItemsByContainerQuery = this.sqlite.query<ItemRow, number>(
			"SELECT * FROM items WHERE container_id = ? ORDER BY name",
		);
		this.getItemByIdQuery = this.sqlite.query<ItemRow, number>(
			"SELECT * FROM items WHERE id = ?",
		);

		this.insertItemLog = this.sqlite.query(
			"INSERT INTO item_logs (item_id, user_id, log, timestamp) VALUES (?, ?, ?, COALESCE(?, datetime('now')))",
		);
		this.listItemLogsByItemQuery = this.sqlite.query<ItemLogRow, number>(
			"SELECT * FROM item_logs WHERE item_id = ? ORDER BY timestamp DESC",
		);

		this.insertItemMetadata = this.sqlite.query(
			"INSERT INTO item_metadata (item_id, key, value) VALUES (?, ?, ?)",
		);
		this.listItemMetadataByItemQuery = this.sqlite.query<
			ItemMetadataRow,
			number
		>("SELECT * FROM item_metadata WHERE item_id = ? ORDER BY key");

		this.insertTodo = this.sqlite.query(
			"INSERT INTO todos (name, description, user_id, ai, deadline, project_id) VALUES (?, ?, ?, ?, ?, ?)",
		);
		this.listTodosByUserQuery = this.sqlite.query<
			TodoRow,
			{ userId: number; done?: 0 | 1 | null; projectId?: number | null }
		>(`
			SELECT * FROM todos
			WHERE user_id = $userId
				AND ($done IS NULL OR done = $done)
				AND ($projectId IS NULL OR project_id = $projectId)
			ORDER BY COALESCE(deadline, created_at) ASC
		`);
		this.getTodoByIdQuery = this.sqlite.query<TodoRow, number>(
			"SELECT * FROM todos WHERE id = ?",
		);
		this.markTodoDoneQuery = this.sqlite.query(
			"UPDATE todos SET done = 1, completed_at = COALESCE(?, datetime('now')) WHERE id = ?",
		);

		this.insertReceipt = this.sqlite.query(
			"INSERT INTO receipts (user_id, amount) VALUES (?, ?)",
		);
		this.listReceiptsByUserQuery = this.sqlite.query<ReceiptRow, number>(
			"SELECT * FROM receipts WHERE user_id = ? ORDER BY id DESC",
		);
		this.insertReceiptItem = this.sqlite.query(
			"INSERT INTO receipt_items (receipt_id, item_id) VALUES (?, ?)",
		);
		this.listReceiptItemsQuery = this.sqlite.query<ReceiptItemRow, number>(
			"SELECT * FROM receipt_items WHERE receipt_id = ?",
		);
	}

	closeDb(): void {
		this.sqlite.close();
	}

	private getLastInsertId(): number {
		const row = (this.lastInsertId as ReturnType<Database["query"]>).get() as
			| { id: number }
			| undefined;
		return row?.id ?? 0;
	}

	createUser(email: string, passwordHash: string): number {
		this.insertUser.run(email, passwordHash);
		return this.getLastInsertId();
	}

	getUserByEmail(email: string): UserRow | null {
		return (this.getUserByEmailQuery as ReturnType<Database["query"]>).get(
			email,
		) as UserRow | null;
	}

	getUserById(id: number): UserRow | null {
		return (this.getUserByIdQuery as ReturnType<Database["query"]>).get(
			id,
		) as UserRow | null;
	}

	createSession(userId: number, token: string, expiresAt: string): number {
		this.insertSession.run(userId, token, expiresAt);
		return this.getLastInsertId();
	}

	getSessionByToken(token: string): SessionRow | null {
		return (this.getSessionByTokenQuery as ReturnType<Database["query"]>).get(
			token,
		) as SessionRow | null;
	}

	deleteSessionByToken(token: string): void {
		this.deleteSessionByTokenQuery.run(token);
	}

	createProject(name: string, createdBy: number): number {
		this.insertProject.run(name, createdBy);
		return this.getLastInsertId();
	}

	listProjectsByUser(userId: number): ProjectRow[] {
		return (this.listProjectsByUserQuery as ReturnType<Database["query"]>).all(
			userId,
		) as ProjectRow[];
	}

	getProjectById(id: number): ProjectRow | null {
		return (this.getProjectByIdQuery as ReturnType<Database["query"]>).get(
			id,
		) as ProjectRow | null;
	}

	createTimeEntry(
		projectId: number,
		userId: number,
		startTime: string,
		endTime: string,
	): number {
		this.insertTimeEntry.run(projectId, userId, startTime, endTime);
		return this.getLastInsertId();
	}

	listTimeEntriesForUser(
		userId: number,
		options: { start?: string; end?: string } = {},
	): TimeEntryRow[] {
		return (this.listTimeEntriesByUserQuery as ReturnType<Database["query"]>).all(
			{
				userId,
				start: options.start ?? null,
				end: options.end ?? null,
			},
		) as TimeEntryRow[];
	}

	createContainer(name: string, description: string | null = null): number {
		this.insertContainer.run(name, description);
		return this.getLastInsertId();
	}

	listContainers(): ContainerRow[] {
		return (this.listContainersQuery as ReturnType<Database["query"]>).all() as
			| ContainerRow[]
			| [];
	}

	getContainerById(id: number): ContainerRow | null {
		return (this.getContainerByIdQuery as ReturnType<Database["query"]>).get(
			id,
		) as ContainerRow | null;
	}

	createItem(input: {
		name: string;
		description?: string | null;
		barcode?: string | null;
		cost?: number | null;
		containerId: number;
	}): number {
		this.insertItem.run(
			input.name,
			input.description ?? null,
			input.barcode ?? null,
			input.cost ?? null,
			input.containerId,
		);
		return this.getLastInsertId();
	}

	listItemsByContainer(containerId: number): ItemRow[] {
		return (this.listItemsByContainerQuery as ReturnType<Database["query"]>).all(
			containerId,
		) as ItemRow[];
	}

	getItemById(id: number): ItemRow | null {
		return (this.getItemByIdQuery as ReturnType<Database["query"]>).get(
			id,
		) as ItemRow | null;
	}

	addItemLog(
		itemId: number,
		userId: number,
		log: string,
		timestamp?: string,
	): number {
		this.insertItemLog.run(itemId, userId, log, timestamp ?? null);
		return this.getLastInsertId();
	}

	listItemLogsByItem(itemId: number): ItemLogRow[] {
		return (this.listItemLogsByItemQuery as ReturnType<Database["query"]>).all(
			itemId,
		) as ItemLogRow[];
	}

	addItemMetadata(itemId: number, key: string, value: string): number {
		this.insertItemMetadata.run(itemId, key, value);
		return this.getLastInsertId();
	}

	listItemMetadata(itemId: number): ItemMetadataRow[] {
		return (this.listItemMetadataByItemQuery as ReturnType<Database["query"]>).all(
			itemId,
		) as ItemMetadataRow[];
	}

	createTodo(input: {
		name: string;
		userId: number;
		projectId: number;
		description?: string | null;
		deadline?: string | null;
		ai?: boolean;
	}): number {
		this.insertTodo.run(
			input.name,
			input.description ?? null,
			input.userId,
			input.ai ? 1 : 0,
			input.deadline ?? null,
			input.projectId,
		);
		return this.getLastInsertId();
	}

	listTodosByUser(
		userId: number,
		options: { done?: 0 | 1; projectId?: number } = {},
	): TodoRow[] {
		return (this.listTodosByUserQuery as ReturnType<Database["query"]>).all({
			userId,
			done: options.done ?? null,
			projectId: options.projectId ?? null,
		}) as TodoRow[];
	}

	getTodoById(todoId: number): TodoRow | null {
		return (this.getTodoByIdQuery as ReturnType<Database["query"]>).get(
			todoId,
		) as TodoRow | null;
	}

	markTodoDone(todoId: number, completedAt?: string): void {
		this.markTodoDoneQuery.run(completedAt ?? null, todoId);
	}

	createReceipt(userId: number, amount: number): number {
		this.insertReceipt.run(userId, amount);
		return this.getLastInsertId();
	}

	listReceiptsByUser(userId: number): ReceiptRow[] {
		return (this.listReceiptsByUserQuery as ReturnType<Database["query"]>).all(
			userId,
		) as ReceiptRow[];
	}

	addReceiptItem(receiptId: number, itemId: number): number {
		this.insertReceiptItem.run(receiptId, itemId);
		return this.getLastInsertId();
	}

	listReceiptItems(receiptId: number): ReceiptItemRow[] {
		return (this.listReceiptItemsQuery as ReturnType<Database["query"]>).all(
			receiptId,
		) as ReceiptItemRow[];
	}
}
