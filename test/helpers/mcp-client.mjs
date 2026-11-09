/**
 * Opaque-box MCP Stdio Test Client Harness
 * Spawns child process running node ./bin/cli.mjs, manages newline framing,
 * JSON-RPC correlation, timeouts, raw data streaming, and graceful shutdown.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import readline from 'node:readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, '../../bin/cli.mjs');

export class McpTestClient {
  constructor(options = {}) {
    this.cliPath = options.cliPath || CLI_PATH;
    this.env = { ...process.env, ...options.env };
    this.timeoutMs = options.timeoutMs || 12000;
    this.child = null;
    this.rl = null;
    this.nextId = 1;
    this.pendingRequests = new Map(); // id -> { resolve, reject, timer }
    this.rawListeners = [];
    this.stderrOutput = [];
    this.isOpen = false;
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.child = spawn('node', [this.cliPath], {
        env: this.env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.child.on('error', (err) => {
        reject(err);
      });

      this.child.stderr.on('data', (chunk) => {
        this.stderrOutput.push(chunk.toString('utf8'));
      });

      this.child.on('exit', (code, signal) => {
        this.isOpen = false;
        const err = new Error(`Child process exited with code ${code} signal ${signal}`);
        for (const [id, req] of this.pendingRequests.entries()) {
          clearTimeout(req.timer);
          req.reject(err);
        }
        this.pendingRequests.clear();
      });

      this.rl = readline.createInterface({
        input: this.child.stdout,
        crlfDelay: Infinity,
        terminal: false
      });

      this.rl.on('line', (line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Notify raw listeners (e.g. for inspection of unparsed or fragmented frames)
        for (const listener of [...this.rawListeners]) {
          listener(line);
        }

        try {
          const msg = JSON.parse(trimmed);
          if (msg && msg.id !== undefined && this.pendingRequests.has(msg.id)) {
            const req = this.pendingRequests.get(msg.id);
            clearTimeout(req.timer);
            this.pendingRequests.delete(msg.id);
            req.resolve(msg);
          } else if (msg && msg.id === null && this.pendingRequests.has(null)) {
            const req = this.pendingRequests.get(null);
            clearTimeout(req.timer);
            this.pendingRequests.delete(null);
            req.resolve(msg);
          }
        } catch (e) {
          // ignore non-json or fragmented stdout lines
        }
      });

      this.isOpen = true;
      resolve();
    });
  }

  /**
   * Send a standard JSON-RPC request and await matching response.
   */
  request(method, params = {}, customId = undefined, timeoutMs = this.timeoutMs) {
    if (!this.isOpen || !this.child) {
      return Promise.reject(new Error('McpTestClient is not running'));
    }

    const id = customId !== undefined ? customId : this.nextId++;
    const payload = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timed out after ${timeoutMs}ms for method: ${method} (id=${id})`));
        }
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });

      try {
        this.child.stdin.write(JSON.stringify(payload) + '\n');
      } catch (err) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(err);
      }
    });
  }

  /**
   * Send a raw string directly to stdin (for protocol edge cases, chunking, malformed json)
   */
  writeRaw(rawString) {
    if (!this.isOpen || !this.child) {
      throw new Error('McpTestClient is not running');
    }
    this.child.stdin.write(rawString);
  }

  /**
   * Expect next JSON frame on stdout matching condition or timeout
   */
  waitForLine(predicate = () => true, timeoutMs = this.timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for line after ${timeoutMs}ms`));
      }, timeoutMs);

      const listener = (line) => {
        try {
          if (predicate(line)) {
            cleanup();
            resolve(line);
          }
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        const idx = this.rawListeners.indexOf(listener);
        if (idx !== -1) this.rawListeners.splice(idx, 1);
      };

      this.rawListeners.push(listener);
    });
  }

  /**
   * Expect next JSON-RPC parsed message on stdout matching condition
   */
  async waitForJsonMessage(predicate = () => true, timeoutMs = this.timeoutMs) {
    const raw = await this.waitForLine((line) => {
      try {
        const parsed = JSON.parse(line.trim());
        return predicate(parsed);
      } catch {
        return false;
      }
    }, timeoutMs);
    return JSON.parse(raw.trim());
  }

  /**
   * Graceful close
   */
  async close() {
    if (!this.child) return;
    return new Promise((resolve) => {
      this.child.stdin.end();
      const killTimer = setTimeout(() => {
        if (this.child && !this.child.killed) {
          this.child.kill('SIGTERM');
        }
      }, 500);

      this.child.on('exit', () => {
        clearTimeout(killTimer);
        this.isOpen = false;
        resolve();
      });
    });
  }
}

export async function createClient(options = {}) {
  const client = new McpTestClient(options);
  await client.start();
  return client;
}
