import { Database } from "bun:sqlite"
import { Db, DB_PATH } from "../src/db"
import { runMigrations } from "../migrate"

const args = Bun.argv.slice(2)

function getArgValue(flag: string): string | null {
	const index = args.indexOf(flag)
	if (index === -1) return null
	return args[index + 1] ?? null
}

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase()
}

function printUsage(): void {
	console.log(
		"Usage: bun run scripts/change-password.ts --email <email> --password <password>",
	)
}

async function main(): Promise<void> {
	const emailArg = getArgValue("--email")
	const passwordArg = getArgValue("--password")

	if (!emailArg || !passwordArg) {
		printUsage()
		process.exit(1)
	}

	const email = normalizeEmail(emailArg)
	if (!email) {
		console.error("Email is required")
		process.exit(1)
	}

	const sqlite = new Database(DB_PATH, { create: true })
	await runMigrations(sqlite)
	const db = new Db({ db: sqlite })

	const user = db.getUserByEmail(email)
	if (!user) {
		console.error(`User not found for ${email}`)
		sqlite.close()
		process.exit(1)
	}

	const hash = await Bun.password.hash(passwordArg)
	sqlite.query("UPDATE users SET password_hash = ? WHERE id = ?").run(
		hash,
		user.id,
	)

	console.log(`Updated password for ${email} (id ${user.id})`)
	sqlite.close()
}

await main()
