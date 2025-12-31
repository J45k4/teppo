import { Database } from "bun:sqlite";

const DB_PATH = process.env.DB_PATH ?? "mydb.sqlite";

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

const sqlite = new Database(DB_PATH, { create: true });
sqlite.run("PRAGMA journal_mode = WAL;");
sqlite.run("PRAGMA foreign_keys = ON;");

const lastInsertId = sqlite.query<{ id: number }, any>(
  "SELECT last_insert_rowid() AS id"
);

function getLastInsertId(): number {
  const row = lastInsertId.get();
  return row?.id ?? 0;
}

function closeDb(): void {
  sqlite.close();
}

const insertUser = sqlite.query(
  "INSERT INTO users (email, password_hash) VALUES (?, ?)"
);
const getUserByEmailQuery = sqlite.query<UserRow, string>(
  "SELECT * FROM users WHERE email = ?"
);
const getUserByIdQuery = sqlite.query<UserRow, number>(
  "SELECT * FROM users WHERE id = ?"
);

function createUser(email: string, passwordHash: string): number {
  insertUser.run(email, passwordHash);
  return getLastInsertId();
}

function getUserByEmail(email: string): UserRow | null {
  return getUserByEmailQuery.get(email) ?? null;
}

function getUserById(id: number): UserRow | null {
  return getUserByIdQuery.get(id) ?? null;
}

const insertSession = sqlite.query(
  "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)"
);
const getSessionByTokenQuery = sqlite.query<SessionRow, string>(
  "SELECT * FROM sessions WHERE token = ?"
);
const deleteSessionByTokenQuery = sqlite.query(
  "DELETE FROM sessions WHERE token = ?"
);

function createSession(userId: number, token: string, expiresAt: string): number {
  insertSession.run(userId, token, expiresAt);
  return getLastInsertId();
}

function getSessionByToken(token: string): SessionRow | null {
  return getSessionByTokenQuery.get(token) ?? null;
}

function deleteSessionByToken(token: string): void {
  deleteSessionByTokenQuery.run(token);
}

const insertProject = sqlite.query(
  "INSERT INTO projects (name, created_by) VALUES (?, ?)"
);
const listProjectsByUserQuery = sqlite.query<ProjectRow, number>(
  "SELECT * FROM projects WHERE created_by = ? ORDER BY created_at DESC"
);
const getProjectByIdQuery = sqlite.query<ProjectRow, number>(
  "SELECT * FROM projects WHERE id = ?"
);

function createProject(name: string, createdBy: number): number {
  insertProject.run(name, createdBy);
  return getLastInsertId();
}

function listProjectsByUser(userId: number): ProjectRow[] {
  return listProjectsByUserQuery.all(userId);
}

function getProjectById(id: number): ProjectRow | null {
  return getProjectByIdQuery.get(id) ?? null;
}

const insertTimeEntry = sqlite.query(
  "INSERT INTO time_entries (project_id, user_id, start_time, end_time) VALUES (?, ?, ?, ?)"
);
const listTimeEntriesByUserQuery = sqlite.query<
  TimeEntryRow,
  { userId: number; start?: string | null; end?: string | null }
>(`
  SELECT * FROM time_entries
  WHERE user_id = $userId
    AND ($start IS NULL OR start_time >= $start)
    AND ($end IS NULL OR end_time <= $end)
  ORDER BY start_time DESC
`);

function createTimeEntry(
  projectId: number,
  userId: number,
  startTime: string,
  endTime: string
): number {
  insertTimeEntry.run(projectId, userId, startTime, endTime);
  return getLastInsertId();
}

function listTimeEntriesForUser(
  userId: number,
  options: { start?: string; end?: string } = {}
): TimeEntryRow[] {
  return listTimeEntriesByUserQuery.all({
    userId,
    start: options.start ?? null,
    end: options.end ?? null,
  });
}

const insertContainer = sqlite.query(
  "INSERT INTO containers (name, description) VALUES (?, ?)"
);
const listContainersQuery = sqlite.query<ContainerRow, any>(
  "SELECT * FROM containers ORDER BY name"
);
const getContainerByIdQuery = sqlite.query<ContainerRow, number>(
  "SELECT * FROM containers WHERE id = ?"
);

function createContainer(
  name: string,
  description: string | null = null
): number {
  insertContainer.run(name, description);
  return getLastInsertId();
}

function listContainers(): ContainerRow[] {
  return listContainersQuery.all();
}

function getContainerById(id: number): ContainerRow | null {
  return getContainerByIdQuery.get(id) ?? null;
}

const insertItem = sqlite.query(
  "INSERT INTO items (name, description, barcode, cost, container_id) VALUES (?, ?, ?, ?, ?)"
);
const listItemsByContainerQuery = sqlite.query<ItemRow, number>(
  "SELECT * FROM items WHERE container_id = ? ORDER BY name"
);
const getItemByIdQuery = sqlite.query<ItemRow, number>(
  "SELECT * FROM items WHERE id = ?"
);

function createItem(input: {
  name: string;
  description?: string | null;
  barcode?: string | null;
  cost?: number | null;
  containerId: number;
}): number {
  insertItem.run(
    input.name,
    input.description ?? null,
    input.barcode ?? null,
    input.cost ?? null,
    input.containerId
  );
  return getLastInsertId();
}

