function readPositiveInteger(name, fallback) {
    const value = process.env[name];
    if (value === undefined || value === '') return fallback;

    const parsed = Number.parseInt(value, 10);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        throw new Error(`环境变量 ${name} 必须是正整数，当前值: ${value}`);
    }
    return parsed;
}

function readBoolean(name, fallback) {
    const value = process.env[name];
    if (value === undefined || value === '') return fallback;

    if (['1', 'true', 'yes', 'on'].includes(value.toLowerCase())) return true;
    if (['0', 'false', 'no', 'off'].includes(value.toLowerCase())) return false;
    throw new Error(`环境变量 ${name} 必须是 true 或 false，当前值: ${value}`);
}

function decodeCookieValue(value) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function parseCookie(rawCookie = '') {
    return rawCookie.split(';').reduce((cookie, part) => {
        const separator = part.indexOf('=');
        if (separator <= 0) return cookie;

        const name = part.slice(0, separator).trim();
        const value = part.slice(separator + 1).trim();
        if (name) cookie[name] = decodeCookieValue(value);
        return cookie;
    }, {});
}

const config = Object.freeze({
    uid: readPositiveInteger('NETEASE_UID', 0),
    port: readPositiveInteger('MUSICDAV_PORT', readPositiveInteger('PORT', 2777)),
    playlistRoot: process.env.MUSICDAV_PLAYLIST_ROOT || '个人歌单',
    cacheTTL: readPositiveInteger('MUSICDAV_CACHE_TTL', 30) * 1000,
    logEnabled: readBoolean('MUSICDAV_LOG_ENABLED', true),
    cookie: parseCookie(process.env.NETEASE_COOKIE),
});

module.exports = { config, parseCookie, readBoolean, readPositiveInteger };
