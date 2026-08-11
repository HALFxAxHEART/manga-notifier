FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json ./
COPY src ./src
COPY tsconfig.json ./

CMD ["bun", "run", "src/index.ts"]
