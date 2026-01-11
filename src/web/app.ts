import { markSessionStatus, navigate, routes } from "./router"
import { renderItemsPage } from "./items-page"
import { renderReceiptDetailPage } from "./receipt-detail-page"
import { renderReceiptsPage } from "./receipts-page"
import { renderSpreadsheetsPage } from "./spreadsheets-page"
import { renderSpreadsheetDetailPage } from "./spreadsheet-detail-page"
import { renderTimeTrackingPage } from "./time-page"
import { renderTodoPage } from "./todo-page"
import { bindNavbarHandlers, renderNavbar } from "./nav"

const serverAddr = window.location.origin

window.onload = () => {
	routes({
		"/login": () => renderLogin(),
		"/time": () => renderTimeTrackingPage(),
		"/items": () => renderItemsPage(),
		"/todos": () => renderTodoPage(),
		"/receipts": () => renderReceiptsPage(),
		"/receipts/:id": (params: Record<string, string>) =>
			renderReceiptDetailPage(params.id),
		"/spreadsheets": () => renderSpreadsheetsPage(),
		"/spreadsheets/:id": (params: Record<string, string>) =>
			renderSpreadsheetDetailPage(params.id ?? ""),
		"/*": () => renderHome(),
	})

	console.info("Using server address:", serverAddr)
}

function getBody(): HTMLBodyElement {
	const body = document.querySelector("body")
	if (!body) {
		throw new Error("No body element found")
	}
	return body
}

function renderHome() {
	const body = getBody()
	body.innerHTML = `
		<div class="app-frame">
			${renderNavbar("home")}
			<main class="app-shell">
				<h1>Teppo</h1>
				<p>Welcome back. Your workspace is ready.</p>
			<div class="app-actions">
				<button id="goto-time" type="button">Open time tracking</button>
				<button id="goto-items" type="button">Manage items</button>
				<button id="goto-todos" type="button">Review todos</button>
				<button id="goto-receipts" type="button">View receipts</button>
				<button id="goto-spreadsheets" type="button">View spreadsheets</button>
			</div>
			</main>
		</div>
	`

	bindNavbarHandlers(body)

	const timeButton = document.querySelector<HTMLButtonElement>("#goto-time")
	if (timeButton) {
		timeButton.addEventListener("click", () => navigate("/time"))
	}

	const itemsButton = document.querySelector<HTMLButtonElement>("#goto-items")
	if (itemsButton) {
		itemsButton.addEventListener("click", () => navigate("/items"))
	}

	const todosButton = document.querySelector<HTMLButtonElement>("#goto-todos")
	if (todosButton) {
		todosButton.addEventListener("click", () => navigate("/todos"))
	}

	const receiptsButton =
		document.querySelector<HTMLButtonElement>("#goto-receipts")
	if (receiptsButton) {
		receiptsButton.addEventListener("click", () => navigate("/receipts"))
	}
	const spreadsheetsButton =
		document.querySelector<HTMLButtonElement>("#goto-spreadsheets")
	if (spreadsheetsButton) {
		spreadsheetsButton.addEventListener("click", () =>
			navigate("/spreadsheets"),
		)
	}
}

function renderLogin() {
	const body = getBody()
	body.innerHTML = `
		<main class="app-shell">
			<h1>Sign in</h1>
			<form id="login-form">
				<label>
					<span>Email</span>
					<input name="email" type="email" required />
				</label>
				<label>
					<span>Password</span>
					<input name="password" type="password" required />
				</label>
				<button type="submit">Log in</button>
			</form>
			<p id="login-error" aria-live="polite"></p>
		</main>
	`

	const form = document.querySelector<HTMLFormElement>("#login-form")
	const error = document.querySelector<HTMLParagraphElement>("#login-error")
	if (!form || !error) return

	form.addEventListener("submit", async (event) => {
		event.preventDefault()
		error.textContent = ""
		const formData = new FormData(form)
		const email = String(formData.get("email") ?? "")
		const password = String(formData.get("password") ?? "")

		try {
			const response = await fetch("/api/login", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			})
			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as
					| { error?: string }
					| null
				error.textContent = payload?.error ?? "Login failed"
				return
			}
			markSessionStatus(true)
			navigate("/")
		} catch (err) {
			error.textContent = "Login failed"
		}
	})
}
