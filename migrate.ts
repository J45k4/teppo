import { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DB_PATH = process.env.DB_PATH ?? "mydb.sqlite";
const MIGRATIONS_DIR = "./migrations";

type MigrationRow = {
	name: string;
};

function ensureMigrationsTable(db: Database) {
	db.run(`
		CREATE TABLE IF NOT EXISTS migrations (
			name TEXT PRIMARY KEY,
			applied_at TEXT NOT NULL
		);
	`);
}

function getAppliedMigrations(db: Database): Set<string> {
	const rows = db.query<MigrationRow, any>("SELECT name FROM migrations").all();

	return new Set(rows.map(row => row.name));
}

function getMigrationFiles(): string[] {
	return readdirSync(MIGRATIONS_DIR)
		.filter(file => /^\d{10}_.*\.sql$/.test(file))
		.sort();
}

function applyMigration(db: Database, filename: string) {
	const fullPath = join(MIGRATIONS_DIR, filename);
	const sql = readFileSync(fullPath, "utf8");
	const timestamp = filename.split("_")[0];

	const tx = db.transaction(() => {
		db.exec(sql);
		db.query(
			`
			INSERT INTO migrations (name, applied_at)
			VALUES (?, datetime('now'))
		`,
		).run(filename);
	});

	tx();
	console.log(`✓ Applied ${filename} (${timestamp})`);
}

export function runMigrations(db: Database): void {
	db.run("PRAGMA journal_mode = WAL;");
	ensureMigrationsTable(db);

	const applied = getAppliedMigrations(db);
	const files = getMigrationFiles();
	const pending = files.filter(file => !applied.has(file));

	if (pending.length === 0) {
		console.log("No pending migrations");
		return;
	}

	console.log(`Running ${pending.length} migration(s)...`);

	for (const file of pending) {
		applyMigration(db, file);
	}

	console.log("All migrations applied");
}

function migrate(dbPath: string = DB_PATH): void {
	const db = new Database(dbPath, { create: true });
	try {
		runMigrations(db);
	} finally {
		try {
			db.close();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.warn(`Migration db close skipped: ${message}`);
		}
	}
}

if (import.meta.main) {
	migrate();
}
