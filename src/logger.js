function createLogger({ enabled = true, scope = 'musicdav' } = {}) {
    const write = (level, message, details) => {
        if (!enabled) return;

        const prefix = `[${scope}] ${level.toUpperCase()}`;
        if (details === undefined) console.log(`${prefix} ${message}`);
        else console.log(`${prefix} ${message}`, details);
    };

    return Object.freeze({
        debug: (message, details) => write('debug', message, details),
        info: (message, details) => write('info', message, details),
        warn: (message, details) => write('warn', message, details),
        error: (message, details) => write('error', message, details),
    });
}

module.exports = { createLogger };
