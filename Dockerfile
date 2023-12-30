FROM oven/bun:1.0.20

COPY package.json ./
COPY targets.json ./

RUN bun install eiffel-evm-indexer
RUN bun install

# Uncomment the following lines to use local actions and endpoints
# COPY actions ./actions
# COPY endpoints ./endpoints

EXPOSE 80