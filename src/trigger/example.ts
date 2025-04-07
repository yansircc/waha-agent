import { logger, task, wait } from "@trigger.dev/sdk/v3";

interface HelloWorldTaskPayload {
	name: string;
}

export const helloWorldTask = task({
	id: "hello-world",
	// Set an optional maxDuration to prevent tasks from running indefinitely
	maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
	run: async (payload: HelloWorldTaskPayload, { ctx }) => {
		logger.log("Hello, world!", { payload, ctx });

		await wait.for({ seconds: 5 });

		return {
			message: "Hello, world!",
		};
	},
});
