type JSONParseErrorHandler = (error: unknown) => void;
interface JSONScriptRoot {
    getElementById(id: string): {
        textContent?: string | null;
    } | null;
}
interface JSONSelectorRoot {
    querySelector(selector: string): {
        textContent?: string | null;
    } | null;
}
export declare function parseJSONValue<T>(raw: string | null | undefined, fallback: T, options?: {
    onError?: JSONParseErrorHandler;
}): T;
export declare function parseJSONArray<T>(raw: string | null | undefined, fallback: T[], options?: {
    onError?: JSONParseErrorHandler;
}): T[];
export declare function readJSONScriptValue<T>(id: string, fallback?: T | null, options?: {
    root?: JSONScriptRoot;
    onError?: JSONParseErrorHandler;
}): T | null;
export declare function readJSONSelectorValue<T>(selector: string, fallback?: T | null, options?: {
    root?: JSONSelectorRoot;
    onError?: JSONParseErrorHandler;
}): T | null;
export {};
//# sourceMappingURL=json-parse.d.ts.map