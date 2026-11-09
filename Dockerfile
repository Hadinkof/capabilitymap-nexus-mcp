FROM node:22-alpine

LABEL org.opencontainers.image.title="CapabilityMap Nexus MCP Server"
LABEL org.opencontainers.image.description="Token-disciplined GitHub capability router (666 verified repos, 96.5% token savings) and 5-vector prompt-injection firewall."
LABEL org.opencontainers.image.url="https://github.com/Hadinkof/capabilitymap-nexus-mcp"
LABEL org.opencontainers.image.source="https://github.com/Hadinkof/capabilitymap-nexus-mcp"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app
COPY package.json server.json mcp.json glama.json smithery.yaml README.md LICENSE ./
COPY bin ./bin

RUN chmod +x ./bin/cli.mjs && chown -R node:node /app
USER node

ENV NEXUS_MCP_ENDPOINT="https://many-temperatures-optimum-radiation.trycloudflare.com/api/mcp"
ENTRYPOINT ["node", "bin/cli.mjs"]
