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
	id: number
	project_id: number
	user_id: number
	start_time: string
	end_time: string
	is_running: 0 | 1
	description: string | null
}

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

export type NoteRow = {
	id: number
	user_id: number
	title: string
	body: string | null
	created_at: string
	updated_at: string
}

export type ReceiptRow = {
	id: number;
	user_id: number;
	amount: number;
};

export type SpreadsheetRow = {
	id: number
	user_id: number
	name: string
	description: string | null
	state: string | null
	created_at: string
}

export type ReceiptItemRow = {
	id: number;
	receipt_id: number;
	item_id: number;
};

export type UserContainerRow = {
	user_id: number;
	container_id: number;
};

export type UserItemRow = {
	user_id: number;
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
	private updateProjectQuery: ReturnType<Database["query"]>;
	private deleteProjectQuery: ReturnType<Database["query"]>;
	private insertTimeEntry: ReturnType<Database["query"]>;
	private listTimeEntriesByUserQuery: ReturnType<Database["query"]>;
	private getTimeEntryByIdQuery: ReturnType<Database["query"]>;
	private updateTimeEntryQuery: ReturnType<Database["query"]>;
	private deleteTimeEntryQuery: ReturnType<Database["query"]>;
	private insertContainer: ReturnType<Database["query"]>;
	private listContainersQuery: ReturnType<Database["query"]>;
	private listContainersForUserQuery: ReturnType<Database["query"]>;
	private getContainerByIdQuery: ReturnType<Database["query"]>;
	private getContainerByIdForUserQuery: ReturnType<Database["query"]>;
	private updateContainerQuery: ReturnType<Database["query"]>;
	private deleteContainerQuery: ReturnType<Database["query"]>;
	private insertItem: ReturnType<Database["query"]>;
	private listItemsByContainerQuery: ReturnType<Database["query"]>;
	private listItemsByContainerForUserQuery: ReturnType<Database["query"]>;
	private listItemsForUserQuery: ReturnType<Database["query"]>;
	private getItemByIdQuery: ReturnType<Database["query"]>;
	private getItemByIdForUserQuery: ReturnType<Database["query"]>;
	private updateItemQuery: ReturnType<Database["query"]>;
	private deleteItemQuery: ReturnType<Database["query"]>;
	private insertItemLog: ReturnType<Database["query"]>;
	private listItemLogsByItemQuery: ReturnType<Database["query"]>;
	private listItemLogsByItemForUserQuery: ReturnType<Database["query"]>;
	private getItemLogByIdQuery: ReturnType<Database["query"]>;
	private updateItemLogQuery: ReturnType<Database["query"]>;
	private deleteItemLogQuery: ReturnType<Database["query"]>;
	private insertItemMetadata: ReturnType<Database["query"]>;
	private listItemMetadataByItemQuery: ReturnType<Database["query"]>;
	private getItemMetadataByIdQuery: ReturnType<Database["query"]>;
	private updateItemMetadataQuery: ReturnType<Database["query"]>;
	private deleteItemMetadataQuery: ReturnType<Database["query"]>;
	private insertTodo: ReturnType<Database["query"]>;
	private listTodosByUserQuery: ReturnType<Database["query"]>;
	private getTodoByIdQuery: ReturnType<Database["query"]>;
	private updateTodoQuery: ReturnType<Database["query"]>;
	private deleteTodoQuery: ReturnType<Database["query"]>;
	private insertNote: ReturnType<Database["query"]>
	private listNotesByUserQuery: ReturnType<Database["query"]>
	private getNoteByIdQuery: ReturnType<Database["query"]>
	private updateNoteQuery: ReturnType<Database["query"]>
	private deleteNoteQuery: ReturnType<Database["query"]>
	private insertReceipt: ReturnType<Database["query"]>
	private listReceiptsByUserQuery: ReturnType<Database["query"]>
	private getReceiptByIdQuery: ReturnType<Database["query"]>
	private updateReceiptQuery: ReturnType<Database["query"]>
	private deleteReceiptQuery: ReturnType<Database["query"]>
	private insertSpreadsheet: ReturnType<Database["query"]>
	private listSpreadsheetsByUserQuery: ReturnType<Database["query"]>
	private getSpreadsheetByIdForUserQuery: ReturnType<Database["query"]>
	private updateSpreadsheetStateQuery!: ReturnType<Database["query"]>
	private insertReceiptItem: ReturnType<Database["query"]>
	private listReceiptItemsQuery: ReturnType<Database["query"]>;
	private listReceiptItemsByReceiptForUserQuery: ReturnType<Database["query"]>;
	private getReceiptItemByIdForUserQuery: ReturnType<Database["query"]>;
	private deleteReceiptItemQuery: ReturnType<Database["query"]>;
	private insertUserContainerQuery: ReturnType<Database["query"]>;
	private deleteUserContainerQuery: ReturnType<Database["query"]>;
	private listUserContainersByContainerQuery: ReturnType<Database["query"]>;
	private hasContainerAccessQuery: ReturnType<Database["query"]>;
	private insertUserItemQuery: ReturnType<Database["query"]>;
	private deleteUserItemQuery: ReturnType<Database["query"]>;
	private listUserItemsByItemQuery: ReturnType<Database["query"]>;
	private hasItemAccessQuery: ReturnType<Database["query"]>;

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
		this.updateProjectQuery = this.sqlite.query(
			"UPDATE projects SET name = ? WHERE id = ?",
		);
		this.deleteProjectQuery = this.sqlite.query(
			"DELETE FROM projects WHERE id = ?",
		);

		this.insertTimeEntry = this.sqlite.query(
			"INSERT INTO time_entries (project_id, user_id, start_time, end_time, is_running, description) VALUES (?, ?, ?, ?, ?, ?)",
		);
		this.listTimeEntriesByUserQuery = this.sqlite.query<
			TimeEntryRow,
			[
				number,
				string | null,
				string | null,
				string | null,
				string | null,
				number | null,
				number | null,
			]
		>(`
			SELECT * FROM time_entries
			WHERE user_id = ?
				AND (? IS NULL OR start_time >= ?)
				AND (? IS NULL OR end_time <= ?)
				AND (? IS NULL OR project_id = ?)
			ORDER BY start_time DESC
		`)
		this.getTimeEntryByIdQuery = this.sqlite.query<TimeEntryRow, number>(
			"SELECT * FROM time_entries WHERE id = ?",
		);
		this.updateTimeEntryQuery = this.sqlite.query(
			"UPDATE time_entries SET project_id = ?, start_time = ?, end_time = ?, is_running = ?, description = ? WHERE id = ?",
		);
		this.deleteTimeEntryQuery = this.sqlite.query(
			"DELETE FROM time_entries WHERE id = ?",
		);

		this.insertContainer = this.sqlite.query(
			"INSERT INTO containers (name, description) VALUES (?, ?)",
		);
		this.listContainersQuery = this.sqlite.query<ContainerRow, any>(
			"SELECT * FROM containers ORDER BY name",
		);
		this.listContainersForUserQuery = this.sqlite.query<ContainerRow, number>(
			`
			SELECT containers.*
			FROM containers
			JOIN user_containers ON user_containers.container_id = containers.id
			WHERE user_containers.user_id = ?
			ORDER BY containers.name
			`,
		);
		this.getContainerByIdQuery = this.sqlite.query<ContainerRow, number>(
			"SELECT * FROM containers WHERE id = ?",
		);
		this.getContainerByIdForUserQuery = this.sqlite.query<
			ContainerRow,
			{ containerId: number; userId: number }
		>(`
			SELECT containers.*
			FROM containers
			JOIN user_containers ON user_containers.container_id = containers.id
			WHERE containers.id = $containerId
				AND user_containers.user_id = $userId
		`);
		this.updateContainerQuery = this.sqlite.query(
			"UPDATE containers SET name = ?, description = ? WHERE id = ?",
		);
		this.deleteContainerQuery = this.sqlite.query(
			"DELETE FROM containers WHERE id = ?",
		);

		this.insertItem = this.sqlite.query(
			"INSERT INTO items (name, description, barcode, cost, container_id) VALUES (?, ?, ?, ?, ?)",
		);
		this.listItemsByContainerQuery = this.sqlite.query<ItemRow, number>(
			"SELECT * FROM items WHERE container_id = ? ORDER BY name",
		);
		this.listItemsByContainerForUserQuery = this.sqlite.query<
			ItemRow,
			{ containerId: number; userId: number }
		>(`
			SELECT items.*
			FROM items
			JOIN user_containers ON user_containers.container_id = items.container_id
			WHERE items.container_id = $containerId
				AND user_containers.user_id = $userId
			ORDER BY items.name
		`);
		this.listItemsForUserQuery = this.sqlite.query<ItemRow, number>(
			`
			SELECT DISTINCT items.*
			FROM items
			LEFT JOIN user_items ON user_items.item_id = items.id
			LEFT JOIN user_containers ON user_containers.container_id = items.container_id
			WHERE user_items.user_id = ? OR user_containers.user_id = ?
			ORDER BY items.name
			`,
		);
		this.getItemByIdQuery = this.sqlite.query<ItemRow, number>(
			"SELECT * FROM items WHERE id = ?",
		);
		this.getItemByIdForUserQuery = this.sqlite.query<
			ItemRow,
			{ itemId: number; userId: number }
		>(`
			SELECT items.*
			FROM items
			LEFT JOIN user_items ON user_items.item_id = items.id
			LEFT JOIN user_containers ON user_containers.container_id = items.container_id
			WHERE items.id = $itemId
				AND (user_items.user_id = $userId OR user_containers.user_id = $userId)
			LIMIT 1
		`);
		this.updateItemQuery = this.sqlite.query(
			"UPDATE items SET name = ?, description = ?, barcode = ?, cost = ?, container_id = ? WHERE id = ?",
		);
		this.deleteItemQuery = this.sqlite.query("DELETE FROM items WHERE id = ?");

		this.insertItemLog = this.sqlite.query(
			"INSERT INTO item_logs (item_id, user_id, log, timestamp) VALUES (?, ?, ?, COALESCE(?, datetime('now')))",
		);
		this.listItemLogsByItemQuery = this.sqlite.query<ItemLogRow, number>(
			"SELECT * FROM item_logs WHERE item_id = ? ORDER BY timestamp DESC",
		);
		this.listItemLogsByItemForUserQuery = this.sqlite.query<
			ItemLogRow,
			{ itemId: number; userId: number }
		>(
			"SELECT * FROM item_logs WHERE item_id = $itemId AND user_id = $userId ORDER BY timestamp DESC",
		);
		this.getItemLogByIdQuery = this.sqlite.query<ItemLogRow, number>(
			"SELECT * FROM item_logs WHERE id = ?",
		);
		this.updateItemLogQuery = this.sqlite.query(
			"UPDATE item_logs SET log = ?, timestamp = ? WHERE id = ?",
		);
		this.deleteItemLogQuery = this.sqlite.query(
			"DELETE FROM item_logs WHERE id = ?",
		);

		this.insertItemMetadata = this.sqlite.query(
			"INSERT INTO item_metadata (item_id, key, value) VALUES (?, ?, ?)",
		);
		this.listItemMetadataByItemQuery = this.sqlite.query<
			ItemMetadataRow,
			number
		>("SELECT * FROM item_metadata WHERE item_id = ? ORDER BY key");
		this.getItemMetadataByIdQuery = this.sqlite.query<ItemMetadataRow, number>(
			"SELECT * FROM item_metadata WHERE id = ?",
		);
		this.updateItemMetadataQuery = this.sqlite.query(
			"UPDATE item_metadata SET key = ?, value = ? WHERE id = ?",
		);
		this.deleteItemMetadataQuery = this.sqlite.query(
			"DELETE FROM item_metadata WHERE id = ?",
		);

		this.insertTodo = this.sqlite.query(
			"INSERT INTO todos (name, description, user_id, ai, deadline, project_id) VALUES (?, ?, ?, ?, ?, ?)",
		);
		this.listTodosByUserQuery = this.sqlite.query<
			TodoRow,
			{ $userId: number; $done?: 0 | 1 | null; $projectId?: number | null }
		>(`
			SELECT * FROM todos
			WHERE user_id = $userId
				AND ($done IS NULL OR done = $done)
				AND ($projectId IS NULL OR project_id = $projectId)
			ORDER BY COALESCE(deadline, created_at) ASC
		`)
		this.getTodoByIdQuery = this.sqlite.query<TodoRow, number>(
			"SELECT * FROM todos WHERE id = ?",
		);
		this.updateTodoQuery = this.sqlite.query(
			"UPDATE todos SET name = ?, description = ?, done = ?, deadline = ?, completed_at = ?, project_id = ? WHERE id = ?",
		);
		this.deleteTodoQuery = this.sqlite.query("DELETE FROM todos WHERE id = ?");

		this.insertNote = this.sqlite.query(
			"INSERT INTO notes (user_id, title, body) VALUES (?, ?, ?)",
		)
		this.listNotesByUserQuery = this.sqlite.query<NoteRow, number>(
			"SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC, created_at DESC",
		)
		this.getNoteByIdQuery = this.sqlite.query<NoteRow, number>(
			"SELECT * FROM notes WHERE id = ?",
		)
		this.updateNoteQuery = this.sqlite.query(
			"UPDATE notes SET title = ?, body = ?, updated_at = datetime('now') WHERE id = ?",
		)
		this.deleteNoteQuery = this.sqlite.query(
			"DELETE FROM notes WHERE id = ?",
		)

		this.insertReceipt = this.sqlite.query(
			"INSERT INTO receipts (user_id, amount) VALUES (?, ?)",
		);
		this.listReceiptsByUserQuery = this.sqlite.query<ReceiptRow, number>(
			"SELECT * FROM receipts WHERE user_id = ? ORDER BY id DESC",
		);
		this.getReceiptByIdQuery = this.sqlite.query<ReceiptRow, number>(
			"SELECT * FROM receipts WHERE id = ?",
		);
		this.updateReceiptQuery = this.sqlite.query(
			"UPDATE receipts SET amount = ? WHERE id = ?",
		);
		this.deleteReceiptQuery = this.sqlite.query(
			"DELETE FROM receipts WHERE id = ?",
		);
		this.insertSpreadsheet = this.sqlite.query(
			"INSERT INTO spreadsheets (user_id, name, description) VALUES (?, ?, ?)",
		)
		this.listSpreadsheetsByUserQuery = this.sqlite.query<SpreadsheetRow, number>(
			"SELECT * FROM spreadsheets WHERE user_id = ? ORDER BY created_at DESC",
		)
		this.getSpreadsheetByIdForUserQuery = this.sqlite.query<
			SpreadsheetRow,
			[number, number]
		>(
			"SELECT * FROM spreadsheets WHERE id = ? AND user_id = ? LIMIT 1",
		)
		this.updateSpreadsheetStateQuery = this.sqlite.query(
			"UPDATE spreadsheets SET state = ? WHERE id = ? AND user_id = ?",
		)
		this.insertReceiptItem = this.sqlite.query(
			"INSERT INTO receipt_items (receipt_id, item_id) VALUES (?, ?)",
		);
		this.listReceiptItemsQuery = this.sqlite.query<ReceiptItemRow, number>(
			"SELECT * FROM receipt_items WHERE receipt_id = ?",
		);
		this.listReceiptItemsByReceiptForUserQuery = this.sqlite.query<
			ReceiptItemRow,
			{ receiptId: number; userId: number }
		>(`
			SELECT receipt_items.*
			FROM receipt_items
			JOIN receipts ON receipts.id = receipt_items.receipt_id
			WHERE receipt_items.receipt_id = $receiptId
				AND receipts.user_id = $userId
			ORDER BY receipt_items.id DESC
		`);
		this.getReceiptItemByIdForUserQuery = this.sqlite.query<
			ReceiptItemRow,
			{ receiptItemId: number; userId: number }
		>(`
			SELECT receipt_items.*
			FROM receipt_items
			JOIN receipts ON receipts.id = receipt_items.receipt_id
			WHERE receipt_items.id = $receiptItemId
				AND receipts.user_id = $userId
		`);
		this.deleteReceiptItemQuery = this.sqlite.query(
			"DELETE FROM receipt_items WHERE id = ?",
		);

		this.insertUserContainerQuery = this.sqlite.query(
			"INSERT OR IGNORE INTO user_containers (user_id, container_id) VALUES (?, ?)",
		);
		this.deleteUserContainerQuery = this.sqlite.query(
			"DELETE FROM user_containers WHERE user_id = ? AND container_id = ?",
		);
		this.listUserContainersByContainerQuery = this.sqlite.query<
			UserContainerRow,
			number
		>("SELECT * FROM user_containers WHERE container_id = ? ORDER BY user_id");
		this.hasContainerAccessQuery = this.sqlite.query(
			"SELECT 1 FROM user_containers WHERE user_id = ? AND container_id = ?",
		);

		this.insertUserItemQuery = this.sqlite.query(
			"INSERT OR IGNORE INTO user_items (user_id, item_id) VALUES (?, ?)",
		);
		this.deleteUserItemQuery = this.sqlite.query(
			"DELETE FROM user_items WHERE user_id = ? AND item_id = ?",
		);
		this.listUserItemsByItemQuery = this.sqlite.query<UserItemRow, number>(
			"SELECT * FROM user_items WHERE item_id = ? ORDER BY user_id",
		);
		this.hasItemAccessQuery = this.sqlite.query(
			`
			SELECT 1
			FROM items
			LEFT JOIN user_items ON user_items.item_id = items.id
			LEFT JOIN user_containers ON user_containers.container_id = items.container_id
			WHERE items.id = ?
				AND (user_items.user_id = ? OR user_containers.user_id = ?)
			LIMIT 1
			`,
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

	updateProject(id: number, name: string): void {
		this.updateProjectQuery.run(name, id);
	}

	deleteProject(id: number): void {
		this.deleteProjectQuery.run(id);
	}

	createTimeEntry(
		projectId: number,
		userId: number,
		startTime: string,
		endTime: string,
		isRunning: 0 | 1,
		description?: string,
	): number {
		this.insertTimeEntry.run(
			projectId,
			userId,
			startTime,
			endTime,
			isRunning,
			description ?? null,
		)
		return this.getLastInsertId()
	}

	listTimeEntriesForUser(
		userId: number,
		options: { start?: string; end?: string; projectId?: number } = {},
	): TimeEntryRow[] {
		const start = options.start ?? null
		const end = options.end ?? null
		const projectId = options.projectId ?? null
		return (this.listTimeEntriesByUserQuery as ReturnType<Database["query"]>).all(
			userId,
			start,
			start,
			end,
			end,
			projectId,
			projectId,
		) as TimeEntryRow[]
	}

	getTimeEntryById(id: number): TimeEntryRow | null {
		return (this.getTimeEntryByIdQuery as ReturnType<Database["query"]>).get(
			id,
		) as TimeEntryRow | null;
	}

	updateTimeEntry(
		id: number,
		projectId: number,
		startTime: string,
		endTime: string,
		isRunning: 0 | 1,
		description?: string | null,
	): void {
		this.updateTimeEntryQuery.run(
			projectId,
			startTime,
			endTime,
			isRunning,
			description ?? null,
			id,
		)
	}

	deleteTimeEntry(id: number): void {
		this.deleteTimeEntryQuery.run(id);
	}

	createContainer(name: string, description: string | null = null): number {
		this.insertContainer.run(name, description);
		return this.getLastInsertId();
	}

	createContainerForUser(
		userId: number,
		name: string,
		description: string | null,
	): number {
		const tx = this.sqlite.transaction(() => {
			this.insertContainer.run(name, description);
			const containerId = this.getLastInsertId();
			this.insertUserContainerQuery.run(userId, containerId);
			return containerId;
		});

		return tx();
	}

	listContainers(): ContainerRow[] {
		return (this.listContainersQuery as ReturnType<Database["query"]>).all() as
			| ContainerRow[]
			| [];
	}

	listContainersForUser(userId: number): ContainerRow[] {
		return (this.listContainersForUserQuery as ReturnType<Database["query"]>).all(
			userId,
		) as ContainerRow[];
	}

	getContainerById(id: number): ContainerRow | null {
		return (this.getContainerByIdQuery as ReturnType<Database["query"]>).get(
			id,
		) as ContainerRow | null;
	}

	getContainerByIdForUser(
		containerId: number,
		userId: number,
	): ContainerRow | null {
		return (this.getContainerByIdForUserQuery as ReturnType<Database["query"]>).get(
			{
				containerId,
				userId,
			},
		) as ContainerRow | null;
	}

	hasContainerAccess(userId: number, containerId: number): boolean {
		const row = (this.hasContainerAccessQuery as ReturnType<Database["query"]>).get(
			userId,
			containerId,
		) as { 1: number } | undefined;
		return Boolean(row);
	}

	updateContainer(id: number, name: string, description: string | null): void {
		this.updateContainerQuery.run(name, description, id);
	}

	deleteContainer(id: number): void {
		this.deleteContainerQuery.run(id);
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

	createItemForUser(
		userId: number,
		input: {
			name: string;
			description?: string | null;
			barcode?: string | null;
			cost?: number | null;
			containerId: number;
		},
	): number {
		const tx = this.sqlite.transaction(() => {
			this.insertItem.run(
				input.name,
				input.description ?? null,
				input.barcode ?? null,
				input.cost ?? null,
				input.containerId,
			);
			const itemId = this.getLastInsertId();
			this.insertUserItemQuery.run(userId, itemId);
			return itemId;
		});

		return tx();
	}

	listItemsByContainer(containerId: number): ItemRow[] {
		return (this.listItemsByContainerQuery as ReturnType<Database["query"]>).all(
			containerId,
		) as ItemRow[];
	}

	listItemsByContainerForUser(
		userId: number,
		containerId: number,
	): ItemRow[] {
		return (
			this.listItemsByContainerForUserQuery as ReturnType<Database["query"]>
		).all({
			containerId,
			userId,
		}) as ItemRow[];
	}

	listItemsForUser(userId: number): ItemRow[] {
		return (this.listItemsForUserQuery as ReturnType<Database["query"]>).all(
			userId,
			userId,
		) as ItemRow[];
	}

	getItemById(id: number): ItemRow | null {
		return (this.getItemByIdQuery as ReturnType<Database["query"]>).get(
			id,
		) as ItemRow | null;
	}

	getItemByIdForUser(itemId: number, userId: number): ItemRow | null {
		return (this.getItemByIdForUserQuery as ReturnType<Database["query"]>).get(
			{
				itemId,
				userId,
			},
		) as ItemRow | null;
	}

	hasItemAccess(userId: number, itemId: number): boolean {
		const row = (this.hasItemAccessQuery as ReturnType<Database["query"]>).get(
			itemId,
			userId,
			userId,
		) as { 1: number } | undefined;
		return Boolean(row);
	}

	updateItem(
		id: number,
		name: string,
		description: string | null,
		barcode: string | null,
		cost: number | null,
		containerId: number,
	): void {
		this.updateItemQuery.run(name, description, barcode, cost, containerId, id);
	}

	deleteItem(id: number): void {
		this.deleteItemQuery.run(id);
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

	listItemLogsByItemForUser(
		userId: number,
		itemId: number,
	): ItemLogRow[] {
		return (
			this.listItemLogsByItemForUserQuery as ReturnType<Database["query"]>
		).all({
			itemId,
			userId,
		}) as ItemLogRow[];
	}

	getItemLogById(id: number): ItemLogRow | null {
		return (this.getItemLogByIdQuery as ReturnType<Database["query"]>).get(
			id,
		) as ItemLogRow | null;
	}

	updateItemLog(id: number, log: string, timestamp: string): void {
		this.updateItemLogQuery.run(log, timestamp, id);
	}

	deleteItemLog(id: number): void {
		this.deleteItemLogQuery.run(id);
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

	getItemMetadataById(id: number): ItemMetadataRow | null {
		return (this.getItemMetadataByIdQuery as ReturnType<Database["query"]>).get(
			id,
		) as ItemMetadataRow | null;
	}

	updateItemMetadata(id: number, key: string, value: string): void {
		this.updateItemMetadataQuery.run(key, value, id);
	}

	deleteItemMetadata(id: number): void {
		this.deleteItemMetadataQuery.run(id);
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
			$userId: userId,
			$done: options.done ?? null,
			$projectId: options.projectId ?? null,
		}) as TodoRow[]
	}

	getTodoById(todoId: number): TodoRow | null {
		return (this.getTodoByIdQuery as ReturnType<Database["query"]>).get(
			todoId,
		) as TodoRow | null;
	}

	updateTodo(
		id: number,
		name: string,
		description: string | null,
		done: 0 | 1,
		deadline: string | null,
		completedAt: string | null,
		projectId: number,
	): void {
		this.updateTodoQuery.run(
			name,
			description,
			done,
			deadline,
			completedAt,
			projectId,
			id,
		);
	}

	deleteTodo(id: number): void {
		this.deleteTodoQuery.run(id);
	}

	createNote(
		userId: number,
		title: string,
		body: string | null,
	): number {
		this.insertNote.run(userId, title, body)
		return this.getLastInsertId()
	}

	listNotesByUser(userId: number): NoteRow[] {
		return (this.listNotesByUserQuery as ReturnType<Database["query"]>).all(
			userId,
		) as NoteRow[]
	}

	getNoteById(id: number): NoteRow | null {
		return (this.getNoteByIdQuery as ReturnType<Database["query"]>).get(
			id,
		) as NoteRow | null
	}

	updateNote(id: number, title: string, body: string | null): void {
		this.updateNoteQuery.run(title, body, id)
	}

	deleteNote(id: number): void {
		this.deleteNoteQuery.run(id)
	}

	createReceipt(userId: number, amount: number): number {
		this.insertReceipt.run(userId, amount);
		return this.getLastInsertId();
	}

	createSpreadsheet(
		userId: number,
		name: string,
		description: string | null = null,
	): number {
		this.insertSpreadsheet.run(userId, name, description)
		return this.getLastInsertId()
	}

	listReceiptsByUser(userId: number): ReceiptRow[] {
		return (this.listReceiptsByUserQuery as ReturnType<Database["query"]>).all(
			userId,
		) as ReceiptRow[];
	}

	listSpreadsheetsForUser(userId: number): SpreadsheetRow[] {
		return (
			this.listSpreadsheetsByUserQuery as ReturnType<Database["query"]>
		).all(userId) as SpreadsheetRow[]
	}

	getReceiptById(id: number): ReceiptRow | null {
		return (this.getReceiptByIdQuery as ReturnType<Database["query"]>).get(
			id,
		) as ReceiptRow | null;
	}

	getSpreadsheetByIdForUser(
		spreadsheetId: number,
		userId: number,
	): SpreadsheetRow | null {
		return (
			this.getSpreadsheetByIdForUserQuery as ReturnType<Database["query"]>
		).get(spreadsheetId, userId) as SpreadsheetRow | null
	}

	updateSpreadsheetStateForUser(
		spreadsheetId: number,
		userId: number,
		state: string | null,
	): void {
		this.updateSpreadsheetStateQuery.run(state, spreadsheetId, userId)
	}

	updateReceipt(id: number, amount: number): void {
		this.updateReceiptQuery.run(amount, id);
	}

	deleteReceipt(id: number): void {
		this.deleteReceiptQuery.run(id);
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

	listReceiptItemsForUser(
		receiptId: number,
		userId: number,
	): ReceiptItemRow[] {
		return (
			this.listReceiptItemsByReceiptForUserQuery as ReturnType<Database["query"]>
		).all({
			receiptId,
			userId,
		}) as ReceiptItemRow[];
	}

	getReceiptItemByIdForUser(
		receiptItemId: number,
		userId: number,
	): ReceiptItemRow | null {
		return (
			this.getReceiptItemByIdForUserQuery as ReturnType<Database["query"]>
		).get({
			receiptItemId,
			userId,
		}) as ReceiptItemRow | null;
	}

	deleteReceiptItem(id: number): void {
		this.deleteReceiptItemQuery.run(id);
	}

	addUserToContainer(userId: number, containerId: number): void {
		this.insertUserContainerQuery.run(userId, containerId);
	}

	removeUserFromContainer(userId: number, containerId: number): void {
		this.deleteUserContainerQuery.run(userId, containerId);
	}

	listUserContainersByContainer(containerId: number): UserContainerRow[] {
		return (
			this.listUserContainersByContainerQuery as ReturnType<Database["query"]>
		).all(containerId) as UserContainerRow[];
	}

	addUserToItem(userId: number, itemId: number): void {
		this.insertUserItemQuery.run(userId, itemId);
	}

	removeUserFromItem(userId: number, itemId: number): void {
		this.deleteUserItemQuery.run(userId, itemId);
	}

	listUserItemsByItem(itemId: number): UserItemRow[] {
		return (this.listUserItemsByItemQuery as ReturnType<Database["query"]>).all(
			itemId,
		) as UserItemRow[];
	}
}
