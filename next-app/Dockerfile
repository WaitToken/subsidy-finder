# 開発用 (docker-compose.yml の web サービスから利用)。
# 本番ビルドは別途 multi-stage 化すること。
FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
