const { config } = require('./config.js');
const { createLogger } = require('./logger.js');
const { createMusicDavServer } = require('./music-dav.js');

const logger = createLogger({ enabled: config.logEnabled });
const { server, initialize } = createMusicDavServer({ config, logger });

async function start() {
    try {
        await initialize();
        server.start(() => logger.info(`WebDAV server READY on port ${config.port}`));
    } catch (error) {
        logger.error('WebDAV 服务启动失败', error.stack || error);
        process.exitCode = 1;
    }
}

void start();
