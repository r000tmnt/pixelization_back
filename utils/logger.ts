type LogLevel = 'info' | 'error';
type LogContext = Record<string, unknown>;

/** Write one JSON log record per line to stdout for runtime log collection. */
function writeLog(level: LogLevel, message: string, context?: LogContext): void {
    const record = {
        time: new Date().toISOString(),
        level,
        message,
        ...context,
    };

    process.stdout.write(`${JSON.stringify(record)}\n`);
}

const logger = {
    info(message: string, context?: LogContext): void {
        writeLog('info', message, context);
    },
    error(message: string, context?: LogContext): void {
        writeLog('error', message, context);
    },
};

export default logger;
