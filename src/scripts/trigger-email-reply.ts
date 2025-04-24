/**
 * Example script for manual testing of the email reply trigger
 */
import { replyEmail } from "../trigger/reply-email";

async function triggerEmailReply() {
	// Sample form data
	const formData = {
		email: "markyan@foxmail.com",
		name: "Mark Yan",
		message:
			"Hello, I'm interested in your LED strip products. What are your minimum order quantities for shipping to the United States?",
		_country: "US",
	};

	// Trigger the email reply task
	console.log("Triggering email reply task with sample data...");
	const handle = await replyEmail.trigger(formData);

	// Log the task handle ID for tracking
	console.log(
		"Email reply task triggered successfully with handle ID:",
		handle.id,
	);
	console.log(
		"You can use this ID to check the status of the task, cancel it, or retry it if needed.",
	);
}

// Run the function
triggerEmailReply().catch((error) => {
	console.error("Error triggering email reply:", error);
});
