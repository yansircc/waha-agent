import { syncVercelEnvVars } from "@trigger.dev/build/extensions/core";
import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
	project: "proj_qdmzpfkksujniavozdoz",
	runtime: "node",
	logLevel: "log",
	// The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
	// You can override this on an individual task.
	// See https://trigger.dev/docs/runs/max-duration
	maxDuration: 3600,
	retries: {
		enabledInDev: true,
		default: {
			maxAttempts: 1,
		},
	},
	dirs: ["./src/trigger"],
	build: {
		extensions: [syncVercelEnvVars()],
	},
});
