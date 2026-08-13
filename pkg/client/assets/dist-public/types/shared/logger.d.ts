export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogMethod = (...args: unknown[]) => void;
export interface LoggerSink {
    debug?: LogMethod;
    info?: LogMethod;
    warn?: LogMethod;
    error?: LogMethod;
}
export interface LoggingConfig {
    sink?: LoggerSink | null;
    level?: LogLevel;
}
export interface Logger {
    debug: LogMethod;
    info: LogMethod;
    warn: LogMethod;
    error: LogMethod;
}
export declare function createLogger(scope?: string): Logger;
export declare function configureLogging(config: LoggingConfig): () => void;
export declare function setLoggerSink(sink: LoggerSink | null): () => void;
export declare function enableConsoleLogging(level?: LogLevel): () => void;
//# sourceMappingURL=logger.d.ts.map