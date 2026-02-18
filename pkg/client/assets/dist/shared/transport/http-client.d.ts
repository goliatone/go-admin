export interface HTTPRequestOptions extends RequestInit {
    json?: unknown;
    idempotencyKey?: string;
    accept?: string;
}
export declare function httpRequest(input: string, options?: HTTPRequestOptions): Promise<Response>;
export declare function readHTTPError(response: Response, fallback?: string): Promise<string>;
export declare function httpJSON<T = unknown>(input: string, options?: HTTPRequestOptions): Promise<T>;
//# sourceMappingURL=http-client.d.ts.map