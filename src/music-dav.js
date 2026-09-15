const webdav = require('webdav-server').v2;
const netease = require('./netease.js');

function playlistPath(config, playlistName) {
    return `/${config.playlistRoot}/${playlistName}`;
}

function safeFileName(name) {
    const normalized = String(name || '未知歌曲').replace(/[\\/:*?"<>|]/g, '_').trim();
    return normalized || '未知歌曲';
}

function createMusicDavServer({ config, logger }) {
    const server = new webdav.WebDAVServer({ port: config.port });
    const cache = {
        playlists: { lastUpdate: 0, pending: null, byName: new Map() },
        tracks: new Map(),
        trackIds: new Map(),
    };

    const isFresh = (entry) => Date.now() - entry.lastUpdate < config.cacheTTL;
    const rootPath = `/${config.playlistRoot}`;
    const isPlaylistRoot = (path) => path === rootPath;
    const isPlaylistFolder = (path) => path.startsWith(`${rootPath}/`) && !path.endsWith('.mp3');
    const isTrackFile = (path) => path.startsWith(`${rootPath}/`) && path.endsWith('.mp3');

    async function addMissingEntries(label, parentPath, tree) {
        const context = server.createExternalContext();
        const existingNames = new Set(await server.rootFileSystem().readDirAsync(context, parentPath));
        const missingTree = Object.fromEntries(
            Object.entries(tree).filter(([name]) => !existingNames.has(name))
        );

        logger.debug(`${label}: 已存在 ${existingNames.size} 项，新增 ${Object.keys(missingTree).length} 项`);
        if (Object.keys(missingTree).length === 0) return;

        await server.rootFileSystem().addSubTreeAsync(context, parentPath, missingTree);
        logger.debug(`${label}: 写入完成`, Object.keys(missingTree).slice(0, 5));
    }

    async function updatePlaylistList() {
        if (isFresh(cache.playlists) && cache.playlists.pending) return cache.playlists.pending;

        cache.playlists.pending = (async () => {
            const playlists = await netease.user_playlist(config.uid, config.cookie);
            const tree = {};
            const byName = new Map();

            for (const playlist of playlists) {
                tree[playlist.name] = webdav.ResourceType.Directory;
                byName.set(playlist.name, playlist);
            }

            await addMissingEntries('歌单列表', rootPath, tree);
            cache.playlists.byName = byName;
            cache.playlists.lastUpdate = Date.now();
            logger.info(`歌单列表已更新，共 ${playlists.length} 个歌单`);
        })();

        return cache.playlists.pending;
    }

    async function updatePlaylistTracks(playlistName) {
        const entry = cache.tracks.get(playlistName) || { lastUpdate: 0, pending: null };
        if (isFresh(entry) && entry.pending) return entry.pending;

        entry.pending = (async () => {
            await updatePlaylistList();
            const playlist = cache.playlists.byName.get(playlistName);
            if (!playlist) throw new Error(`歌单不存在: ${playlistName}`);

            const detail = await netease.playlist_detail(playlist.id, config.cookie);
            if (!detail) throw new Error(`无法获取歌单详情: id=${playlist.id}`);

            const tree = {};
            const usedNames = new Set();
            for (const song of detail.songs) {
                const baseName = `${safeFileName(song.name)}.mp3`;
                const fileName = usedNames.has(baseName)
                    ? `${safeFileName(song.name)} [${song.id}].mp3`
                    : baseName;

                usedNames.add(fileName);
                tree[fileName] = webdav.ResourceType.File;
                cache.trackIds.set(`${playlistPath(config, playlistName)}/${fileName}`, song.id);
            }

            await addMissingEntries(`歌曲「${playlistName}」`, playlistPath(config, playlistName), tree);
            entry.lastUpdate = Date.now();
            cache.tracks.set(playlistName, entry);
            logger.info(`歌单「${playlistName}」已更新，共 ${detail.songs.length} 首`);
        })();

        return entry.pending;
    }

    async function redirectTrackRequest(context, path) {
        try {
            let songId = cache.trackIds.get(path);
            if (!songId) {
                await updatePlaylistTracks(path.split('/')[2]);
                songId = cache.trackIds.get(path);
            }
            if (!songId) throw new Error(`无法从路径定位歌曲 ID: ${path}`);

            const songUrl = await netease.getSongUrl(songId, config.cookie);
            if (!songUrl) throw new Error(`网易未返回可播放地址: id=${songId}`);

            logger.info(`重定向歌曲 id=${songId}`);
            context.response.statusCode = 302;
            context.response.setHeader('Location', songUrl);
            context.response.setHeader('Cache-Control', 'no-store');
            context.response.end();
        } catch (error) {
            logger.error(`获取歌曲地址失败: ${path}`, error.stack || error);
            context.response.statusCode = 502;
            context.response.end('Unable to get the song URL.');
        }
    }

    server.beforeRequest((context, next) => {
        const method = context.request.method;
        const path = decodeURIComponent(context.requested.path.toString());
        logger.debug(`${method} ${path}`);

        if (method === 'GET' && isTrackFile(path)) {
            void redirectTrackRequest(context, path);
            return;
        }
        if (method !== 'PROPFIND' || path === '/') return next();

        const update = isPlaylistRoot(path)
            ? updatePlaylistList()
            : isPlaylistFolder(path)
                ? updatePlaylistTracks(path.split('/')[2])
                : null;

        if (!update) return next();
        update.then(() => next()).catch((error) => {
            logger.error(`刷新目录失败: ${path}`, error.stack || error);
            next();
        });
    });

    let initialized;
    function initialize() {
        if (!initialized) {
            initialized = server.rootFileSystem()
                .addSubTreeAsync(server.createExternalContext(), {
                    [config.playlistRoot]: webdav.ResourceType.Directory,
                })
                .then(() => logger.info('WebDAV 文件树已初始化'));
        }
        return initialized;
    }

    return { server, initialize };
}

module.exports = { createMusicDavServer };
