const { config } = require('../src/config.js');
const { createLogger } = require('../src/logger.js');
const { createMusicDavServer } = require('../src/music-dav.js');

const logger = createLogger({ enabled: config.logEnabled, scope: 'musicdav-vercel' });
const app = createMusicDavServer({ config, logger });
const ready = app.initialize();

function removeApiPrefix(url) {
    const parsed = new URL(url, 'http://localhost');
    parsed.pathname = parsed.pathname.replace(/^\/api(?=\/|$)/, '') || '/';
    return `${parsed.pathname}${parsed.search}`;
}

module.exports = async function handler(request, response) {
    try {
        await ready;
        request.url = removeApiPrefix(request.url);
        app.server.executeRequest(request, response);
    } catch (error) {
        logger.error('Vercel Function 初始化失败', error.stack || error);
        response.statusCode = 500;
        response.end('MusicDAV initialization failed.');
    }
};
