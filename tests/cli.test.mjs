import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CLI_PATH = join(ROOT, 'bin', 'cli.mjs');

const EXPECTED_TOOLS = [
  'search_capabilities',
  'get_project_details',
  'browse_categories',
  'compare_projects',
  'report_outcome',
  'provision_api_key',
  'get_commercial_tiers',
  'scan_repository_safety'
];

test('1. Manifest version harmonization across package.json, server.json, mcp.json, glama.json', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const srv = JSON.parse(readFileSync(join(ROOT, 'server.json'), 'utf8'));
  const mcp = JSON.parse(readFileSync(join(ROOT, 'mcp.json'), 'utf8'));
  const glama = JSON.parse(readFileSync(join(ROOT, 'glama.json'), 'utf8'));

  assert.equal(pkg.version, '1.0.2');
  assert.equal(srv.version, '1.0.2');
  assert.equal(srv.version_detail?.version, '1.0.2');
  assert.equal(mcp.version, '1.0.2');
  assert.equal(glama.version, '1.0.2');
  assert.deepEqual(mcp.tools, EXPECTED_TOOLS);
});

test('2. CLI --version prints 1.0.2 and exits cleanly with code 0', () => {
  const res = spawnSync(process.execPath, [CLI_PATH, '--version'], { encoding: 'utf8' });
  assert.equal(res.status, 0);
  assert.equal(res.stdout.trim(), '1.0.2');
});

test('3. CLI --help prints usage and all 8 MCP tools and exits with code 0', () => {
  const res = spawnSync(process.execPath, [CLI_PATH, '--help'], { encoding: 'utf8' });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /CapabilityMap Nexus MCP Bridge v1\.0\.2/);
  for (const toolName of EXPECTED_TOOLS) {
    assert.ok(res.stdout.includes(toolName), `Expected --help output to mention ${toolName}`);
  }
});

test('4. CLI --ping connects to live MCP gateway and verifies all 8 tools', () => {
  const res = spawnSync(process.execPath, [CLI_PATH, '--ping'], {
    encoding: 'utf8',
    env: { ...process.env, NEXUS_MCP_URL: 'http://127.0.0.1:3088/api/mcp' }
  });
  assert.equal(res.status, 0, `Ping failed: ${res.stderr}`);
  const parsed = JSON.parse(res.stdout.trim());
  assert.equal(parsed.status, 'ok');
  assert.equal(parsed.version, '1.0.2');
  assert.equal(parsed.tools_count, 8);
  assert.deepEqual(parsed.tools, EXPECTED_TOOLS);
});

test('5. CLI stdio JSON-RPC bridge handles tools/list and search_capabilities requests', async () => {
  const child = spawn(process.execPath, [CLI_PATH], {
    env: { ...process.env, NEXUS_MCP_URL: 'http://127.0.0.1:3088/api/mcp' },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const responses = [];
  const donePromise = new Promise((resolve, reject) => {
    let buffer = '';
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.trim()) {
          responses.push(JSON.parse(line));
          if (responses.length === 2) {
            resolve();
          }
        }
      }
    });
    child.on('error', reject);
    setTimeout(() => reject(new Error('Timeout waiting for stdio JSON-RPC responses')), 8000);
  });

  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 101, method: 'tools/list', params: {} }) + '\n');
  child.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 102,
    method: 'tools/call',
    params: {
      name: 'search_capabilities',
      arguments: { goal: 'create bootable usb drive on windows', os: 'Windows', verified_only: true }
    }
  }) + '\n');

  await donePromise;
  child.kill();

  const listResp = responses.find((r) => r.id === 101);
  const searchResp = responses.find((r) => r.id === 102);

  assert.ok(listResp, 'Expected tools/list response');
  assert.equal(listResp.result.tools.length, 8);
  assert.ok(searchResp, 'Expected tools/call search_capabilities response');
  assert.ok(Array.isArray(searchResp.result.content), 'Expected MCP content array');
});
