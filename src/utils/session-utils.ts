/**
 * Sanitizes a session name to ensure it's API-friendly
 * @param name - Original session name
 * @returns Sanitized session name (lowercase, no special chars, underscores for spaces)
 */
export function sanitizeSessionName(name: string): string {
	const sanitized = name
		.toLowerCase()
		.replace(/[^a-z0-9_-]/g, "")
		.replace(/\s+/g, "_");

	// Use fallback if too short
	return sanitized.length < 3 ? `session_${Date.now()}` : sanitized;
}
