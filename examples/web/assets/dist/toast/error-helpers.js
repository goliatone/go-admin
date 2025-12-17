/**
 * Error message extraction helpers
 * Matches the repository's actual backend error formats
 */
/**
 * Extract user-friendly error message from fetch Response
 * Handles multiple backend formats used in this repo:
 * 1. /admin/api/* format: {status, error} (quickstart/error_fiber.go)
 * 2. /admin/crud/* format: Problem+JSON {detail, title} (go-crud)
 * 3. go-users errors: Text with "go-users:" prefix
 */
export async function extractErrorMessage(response) {
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json') ||
        contentType.includes('application/problem+json');
    const bodyText = await response.clone().text().catch(() => '');
    if (bodyText) {
        // Try JSON payloads first (including Problem Details)
        if (isJson || bodyText.trim().startsWith('{')) {
            try {
                const data = JSON.parse(bodyText);
                // Priority 1: /admin/api/* format (quickstart/error_fiber.go:18)
                if (typeof data.error === 'string' && data.error.trim())
                    return data.error.trim();
                // Priority 2: Problem+JSON (go-crud)
                if (typeof data.detail === 'string' && data.detail.trim())
                    return data.detail.trim();
                if (typeof data.title === 'string' && data.title.trim())
                    return data.title.trim();
                // Priority 3: Generic message field
                if (typeof data.message === 'string' && data.message.trim())
                    return data.message.trim();
            }
            catch {
                // Not JSON (or parse failed) - fall through to text handling
            }
        }
        // Extract go-users errors: "... | go-users: lifecycle transition not allowed"
        if (bodyText.includes('go-users:')) {
            const match = bodyText.match(/go-users:\s*([^|]+)/);
            if (match)
                return match[1].trim();
        }
        // Extract pipe-separated errors (common pattern)
        const pipeMatch = bodyText.match(/\|\s*([^|]+)$/);
        if (pipeMatch)
            return pipeMatch[1].trim();
        // If text is short enough, return it directly
        if (bodyText.trim().length > 0 && bodyText.length < 200)
            return bodyText.trim();
    }
    // Fallback to status code
    return `Request failed (${response.status})`;
}
/**
 * Extract error message from various error types
 */
export function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'An unexpected error occurred';
}
//# sourceMappingURL=error-helpers.js.map