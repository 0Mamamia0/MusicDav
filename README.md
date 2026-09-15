# MusicDAV

将网易云音乐歌单以只读 WebDAV 目录提供：浏览歌单时动态生成 `.mp3` 条目，读取歌曲时重定向到网易实际音频地址。

## 配置

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `NETEASE_UID` | `344574808` | 网易云音乐用户 ID；生产环境应在 Vercel Dashboard 配置。 |
| `NETEASE_COOKIE` | 无 | 原始 HTTP Cookie 字符串，不是 JSON；例如 `MUSIC_U=...; __csrf=...`。 |
| `MUSICDAV_LOG_ENABLED` | `true` | `true` 输出运行日志，`false` 静默。 |
| `MUSICDAV_PLAYLIST_ROOT` | `个人歌单` | WebDAV 中的歌单根目录名称。 |
| `MUSICDAV_CACHE_TTL` | `30` | 歌单和歌曲元数据缓存时长，单位秒。 |
| `MUSICDAV_PORT` | `2777` | 仅本地常驻 Node 服务使用。 |

参见 [`.env.example`](.env.example)。Cookie 会在运行时解析，且不会记录到日志中。项目不会自动读取 `.env`；本地启动时请由进程管理工具加载环境变量。

## 本地运行

```bash
NETEASE_UID=344574808 NETEASE_COOKIE="MUSIC_U=...; __csrf=..." MUSICDAV_PORT=2777 node src/main.js
```

WebDAV 地址为 `http://localhost:2777/`。

## 部署到 Vercel

项目包含 `api/index.js` 和 `api/[...path].js`，会作为 Vercel Node.js Functions 部署，无需绑定端口。

1. 导入仓库至 Vercel。
2. 在 **Settings → Environment Variables** 添加 `NETEASE_UID` 和 `NETEASE_COOKIE`；按需添加 `MUSICDAV_LOG_ENABLED=false`。
3. 重新部署。
4. 将 WebDAV 客户端连接至 `https://<你的项目>.vercel.app/api/`。

Vercel 会按请求运行并可能回收实例；本项目仅使用可自动重新生成的内存缓存，因此实例重启后首次目录访问会重新获取数据。环境变量改动只会作用于新的部署。[Vercel 环境变量文档](https://vercel.com/docs/environment-variables)

## 测试环境

`npm test` 会自动加载本地的 `.env.test`（若存在），再执行 Node 原生测试。用 [`.env.test.example`](.env.test.example) 创建 `.env.test`，并只使用测试 Cookie；`.env*` 已被 Git 忽略，示例文件除外。Vercel 不读取 `.env.test`，而是使用 Dashboard 为当前部署环境配置的变量。

## 结构

- `src/config.js`：环境变量解析与校验
- `src/logger.js`：可关闭的统一日志
- `src/music-dav.js`：WebDAV、缓存、歌单同步和音频重定向
- `src/main.js`：本地常驻服务入口
- `api/`：Vercel Function 入口
