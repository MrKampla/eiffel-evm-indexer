FROM oven/bun:latest

COPY package.json ./
COPY bun.lockb ./
COPY src ./src
COPY targets.json ./

RUN bun install
EXPOSE 80