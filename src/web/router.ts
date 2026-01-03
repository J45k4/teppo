type HandlerResult = void | Promise<void>

let matcher: any
let sessionChecked = false
let sessionAuthenticated = false

type MatchResult = {
	pattern: string
	result: any
} | null

type Handler = (params: Record<string, string>) => any

export function patternMatcher(handlers: Record<string, Handler>) {
	const routes = Object.keys(handlers).sort((a, b) => {
		if (!a.includes("*") && !a.includes(":")) return -1
		if (!b.includes("*") && !b.includes(":")) return 1

		if (a.includes(":") && !b.includes(":")) return -1
		if (!a.includes(":") && b.includes(":")) return 1

		if (a.includes("*") && !b.includes("*")) return 1
		if (!a.includes("*") && b.includes("*")) return -1

		return b.length - a.length
	})

	return {
		match(path: string): MatchResult {
			for (const route of routes) {
				const params = matchRoute(route, path)
				if (params !== null) {
					const handler = handlers[route]
					if (!handler) continue
					return {
						pattern: route,
						result: handler(params),
					}
				}
			}
			return null
		},
	}
}

function matchRoute(pattern: string, path: string): Record<string, string> | null {
	const patternParts = pattern.split("/").filter((segment) => segment.length > 0)
	const pathParts = path.split("/").filter((segment) => segment.length > 0)

	if (pattern === "/*") return {}

	if (patternParts.length !== pathParts.length) {
		const lastPattern = patternParts[patternParts.length - 1] ?? ""
		if (lastPattern === "*" && pathParts.length >= patternParts.length - 1) {
			return {}
		}
		return null
	}

	const params: Record<string, string> = {}

	for (let i = 0; i < patternParts.length; i++) {
		const patternPart = patternParts[i]!
		const pathPart = pathParts[i]!

		if (patternPart === "*") {
			return params
		}
		if (patternPart.startsWith(":")) {
			const paramName = patternPart.slice(1)
			params[paramName] = pathPart
		} else if (patternPart !== pathPart) {
			return null
		}
	}

	return params
}

export function markSessionStatus(authenticated: boolean) {
	sessionChecked = true
	sessionAuthenticated = authenticated
}

function isSessionAuthenticated(): boolean {
	return sessionAuthenticated
}

function hasSessionBeenChecked(): boolean {
	return sessionChecked
}

async function fetchMe(): Promise<{ id: number; email: string } | null> {
	const response = await fetch("/api/me", { credentials: "include" })
	if (response.status === 401) {
		return null
	}
	if (!response.ok) {
		throw new Error("Failed to fetch session")
	}
	return response.json()
}

async function ensureSession(path: string): Promise<boolean> {
	if (path === "/login") return true
	if (isSessionAuthenticated()) return true
	if (hasSessionBeenChecked()) {
		return false
	}
	try {
		const me = await fetchMe()
		markSessionStatus(!!me)
		return !!me
	} catch {
		markSessionStatus(false)
		return false
	}
}

const handleRoute = async (path: string) => {
	if (!matcher) return
	const match = matcher.match(path)
	if (!match) {
		console.error("No route found for", path)
		return
	}
	const requiresAuth = path !== "/login"
	if (requiresAuth && !(await ensureSession(path))) {
		navigate("/login")
		return
	}
	await Promise.resolve(match.result as HandlerResult)
}

window.addEventListener("popstate", () => {
	void handleRoute(window.location.pathname)
})

export const routes = (routes: any) => {
	matcher = patternMatcher(routes)
	void handleRoute(window.location.pathname)
}

export const navigate = (path: string) => {
	window.history.pushState({}, "", path)
	void handleRoute(path)
}
