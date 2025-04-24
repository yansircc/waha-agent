import { env } from "@/env";
import jwt from "jsonwebtoken";

const formId = "gf25yb51m5wa936sa8ak";
const webhookSecret = "9cb15j74e0b5zixcmbnhsa5s4hh14pw94"; // Keep your actual secret secure

// Generate the JWT signature
const signature = jwt.sign({ formid: formId }, webhookSecret);

const triggerWebhook = async () => {
	console.log(`Triggering webhook for formId: ${formId}`);
	console.log(`Generated Signature: ${signature}`); // Log the signature for debugging

	const response = await fetch(
		`${env.NEXT_PUBLIC_APP_URL}/api/webhooks/email/${formId}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-signature": signature, // Use the generated JWT signature
			},
			body: JSON.stringify({
				email: "cnmarkyan@gmail.com",
				name: "Mark Yan",
				message:
					"May I ask, does NMN weaken the metabolic benefits of exercise in obese mice (Yu et al., 2021)? Please combine NAD⁺ metabolism with energy sensing mechanisms to speculate on possible physiological mechanisms, and discuss what this means for the promotion of NMN as an anti-aging supplement?",
				_country: "US",
			}),
		},
	);

	// Log the response status and body
	const responseBody = await response.text(); // Read body as text to avoid JSON parsing issues if not JSON
	console.log(`Response Status: ${response.status}`);
	console.log(`Response Body: ${responseBody}`);

	if (!response.ok) {
		console.error("Webhook trigger failed:", response.statusText);
	}
};

triggerWebhook().catch((error) => {
	console.error("Error triggering webhook:", error);
});
