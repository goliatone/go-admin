export interface HTTPRequestOptions extends RequestInit {
    json?: unknown;
    idempotencyKey?: string;
    accept?: string;
}
export interface HTTPErrorReadResult {
    message: string;
    payload: unknown;
    rawText: string;
}
export interface HTTPResponsePayloadReadResult {
    payload: unknown;
    rawText: string;
    contentType: string;
}
export interface HTTPStructuredErrorReadResult extends HTTPErrorReadResult {
    code: string;
    details: Record<string, unknown>;
}
export declare class HTTPAuthenticationRequiredError extends Error {
    readonly loginURL: string;
    constructor(loginURL: string);
}
export declare class HTTPResponseProtocolError extends Error {
    readonly status: number;
    readonly contentType: string;
    readonly responseURL: string;
    constructor(message: string, response: Response, contentType: string);
}
export declare function readCSRFToken(): string;
export declare function appendCSRFHeader(input: string, options: RequestInit, headers: Headers): void;
export declare function httpRequest(input: string, options?: HTTPRequestOptions): Promise<Response>;
export declare function readHTTPResponsePayload(response: Response): Promise<HTTPResponsePayloadReadResult>;
export declare function readHTTPJSONValue<T>(response: Response, fallback: T): Promise<T>;
export declare function readHTTPJSON<T>(response: Response): Promise<T>;
export declare function readExpectedHTTPJSON<T>(response: Response): Promise<T>;
export declare function readHTTPJSONObject(response: Response): Promise<Record<string, unknown>>;
export declare function readHTTPErrorResult(response: Response, fallback?: string, options?: {
    appendStatusToFallback?: boolean;
}): Promise<HTTPErrorReadResult>;
export declare function readHTTPError(response: Response, fallback?: string, options?: {
    appendStatusToFallback?: boolean;
}): Promise<string>;
export declare function readHTTPStructuredErrorResult(response: Response, fallback?: string, options?: {
    appendStatusToFallback?: boolean;
}): Promise<HTTPStructuredErrorReadResult>;
export declare function httpJSON<T = unknown>(input: string, options?: HTTPRequestOptions): Promise<T>;
//# sourceMappingURL=http-client.d.ts.map