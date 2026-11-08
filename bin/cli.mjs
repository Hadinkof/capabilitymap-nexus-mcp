#!/usr/bin/env node
/**
 * CapabilityMap Nexus MCP — Zero-Dependency Stdio-to-HTTP Bridge
 * Usage: npx -y github:Hadinkof/capabilitymap-nexus-mcp
 * Optional env: NEXUS_API_KEY=nxs_...
 */
import readline from 'node:readline';

const BASE_URL = process.env.NEXUS_MCP_URL || 'https://many-temperatures-optimum-radiation.trycloudflare.com/api/mcp';
const API_KEY = process.env.NEXUS_API_KEY || '';

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
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'CapabilityMap-NPX-Bridge/1.0.0'
    };
    if (API_KEY) headers['X-Nexus-Key'] = API_KEY;

    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(msg)
    });
    const data = await res.json();
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