function listItemsByContainer(containerId: number): ItemRow[] {
  return listItemsByContainerQuery.all(containerId);
}

function getItemById(id: number): ItemRow | null {
  return getItemByIdQuery.get(id) ?? null;
}

const insertItemLog = sqlite.query(
  "INSERT INTO item_logs (item_id, user_id, log, timestamp) VALUES (?, ?, ?, COALESCE(?, datetime('now')))"
);
const listItemLogsByItemQuery = sqlite.query<ItemLogRow, number>(
  "SELECT * FROM item_logs WHERE item_id = ? ORDER BY timestamp DESC"
);

function addItemLog(
  itemId: number,
  userId: number,
  log: string,
  timestamp?: string
): number {
  insertItemLog.run(itemId, userId, log, timestamp ?? null);
  return getLastInsertId();
}

function listItemLogsByItem(itemId: number): ItemLogRow[] {
  return listItemLogsByItemQuery.all(itemId);
}

const insertItemMetadata = sqlite.query(
  "INSERT INTO item_metadata (item_id, key, value) VALUES (?, ?, ?)"
);
const listItemMetadataByItemQuery = sqlite.query<ItemMetadataRow, number>(
  "SELECT * FROM item_metadata WHERE item_id = ? ORDER BY key"
);

function addItemMetadata(
  itemId: number,
  key: string,
  value: string
): number {
  insertItemMetadata.run(itemId, key, value);
  return getLastInsertId();
}

function listItemMetadata(itemId: number): ItemMetadataRow[] {
  return listItemMetadataByItemQuery.all(itemId);
}

const insertTodo = sqlite.query(
  "INSERT INTO todos (name, description, user_id, ai, deadline, project_id) VALUES (?, ?, ?, ?, ?, ?)"
);
const listTodosByUserQuery = sqlite.query<
  TodoRow,
  { userId: number; done?: 0 | 1 | null; projectId?: number | null }
>(`
  SELECT * FROM todos
  WHERE user_id = $userId
    AND ($done IS NULL OR done = $done)
    AND ($projectId IS NULL OR project_id = $projectId)
  ORDER BY COALESCE(deadline, created_at) ASC
`);
const getTodoByIdQuery = sqlite.query<TodoRow, number>(
  "SELECT * FROM todos WHERE id = ?"
);
const markTodoDoneQuery = sqlite.query(
  "UPDATE todos SET done = 1, completed_at = COALESCE(?, datetime('now')) WHERE id = ?"
);

function createTodo(input: {
  name: string;
  userId: number;
  projectId: number;
  description?: string | null;
  deadline?: string | null;
  ai?: boolean;
}): number {
  insertTodo.run(
    input.name,
    input.description ?? null,
    input.userId,
    input.ai ? 1 : 0,
    input.deadline ?? null,
    input.projectId
  );
  return getLastInsertId();
}

function listTodosByUser(
  userId: number,
  options: { done?: 0 | 1; projectId?: number } = {}
): TodoRow[] {
  return listTodosByUserQuery.all({
    userId,
    done: options.done ?? null,
    projectId: options.projectId ?? null,
  });
}

function getTodoById(todoId: number): TodoRow | null {
  return getTodoByIdQuery.get(todoId) ?? null;
}

function markTodoDone(todoId: number, completedAt?: string): void {
  markTodoDoneQuery.run(completedAt ?? null, todoId);
}

const insertReceipt = sqlite.query(
  "INSERT INTO receipts (user_id, amount) VALUES (?, ?)"
);
const listReceiptsByUserQuery = sqlite.query<ReceiptRow, number>(
  "SELECT * FROM receipts WHERE user_id = ? ORDER BY id DESC"
);
const insertReceiptItem = sqlite.query(
  "INSERT INTO receipt_items (receipt_id, item_id) VALUES (?, ?)"
);
const listReceiptItemsQuery = sqlite.query<ReceiptItemRow, number>(
  "SELECT * FROM receipt_items WHERE receipt_id = ?"
);

function createReceipt(userId: number, amount: number): number {
  insertReceipt.run(userId, amount);
  return getLastInsertId();
}

function listReceiptsByUser(userId: number): ReceiptRow[] {
  return listReceiptsByUserQuery.all(userId);
}

function addReceiptItem(receiptId: number, itemId: number): number {
  insertReceiptItem.run(receiptId, itemId);
  return getLastInsertId();
}

function listReceiptItems(receiptId: number): ReceiptItemRow[] {
  return listReceiptItemsQuery.all(receiptId);
}

export const db = {
  closeDb,
  createUser,
  getUserByEmail,
  getUserById,
  createSession,
  getSessionByToken,
  deleteSessionByToken,
  createProject,
  listProjectsByUser,
  getProjectById,
  createTimeEntry,
  listTimeEntriesForUser,
  createContainer,
  listContainers,
  getContainerById,
  createItem,
  listItemsByContainer,
  getItemById,
  addItemLog,
  listItemLogsByItem,
  addItemMetadata,
  listItemMetadata,
  createTodo,
  listTodosByUser,
  getTodoById,
  markTodoDone,
  createReceipt,
  listReceiptsByUser,
  addReceiptItem,
  listReceiptItems,
};
