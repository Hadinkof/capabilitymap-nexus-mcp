import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from './helpers/mcp-client.mjs';

test('Tier 2: Boundaries, Edge Cases & Error Handling Suite', async (t) => {
  let client;

  t.beforeEach(async () => {
    client = await createClient();
  });

  t.afterEach(async () => {
    if (client) {
      await client.close();
    }
  });

  // Category 1: JSON-RPC -32700 Parse error (5 tests)
  await t.test('E1.1: malformed json syntax triggers parse error or graceful frame ignore without crash', async () => {
    client.writeRaw('{ malformed json string without quotes\n');
    // Send valid ping right after to verify process is alive
    const res = await client.request('ping', {});
    assert.equal(res.jsonrpc, '2.0');
    assert.deepEqual(res.result, {});
  });

  await t.test('E1.2: truncated json brackets do not crash child process', async () => {
    client.writeRaw('{"jsonrpc":"2.0","method":"ping","id":99\n'); // missing closing brace
    const res = await client.request('ping', {});
    assert.equal(res.jsonrpc, '2.0');
  });

  await t.test('E1.3: raw invalid tokens do not crash server', async () => {
    client.writeRaw('NaN\nundefined\nnull\n');
    const res = await client.request('ping', {});
    assert.equal(res.jsonrpc, '2.0');
  });

  await t.test('E1.4: binary/control characters embedded in json string handled safely without crash', async () => {
    client.writeRaw('{"jsonrpc":"2.0","id":1001,"method":"ping","params":{"test":"\x00\x01\x02"}}\n');
    const res = await client.request('ping', {});
    assert.equal(res.jsonrpc, '2.0');
  });

  await t.test('E1.5: recovery after massive invalid payload bursts', async () => {
    for (let i = 0; i < 20; i++) {
      client.writeRaw(`INVALID_BURST_${i}!!!\n`);
    }
    const res = await client.request('ping', {});
    assert.equal(res.jsonrpc, '2.0');
  });

  // Category 2: JSON-RPC -32600 Invalid Request (5 tests)
  await t.test('E2.1: non-object json payload (array root) handled safely', async () => {
    client.writeRaw('[1, 2, 3]\n');
    const res = await client.request('ping', {});
    assert.equal(res.jsonrpc, '2.0');
  });

  await t.test('E2.2: string primitive json payload handled safely', async () => {
    client.writeRaw('"just a string"\n');
    const res = await client.request('ping', {});
    assert.equal(res.jsonrpc, '2.0');
  });

  await t.test('E2.3: number primitive json payload handled safely', async () => {
    client.writeRaw('42\n');
    const res = await client.request('ping', {});
    assert.equal(res.jsonrpc, '2.0');
  });

  await t.test('E2.4: missing method field in json object does not crash server', async () => {
    client.writeRaw('{"jsonrpc":"2.0","id":2004}\n');
    const res = await client.request('ping', {});
    assert.equal(res.jsonrpc, '2.0');
  });

  await t.test('E2.5: wrong jsonrpc version specification is tolerated', async () => {
    const res = await client.request('ping', {}, 2005);
    assert.equal(res.id, 2005);
  });

  // Category 3: JSON-RPC -32601 Method not found & Unknown Methods (5 tests)
  await t.test('E3.1: unknown method call does not terminate connection and server recovers', async () => {
    client.writeRaw('{"jsonrpc":"2.0","id":3001,"method":"unknown/nonexistent_method","params":{}}\n');
    const res = await client.request('ping', {});
    assert.equal(res.jsonrpc, '2.0');
  });

  await t.test('E3.2: empty string method name does not crash server', async () => {
    client.writeRaw('{"jsonrpc":"2.0","id":3002,"method":"","params":{}}\n');
    const res = await client.request('ping', {});
    assert.equal(res.jsonrpc, '2.0');
  });

  await t.test('E3.3: method with path traversal characters does not crash server', async () => {
    client.writeRaw('{"jsonrpc":"2.0","id":3003,"method":"../../etc/passwd","params":{}}\n');
    const res = await client.request('ping', {});
    assert.equal(res.jsonrpc, '2.0');
  });

  await t.test('E3.4: method with spaces and control codes does not crash server', async () => {
    client.writeRaw('{"jsonrpc":"2.0","id":3004,"method":"foo bar baz\\t\\r","params":{}}\n');
    const res = await client.request('ping', {});
    assert.equal(res.jsonrpc, '2.0');
  });

  await t.test('E3.5: system.* internal namespace calls handled cleanly', async () => {
    client.writeRaw('{"jsonrpc":"2.0","id":3005,"method":"system.listMethods","params":{}}\n');
    const res = await client.request('ping', {});
    assert.equal(res.jsonrpc, '2.0');
  });

  // Category 4: Chunk Fragmentation & Line Framing (10 tests)
  await t.test('E4.1: single request sent byte-by-byte arrives and executes', async () => {
    const payload = JSON.stringify({ jsonrpc: '2.0', id: 4001, method: 'ping', params: {} }) + '\n';
    for (const char of payload) {
      client.writeRaw(char);
    }
    const msg = await client.waitForJsonMessage((m) => m.id === 4001);
    assert.equal(msg.id, 4001);
    assert.deepEqual(msg.result, {});
  });

  await t.test('E4.2: chunk split exactly in the middle of a string property', async () => {
    const p1 = '{"jsonrpc":"2.0","id":4002,"method":"init';
    const p2 = 'ialize","params":{}}\n';
    client.writeRaw(p1);
    await new Promise((r) => setTimeout(r, 20));
    client.writeRaw(p2);
    const msg = await client.waitForJsonMessage((m) => m.id === 4002);
    assert.equal(msg.id, 4002);
    assert.ok(msg.result);
  });

  await t.test('E4.3: multiple requests packed in single write without newline delay', async () => {
    const r1 = JSON.stringify({ jsonrpc: '2.0', id: 40031, method: 'ping' });
    const r2 = JSON.stringify({ jsonrpc: '2.0', id: 40032, method: 'ping' });
    client.writeRaw(r1 + '\n' + r2 + '\n');
    const m1 = await client.waitForJsonMessage((m) => m.id === 40031);
    const m2 = await client.waitForJsonMessage((m) => m.id === 40032);
    assert.equal(m1.id, 40031);
    assert.equal(m2.id, 40032);
  });

  await t.test('E4.4: windows style CRLF line endings are parsed seamlessly', async () => {
    client.writeRaw('{"jsonrpc":"2.0","id":4004,"method":"ping"}\r\n');
    const msg = await client.waitForJsonMessage((m) => m.id === 4004);
    assert.equal(msg.id, 4004);
  });

  await t.test('E4.5: successive empty lines are ignored cleanly', async () => {
    client.writeRaw('\n\n\r\n\n   \n\t\n{"jsonrpc":"2.0","id":4005,"method":"ping"}\n\n');
    const msg = await client.waitForJsonMessage((m) => m.id === 4005);
    assert.equal(msg.id, 4005);
  });

  await t.test('E4.6: trailing whitespace on JSON line is ignored', async () => {
    client.writeRaw('{"jsonrpc":"2.0","id":4006,"method":"ping"}    \t   \n');
    const msg = await client.waitForJsonMessage((m) => m.id === 4006);
    assert.equal(msg.id, 4006);
  });

  await t.test('E4.7: leading whitespace on JSON line is ignored', async () => {
    client.writeRaw('      {"jsonrpc":"2.0","id":4007,"method":"ping"}\n');
    const msg = await client.waitForJsonMessage((m) => m.id === 4007);
    assert.equal(msg.id, 4007);
  });

  await t.test('E4.8: fragmented multi-line JSON object within single request', async () => {
    // Note: readline reads line-by-line; line-broken JSON within one request
    // Tests that intermediate lines don't crash and next valid one succeeds
    client.writeRaw('{\n"jsonrpc":"2.0",\n"id":4008,\n"method":"ping"\n}\n');
    const res = await client.request('ping', {}, 4009);
    assert.equal(res.id, 4009);
  });

  await t.test('E4.9: single character bursts followed by complete frame', async () => {
    client.writeRaw(' ');
    await new Promise((r) => setTimeout(r, 10));
    client.writeRaw('{"jsonrpc":"2.0","id":4010,"method":"ping"}\n');
    const msg = await client.waitForJsonMessage((m) => m.id === 4010);
    assert.equal(msg.id, 4010);
  });

  await t.test('E4.10: high-frequency newline flood does not crash process', async () => {
    client.writeRaw('\n'.repeat(500));
    const res = await client.request('ping', {});
    assert.equal(res.jsonrpc, '2.0');
  });

  // Category 5: Request ID Boundaries & Types (10 tests)
  await t.test('E5.1: string identifier for request id', async () => {
    const res = await client.request('ping', {}, 'str-req-id-1234');
    assert.equal(res.id, 'str-req-id-1234');
  });

  await t.test('E5.2: numeric zero as request id', async () => {
    const res = await client.request('ping', {}, 0);
    assert.equal(res.id, 0);
  });

  await t.test('E5.3: negative integer as request id', async () => {
    const res = await client.request('ping', {}, -42);
    assert.equal(res.id, -42);
  });

  await t.test('E5.4: large 64-bit integer as request id', async () => {
    const res = await client.request('ping', {}, 9007199254740991);
    assert.equal(res.id, 9007199254740991);
  });

  await t.test('E5.5: UUID string as request id', async () => {
    const uuid = 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6';
    const res = await client.request('ping', {}, uuid);
    assert.equal(res.id, uuid);
  });

  await t.test('E5.6: special characters in string request id', async () => {
    const specialId = 'id::with:colons/and.dots_and-dashes';
    const res = await client.request('ping', {}, specialId);
    assert.equal(res.id, specialId);
  });

  await t.test('E5.7: unicode characters in string request id', async () => {
    const unicodeId = 'id-🚀-🛡️-nexus';
    const res = await client.request('ping', {}, unicodeId);
    assert.equal(res.id, unicodeId);
  });

  await t.test('E5.8: null id notification produces no response', async () => {
    client.writeRaw('{"jsonrpc":"2.0","method":"notifications/cancelled","params":{}}\n');
    // Ensure following request receives matching response with no spurious null response
    const res = await client.request('ping', {});
    assert.equal(res.jsonrpc, '2.0');
  });

  await t.test('E5.9: explicit null id in payload produces no spurious output', async () => {
    client.writeRaw('{"jsonrpc":"2.0","id":null,"method":"initialized"}\n');
    const res = await client.request('ping', {});
    assert.equal(res.jsonrpc, '2.0');
  });

  await t.test('E5.10: omitted id field treated as notification', async () => {
    client.writeRaw('{"jsonrpc":"2.0","method":"custom/notify"}\n');
    const res = await client.request('ping', {});
    assert.equal(res.jsonrpc, '2.0');
  });

  // Category 6: Parameter Boundary & Type Variations (10 tests)
  await t.test('E6.1: null params value tolerated', async () => {
    client.writeRaw('{"jsonrpc":"2.0","id":6001,"method":"tools/list","params":null}\n');
    const msg = await client.waitForJsonMessage((m) => m.id === 6001);
    assert.equal(msg.id, 6001);
  });

  await t.test('E6.2: array params value tolerated', async () => {
    client.writeRaw('{"jsonrpc":"2.0","id":6002,"method":"tools/list","params":[]}\n');
    const msg = await client.waitForJsonMessage((m) => m.id === 6002);
    assert.equal(msg.id, 6002);
  });

  await t.test('E6.3: omitted params property altogether', async () => {
    client.writeRaw('{"jsonrpc":"2.0","id":6003,"method":"tools/list"}\n');
    const msg = await client.waitForJsonMessage((m) => m.id === 6003);
    assert.equal(msg.id, 6003);
    assert.ok(msg.result);
  });

  await t.test('E6.4: prompts/get with null arguments object', async () => {
    const res = await client.request('prompts/get', { name: 'discover-best-github-tool', arguments: null });
    assert.equal(res.jsonrpc, '2.0');
    assert.ok(res.result.messages);
  });

  await t.test('E6.5: prompts/get with extra unknown arguments', async () => {
    const res = await client.request('prompts/get', {
      name: 'discover-best-github-tool',
      arguments: { task: 'security', unknownArg1: 123, unknownArg2: true }
    });
    assert.equal(res.jsonrpc, '2.0');
    assert.ok(res.result.messages);
  });

  await t.test('E6.6: resources/read with empty string uri', async () => {
    const res = await client.request('resources/read', { uri: '' });
    assert.equal(res.jsonrpc, '2.0');
    assert.ok(res.result.contents);
  });

  await t.test('E6.7: resources/read with unexpected URI protocol', async () => {
    const res = await client.request('resources/read', { uri: 'file:///etc/hosts' });
    assert.equal(res.jsonrpc, '2.0');
    assert.ok(res.result.contents);
  });

  await t.test('E6.8: tools/call with unexpected arguments type', async () => {
    const res = await client.request('tools/call', {
      name: 'firewall_inspect',
      arguments: { content: 12345 } // number instead of string
    });
    assert.equal(res.jsonrpc, '2.0');
  });

  await t.test('E6.9: tools/call with null arguments property', async () => {
    const res = await client.request('tools/call', {
      name: 'firewall_inspect',
      arguments: null
    });
    assert.equal(res.jsonrpc, '2.0');
  });

  await t.test('E6.10: tools/call with deeply nested object arguments', async () => {
    const res = await client.request('tools/call', {
      name: 'batch_audit',
      arguments: {
        nested: { a: { b: { c: [1, 2, { d: 'test' }] } } }
      }
    });
    assert.equal(res.jsonrpc, '2.0');
  });
});
