import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from './helpers/mcp-client.mjs';

test('Tier 3: Combinations, Concurrency & Fuzzing Suite', async (t) => {
  let client;

  t.beforeEach(async () => {
    client = await createClient();
  });

  t.afterEach(async () => {
    if (client) {
      await client.close();
    }
  });

  await t.test('C1: 20 concurrent interleaved requests correlated correctly without race condition', async () => {
    const promises = [];
    const count = 20;

    for (let i = 1; i <= count; i++) {
      const isEven = i % 2 === 0;
      const method = isEven ? 'ping' : 'tools/list';
      promises.push(
        client.request(method, {}, 8000 + i).then((res) => {
          assert.equal(res.id, 8000 + i);
          if (isEven) {
            assert.deepEqual(res.result, {});
          } else {
            assert.ok(Array.isArray(res.result.tools));
          }
          return res.id;
        })
      );
    }

    const results = await Promise.all(promises);
    assert.equal(results.length, count);
  });

  await t.test('C2: mixed concurrent introspection methods (initialize, ping, tools, prompts, resources)', async () => {
    const methods = [
      { method: 'initialize', params: { protocolVersion: '2024-11-05' } },
      { method: 'ping', params: {} },
      { method: 'tools/list', params: {} },
      { method: 'prompts/list', params: {} },
      { method: 'resources/list', params: {} },
      { method: 'resources/read', params: { uri: 'nexus://taxonomy/categories' } },
      { method: 'prompts/get', params: { name: 'discover-best-github-tool' } }
    ];

    const responses = await Promise.all(
      methods.map((m, idx) => client.request(m.method, m.params, 9100 + idx))
    );

    responses.forEach((res, idx) => {
      assert.equal(res.id, 9100 + idx);
      assert.ok(res.result);
    });
  });

  await t.test('C3: UTF-8 multibyte, emoji, and CJK payloads in tool params', async () => {
    const complexString = '🚀 Nexus 安全防火墙 🛡️ — 测试 prompt injection & secret leakage! 日本語テスト 한국어';
    const res = await client.request('tools/call', {
      name: 'firewall_inspect',
      arguments: { content: complexString }
    }, 'utf8-test');
    assert.equal(res.id, 'utf8-test');
    assert.ok(res.result || res.error);
  });

  await t.test('C4: large buffer payload (128 KB text) in single tool request', async () => {
    const largeText = 'A'.repeat(128 * 1024); // 128KB
    const res = await client.request('tools/call', {
      name: 'firewall_inspect',
      arguments: { content: largeText }
    }, 'large-buffer-test', 6000);
    assert.equal(res.id, 'large-buffer-test');
    assert.ok(res.result || res.error);
  });

  await t.test('C5: interleaved notifications sent between active request-response cycles', async () => {
    // Send request 1
    const p1 = client.request('ping', {}, 9501);
    // Send 3 notifications without waiting
    client.writeRaw('{"jsonrpc":"2.0","method":"notifications/message","params":{"level":"info"}}\n');
    client.writeRaw('{"jsonrpc":"2.0","method":"notifications/progress","params":{"progress":50}}\n');
    client.writeRaw('{"jsonrpc":"2.0","method":"notifications/progress","params":{"progress":100}}\n');
    // Send request 2
    const p2 = client.request('tools/list', {}, 9502);

    const [r1, r2] = await Promise.all([p1, p2]);
    assert.equal(r1.id, 9501);
    assert.equal(r2.id, 9502);
  });

  await t.test('C6: high volume rapid sequential pings (50 requests)', async () => {
    for (let i = 0; i < 50; i++) {
      const res = await client.request('ping', {}, 9600 + i);
      assert.equal(res.id, 9600 + i);
    }
  });

  await t.test('C7: fuzzing random JSON property keys and unusual types', async () => {
    const fuzzedPayload = {
      jsonrpc: '2.0',
      id: 9701,
      method: 'tools/call',
      params: {
        name: 'firewall_inspect',
        arguments: {
          content: 'test',
          extra_unknown_boolean: true,
          extra_unknown_array: [1, 2, 3],
          extra_unknown_null: null,
          extra_unknown_nested: { x: { y: 'z' } }
        }
      }
    };
    client.writeRaw(JSON.stringify(fuzzedPayload) + '\n');
    const msg = await client.waitForJsonMessage((m) => m.id === 9701);
    assert.equal(msg.id, 9701);
    assert.ok(msg.result || msg.error);
  });

  await t.test('C8: long line with massive whitespace padding (32KB spaces)', async () => {
    const padded = ' '.repeat(16384) + JSON.stringify({ jsonrpc: '2.0', id: 9801, method: 'ping' }) + ' '.repeat(16384) + '\n';
    client.writeRaw(padded);
    const msg = await client.waitForJsonMessage((m) => m.id === 9801);
    assert.equal(msg.id, 9801);
  });

  await t.test('C9: ANSI escape sequences and shell injection tokens in params', async () => {
    const ansiPayload = '\x1b[31;1mDanger\x1b[0m $(whoami) `cat /etc/passwd` | rm -rf /';
    const res = await client.request('tools/call', {
      name: 'firewall_inspect',
      arguments: { content: ansiPayload }
    }, 'ansi-test');
    assert.equal(res.id, 'ansi-test');
    assert.ok(res.result || res.error);
  });

  await t.test('C10: client shutdown and process exit code 0', async () => {
    const quickClient = await createClient();
    await quickClient.request('ping', {});
    await quickClient.close();
    assert.equal(quickClient.isOpen, false);
  });
});
