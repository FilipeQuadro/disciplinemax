type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  operation?: string;
  duration_ms?: number;
  status?: string;
  requestId?: string;
  [key: string]: unknown;
}

const SERVICE_NAME = "disciplina";

// Async local storage for request-scoped requestId
let _currentRequestId: string | undefined;

export function setRequestId(id: string | undefined): void {
  _currentRequestId = id;
}

export function getRequestId(): string | undefined {
  return _currentRequestId;
}

export function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: SERVICE_NAME,
    ...data,
  };

  // Attach requestId if set in context
  if (_currentRequestId && !entry.requestId) {
    entry.requestId = _currentRequestId;
  }

  const output = JSON.stringify(entry);

  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.log(output);
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, data),
  info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log("error", msg, data),
};
