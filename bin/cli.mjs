#!/usr/bin/env node
/**
 * CapabilityMap Nexus MCP v1.0.2 — Zero-Dependency Stdio-to-HTTP Bridge
 * Usage:
 *   npx -y github:Hadinkof/capabilitymap-nexus-mcp
 *   npx capabilitymap-nexus-mcp --version
 *   npx capabilitymap-nexus-mcp --help
 *   npx capabilitymap-nexus-mcp --ping
 * Optional env:
 *   NEXUS_MCP_URL=http://127.0.0.1:3088/api/mcp
 *   NEXUS_API_KEY=nxs_...
 */
import readline from 'node:readline';

const VERSION = '1.0.2';
const PUBLIC_URL = 'https://many-temperatures-optimum-radiation.trycloudflare.com/api/mcp';
const LOCAL_URL = 'http://127.0.0.1:3088/api/mcp';
const BASE_URL = process.env.NEXUS_MCP_URL || PUBLIC_URL;
const API_KEY = process.env.NEXUS_API_KEY || '';
const DEFAULT_TIMEOUT_MS = parseInt(process.env.NEXUS_TIMEOUT_MS || '10000', 10);

const args = process.argv.slice(2);

if (args.includes('--version') || args.includes('-v')) {
  process.stdout.write(`${VERSION}\n`);
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(
`CapabilityMap Nexus MCP Bridge v${VERSION}
Problem-first GitHub Capability Router & Prompt-Injection Firewall MCP Server (751+ Verified Repos, 8 MCP Tools)

Usage:
  capabilitymap-nexus-mcp [options]

Options:
  -v, --version   Print version (${VERSION}) and exit
  -h, --help      Print this help message and exit
  --ping, --check Verify connectivity to the CapabilityMap Nexus MCP Gateway and list tools

Environment Variables:
  NEXUS_MCP_URL   Override MCP HTTP endpoint (default: ${PUBLIC_URL})
  NEXUS_API_KEY   Optional Nexus Trial/Pro API Key (passed via X-Nexus-Key header)

Exposed MCP Tools (8):
  1. search_capabilities     Problem-oriented capability search & multi-component path decomposition
  2. get_project_details     Inspect repository provenance, evidence excerpts, OS & license support
  3. browse_categories       Browse all 15 primary engineering & AI capability taxonomies
  4. compare_projects        Side-by-side trade-off comparison across candidate repositories
  5. report_outcome          Submit real-world execution outcome telemetry (worked/partial/failed)
  6. provision_api_key       Self-serve 100-call free trial API key & upgrade link provisioning
  7. get_commercial_tiers    Retrieve pricing tiers (€0, €19/mo, €99/mo, €149/mo) & ROI statistics
  8. scan_repository_safety  5-Vector Prompt-Injection Firewall & AST safety scanner with badge
`);
  process.exit(0);
}

async function postJsonRpc(payload) {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': `CapabilityMap-NPX-Bridge/${VERSION}`
  };
  if (API_KEY) headers['X-Nexus-Key'] = API_KEY;

  const candidates = process.env.NEXUS_MCP_URL
    ? [process.env.NEXUS_MCP_URL]
    : [LOCAL_URL, PUBLIC_URL];

  let lastErr;
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${url}`);
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Failed to reach CapabilityMap Nexus MCP Gateway');
}

if (args.includes('--ping') || args.includes('--check')) {
  try {
    const data = await postJsonRpc({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
    const tools = data?.result?.tools || [];
    process.stdout.write(JSON.stringify({
      status: 'ok',
      version: VERSION,
      tools_count: tools.length,
      tools: tools.map((t) => t.name)
    }) + '\n');
    process.exit(0);
  } catch (err) {
    process.stderr.write(JSON.stringify({
      status: 'error',
      version: VERSION,
      error: String(err)
    }) + '\n');
    process.exit(1);
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  terminal: false
});

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    return;
  }

  try {
    const data = await postJsonRpc(msg);
    process.stdout.write(JSON.stringify(data) + '\n');
  } catch (err) {
    if (msg && msg.id !== undefined) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32603, message: String(err) }
      }) + '\n');
    }
  }
});
