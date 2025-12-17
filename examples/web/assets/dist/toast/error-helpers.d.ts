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
export declare function extractErrorMessage(response: Response): Promise<string>;
/**
 * Extract error message from various error types
 */
export declare function getErrorMessage(error: unknown): string;
//# sourceMappingURL=error-helpers.d.ts.map