# 使用轻量的 Node.js 基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /usr/src/app

# 先复制依赖清单，利用 Docker 缓存层
COPY package*.json ./

# 只安装生产环境依赖
RUN npm install --omit=dev

# 复制项目剩余代码
COPY . .

# 暴露端口（需与代码中的监听端口一致，你的是 1900）
EXPOSE 2777

# 启动命令，对应 package.json 里的 start 脚本
CMD ["npm", "start"]