import { markSessionStatus, navigate } from "./router"

type NavKey = "home" | "time" | "items" | "receipts" | "todos"

const navRoutes: Record<NavKey, { label: string, path: string }> = {
	home: { label: "Home", path: "/" },
	time: { label: "Time", path: "/time" },
	items: { label: "Items", path: "/items" },
	todos: { label: "Todos", path: "/todos" },
	receipts: { label: "Receipts", path: "/receipts" },
}

export function renderNavbar(active: NavKey) {
	const links = (Object.keys(navRoutes) as NavKey[])
		.map((key) => {
			const route = navRoutes[key]
			const isActive = key === active ? " is-active" : ""
			return `
				<button
					type="button"
					class="app-nav-link${isActive}"
					data-nav="${key}"
					${key === active ? 'aria-current="page"' : ""}
				>
					${route.label}
				</button>
			`
		})
		.join("")

	return `
		<nav class="app-nav">
			<div class="app-nav-brand">Teppo</div>
			<div class="app-nav-links">
				${links}
			</div>
			<button type="button" class="app-nav-logout" data-action="logout">
				Log out
			</button>
		</nav>
	`
}

export function bindNavbarHandlers(root: ParentNode = document) {
	const navButtons = root.querySelectorAll<HTMLButtonElement>("[data-nav]")
	navButtons.forEach((button) => {
		button.addEventListener("click", () => {
			const key = button.dataset.nav as NavKey | undefined
			if (!key) return
			navigate(navRoutes[key].path)
		})
	})

	const logoutButton = root.querySelector<HTMLButtonElement>(
		"[data-action='logout']",
	)
	logoutButton?.addEventListener("click", async () => {
		try {
			await fetch("/api/logout", { method: "POST", credentials: "include" })
		} finally {
			markSessionStatus(false)
			navigate("/login")
		}
	})
}
