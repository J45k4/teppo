import { handleLogin, handleLogout, handleSignup } from "./session";
import { handleCreateTodo, handleGetTodo } from "./todo";

Bun.serve({
	routes: {
		"/signup": {
			POST: handleSignup,
		},
		"/login": {
			POST: handleLogin,
		},
		"/logout": {
			POST: handleLogout,
		},
		"/todo/:id": {
			GET: handleGetTodo,
		},
		"/todo": {
			POST: handleCreateTodo,
		},
	},
});
