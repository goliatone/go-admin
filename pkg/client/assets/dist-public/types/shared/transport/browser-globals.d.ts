import { readCSRFToken } from './http-client.js';
type GoAdminWindow = Window & typeof globalThis & {
    goAdminGetCSRFToken?: typeof readCSRFToken;
    goAdminCSRFHeaders?: (headers?: HeadersInit) => Headers;
    goAdminFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};
export declare function goAdminCSRFHeaders(headers?: HeadersInit): Headers;
export declare function goAdminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
export declare function installBrowserCSRFGlobals(target?: GoAdminWindow): GoAdminWindow;
export {};
//# sourceMappingURL=browser-globals.d.ts.map