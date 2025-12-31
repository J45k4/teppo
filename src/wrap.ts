import type { Db } from "./db";

type RouteRequest = Request & { params?: Record<string, string> };
type HeaderValues = Record<string, string>;

export type RequestContext<TUser = unknown> = {
	req: RouteRequest;
	params: Record<string, string>;
	db: Db;
	user: TUser | null;
};

export type JsonEnvelope<T> = {
	body: T;
	status?: number;
	headers?: HeaderValues;
};

export type JsonHandler<TInput, TOutput, TUser = unknown> = (
	ctx: RequestContext<TUser>,
	input: TInput,
) => Promise<TOutput | JsonEnvelope<TOutput>> | TOutput | JsonEnvelope<TOutput>;

export type WrapOptions<TUser = unknown> = {
	db: Db;
	requireAuth?: boolean;
	defaultStatus?: number;
	parseBody?: boolean;
	getUser?: (req: RouteRequest, db: Db) => TUser | null;
};

export class HttpError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

export class BadRequestError extends HttpError {
	constructor(message = "Bad Request") {
		super(400, message);
	}
}

export class UnauthorizedError extends HttpError {
	constructor(message = "Unauthorized") {
		super(401, message);
	}
}

export class ForbiddenError extends HttpError {
	constructor(message = "Forbidden") {
		super(403, message);
	}
}

export class NotFoundError extends HttpError {
	constructor(message = "Not Found") {
		super(404, message);
	}
}

export function jsonResponse<T>(
	body: T,
	init?: { status?: number; headers?: HeaderValues },
): JsonEnvelope<T> {
	return { body, status: init?.status, headers: init?.headers };
}

export function wrap<TInput, TOutput, TUser = unknown>(
	handler: JsonHandler<TInput, TOutput, TUser>,
	options: WrapOptions<TUser>,
) {
	return async (req: RouteRequest): Promise<Response> => {
		let input: TInput = undefined as TInput;
		const parseBody = options.parseBody ?? true;
		if (parseBody && req.method !== "GET" && req.method !== "HEAD") {
			try {
				const text = await req.text();
				if (text.trim().length > 0) {
					input = JSON.parse(text) as TInput;
				}
			} catch {
				return Response.json({ error: "Invalid JSON" }, { status: 400 });
			}
		}

		const user = options.getUser ? options.getUser(req, options.db) : null;
		if (options.requireAuth && !user) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		const ctx: RequestContext<TUser> = {
			req,
			params: req.params ?? {},
			db: options.db,
			user,
		};

		try {
			const result = await handler(ctx, input);
			const envelope =
				result && typeof result === "object" && "body" in result
					? (result as JsonEnvelope<TOutput>)
					: null;
			const status = envelope?.status ?? options.defaultStatus ?? 200;
			const headers = envelope?.headers;
			const body = envelope ? envelope.body : (result as TOutput);
			return Response.json(body, { status, headers });
		} catch (error) {
			if (error instanceof HttpError) {
				return Response.json({ error: error.message }, { status: error.status });
			}
			const message =
				error instanceof Error ? error.message : "Internal Server Error";
			return Response.json({ error: message }, { status: 500 });
		}
	};
}
