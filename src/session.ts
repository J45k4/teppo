import { UnauthorizedError, jsonResponse, type RequestContext } from "./wrap";
import type { Db } from "./db";

export type AuthPayload = {
	email: string;
	password: string;
};

const SESSION_COOKIE = "session";
const SESSION_TTL_DAYS = 30;

export type SessionUser = {
	userId: number;
	token: string;
};

export type AuthResponse = { id: number; email: string } | { error: string };
export type MeResponse = { id: number; email: string };

function isAuthPayload(value: unknown): value is AuthPayload {
	if (!value || typeof value !== "object") return false;
	const payload = value as Record<string, unknown>;
	return typeof payload.email === "string" && typeof payload.password === "string";
}

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function isPasswordValid(password: string): boolean {
	return password.trim().length >= 8;
}

function getCookieValue(cookieHeader: string | null, name: string): string | null {
	if (!cookieHeader) return null;
	const parts = cookieHeader.split(";").map(part => part.trim());
	for (const part of parts) {
		if (part.startsWith(`${name}=`)) {
			return part.slice(name.length + 1);
		}
	}
	return null;
}

function buildSessionCookie(token: string, secure: boolean): string {
	const maxAge = SESSION_TTL_DAYS * 24 * 60 * 60;
	const secureFlag = secure ? "; Secure" : "";
	return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secureFlag}`;
}

function buildClearSessionCookie(secure: boolean): string {
	const secureFlag = secure ? "; Secure" : "";
	return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureFlag}`;
}

function isSessionExpired(expiresAt: string): boolean {
	return Date.parse(expiresAt) <= Date.now();
}

export function getSessionUser(req: Request, db: Db): SessionUser | null {
	const token = getCookieValue(req.headers.get("cookie"), SESSION_COOKIE);
	if (!token) return null;
	const session = db.getSessionByToken(token);
	if (!session) return null;
	if (isSessionExpired(session.expires_at)) {
		db.deleteSessionByToken(token);
		return null;
	}
	return { userId: session.user_id, token };
}

export async function login(
	ctx: RequestContext,
	payload: AuthPayload | undefined,
): Promise<ReturnType<typeof jsonResponse<AuthResponse>>> {
	if (!payload || !isAuthPayload(payload)) {
		return jsonResponse(
			{ error: "Missing email or password" },
			{ status: 400 },
		);
	}

	const email = normalizeEmail(payload.email);
	if (!email) {
		return jsonResponse({ error: "Missing email" }, { status: 400 });
	}

	const user = ctx.db.getUserByEmail(email);
	if (!user) {
		return jsonResponse({ error: "Invalid credentials" }, { status: 401 });
	}

	if (!payload.password) {
		return jsonResponse(
			{ error: "Missing email or password" },
			{ status: 400 },
		);
	}

	const isMatch = await Bun.password.verify(
		payload.password,
		user.password_hash,
	);
	if (!isMatch) {
		return jsonResponse({ error: "Invalid credentials" }, { status: 401 });
	}

	const token = crypto.randomUUID();
	const expiresAt = new Date(
		Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
	).toISOString();
	ctx.db.createSession(user.id, token, expiresAt);

	const secure = new URL(ctx.req.url).protocol === "https:";
	return jsonResponse(
		{ id: user.id, email: user.email },
		{
			headers: { "Set-Cookie": buildSessionCookie(token, secure) },
		},
	);
}

export async function signup(
	ctx: RequestContext,
	payload: AuthPayload | undefined,
): Promise<ReturnType<typeof jsonResponse<AuthResponse>>> {
	if (!payload || !isAuthPayload(payload)) {
		return jsonResponse(
			{ error: "Missing email or password" },
			{ status: 400 },
		);
	}

	const email = normalizeEmail(payload.email);
	if (!email) {
		return jsonResponse({ error: "Missing email" }, { status: 400 });
	}

	if (!isPasswordValid(payload.password)) {
		return jsonResponse(
			{ error: "Password must be at least 8 characters" },
			{ status: 400 },
		);
	}

	const existing = ctx.db.getUserByEmail(email);
	if (existing) {
		return jsonResponse(
			{ error: "Email already registered" },
			{ status: 409 },
		);
	}

	const hash = await Bun.password.hash(payload.password);
	const userId = ctx.db.createUser(email, hash);
	const user = ctx.db.getUserById(userId);
	if (!user) {
		return jsonResponse({ error: "Signup failed" }, { status: 500 });
	}

	const token = crypto.randomUUID();
	const expiresAt = new Date(
		Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
	).toISOString();
	ctx.db.createSession(user.id, token, expiresAt);

	const secure = new URL(ctx.req.url).protocol === "https:";
	return jsonResponse(
		{ id: user.id, email: user.email },
		{
			status: 201,
			headers: { "Set-Cookie": buildSessionCookie(token, secure) },
		},
	);
}

export function logout(
	ctx: RequestContext,
): ReturnType<typeof jsonResponse<{ ok: true }>> {
	const secure = new URL(ctx.req.url).protocol === "https:";
	const token = getCookieValue(ctx.req.headers.get("cookie"), SESSION_COOKIE);
	if (token) {
		ctx.db.deleteSessionByToken(token);
	}
	return jsonResponse(
		{ ok: true },
		{ headers: { "Set-Cookie": buildClearSessionCookie(secure) } },
	);
}

export function me(ctx: RequestContext<SessionUser>): MeResponse {
	const userId = ctx.user?.userId;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const user = ctx.db.getUserById(userId);
	if (!user) {
		throw new UnauthorizedError();
	}

	return { id: user.id, email: user.email };
}
