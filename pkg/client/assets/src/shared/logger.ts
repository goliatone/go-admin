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

const levelRanks: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

type ActiveLoggingConfig = {
  sink: LoggerSink | null;
  level: LogLevel;
};

let activeConfig: ActiveLoggingConfig = {
  sink: null,
  level: 'debug',
};

function emit(level: LogLevel, scope: string, args: unknown[]): void {
  const config = activeConfig;
  if (!config.sink || levelRanks[level] < levelRanks[config.level]) {
    return;
  }

  const method = config.sink[level];
  if (typeof method !== 'function') {
    return;
  }

  const forwarded = scope ? [`[${scope}]`, ...args] : args;
  try {
    method(...forwarded);
  } catch {
    // Logging is diagnostic and must never interrupt the owning workflow.
  }
}

export function createLogger(scope = ''): Logger {
  const normalizedScope = scope.trim();
  return Object.freeze({
    debug: (...args: unknown[]) => emit('debug', normalizedScope, args),
    info: (...args: unknown[]) => emit('info', normalizedScope, args),
    warn: (...args: unknown[]) => emit('warn', normalizedScope, args),
    error: (...args: unknown[]) => emit('error', normalizedScope, args),
  });
}

export function configureLogging(config: LoggingConfig): () => void {
  const previous = activeConfig;
  activeConfig = {
    sink: Object.prototype.hasOwnProperty.call(config, 'sink')
      ? config.sink ?? null
      : previous.sink,
    level: config.level ?? previous.level,
  };

  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    activeConfig = previous;
  };
}

export function setLoggerSink(sink: LoggerSink | null): () => void {
  return configureLogging({ sink });
}

export function enableConsoleLogging(level: LogLevel = 'debug'): () => void {
  const browserConsole = globalThis.console;
  return configureLogging({
    level,
    sink: {
      debug: (...args: unknown[]) => browserConsole.debug(...args),
      info: (...args: unknown[]) => browserConsole.info(...args),
      warn: (...args: unknown[]) => browserConsole.warn(...args),
      error: (...args: unknown[]) => browserConsole.error(...args),
    },
  });
}
