# Project: CapabilityMap Nexus MCP Feature Expansion, Monetization & E2E Test Suite

## Architecture
- **Stdio Bridge (`bin/cli.mjs`)**: High-performance, zero-dependency Node.js ESM executable implementing MCP JSON-RPC protocol (2024-11-05 and 2025-11-25). Operates in hybrid mode: local fast-path & deterministic offline execution engine (with full category index, local heuristic security engine, and mock capabilities) combined with transparent live proxying to Cloudflare endpoint (`/api/mcp`) when available with `NEXUS_API_KEY`.
- **Enhanced Security Firewall Engine**: Pure JavaScript zero-dependency 5-vector inspection engine (prompt injection & system override, secret leaks & credential harvesting, tool masquerading & payload spoofing, privilege escalation & RCE, invisible unicode & base64 obfuscation).
- **Monetization Engine & Upgrade Hooks**: Synchronized 4-tier commercial pricing catalog (Community Free €0, Nexus Pro €19/mo, Team & Swarm €99/mo, Verified Partner Sponsor €149/mo), live trial key provisioning (`provision_api_key`), GitHub Sponsors integration (`https://github.com/sponsors/Hadinkof`), PayPal checkout links, and automatic upgrade recommendations in tool outputs and `nexus://billing/plans` resources.
- **Generative UI Dashboards**: Self-contained, responsive HTML visual artifacts conforming to Antigravity design system (Tailwind CSS via allowlisted script, CSS variables, compact height budgeting <500px for inline embeds and full page for standalone view).
  1. `artifacts/matrix_dashboard.html`: Interactive Capability Comparison Matrix (`compare_projects`)
  2. `artifacts/firewall_dashboard.html`: 5-Vector Prompt-Injection Security Inspector
  3. `artifacts/topology_dashboard.html`: Capability Topology & Category Explorer
- **Automated Opaque-Box Test Suite (`test/`)**: 4-Tier test suite running over stdio via native Node.js v24 `node:test` + `node:assert/strict`.
  - Tier 1: Feature Coverage (initialize, ping, tools/list, prompts/list, prompts/get, resources/list, resources/read)
  - Tier 2: Boundary & JSON-RPC Protocol Errors (-32700, -32600, -32601, -32602, chunking, framing)
  - Tier 3: Cross-Feature Combinations & Stress/Fuzz (interleaved async, UTF-8/emoji, large buffers, notifications)
  - Tier 4: Real-World Workloads & Monetization (firewall vectors, offline fallbacks, pricing schemas, key headers)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Endpoint URL Fix & Protocol Compliance | Fix default endpoint to `/api/mcp`, add JSON-RPC -32700/-32600/-32601 error handlers | M1 | Survey |
| 2 | Compare Projects Tool (`compare_projects`) | Side-by-side trade-off matrix tool for comparing multiple candidate repos | M2 | Survey / ORIGINAL_REQUEST |
| 3 | Enhanced 5-Vector Firewall (`firewall_inspect`) | Heuristics for injection, secrets, masquerading, privilege escalation, unicode | M2 | Survey / ORIGINAL_REQUEST |
| 4 | Batch Audit Tool (`batch_audit`) | Multi-target security and capability audit in a single batch call | M2 | Survey / ORIGINAL_REQUEST |
| 5 | Export Capabilities Tool (`export_capabilities`) | Bulk taxonomy and verified capability export with tiering hints | M2 | Survey / ORIGINAL_REQUEST |
| 6 | Commercial Monetization & Key Upgrade | Expose `get_commercial_tiers`, `provision_api_key`, sync `nexus://billing/plans` | M3 | Survey / ORIGINAL_REQUEST |
| 7 | Generative UI Dashboards | 3 Interactive HTML dashboards (Matrix, Firewall, Topology) with Tailwind | M4 | Survey / ORIGINAL_REQUEST |
| 8 | Automated Test Suite (Tiers 1-4) | Opaque-box stdio client test harness covering 4 tiers via `node:test` | M-E2E | Survey / ORIGINAL_REQUEST |
| 9 | Adversarial Coverage Hardening (Tier 5) | White-box edge-case and fuzzing suite for full code coverage | M5 | Project Pattern |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M-E2E | E2E Testing Track | Test harness `test/helpers/mcp-client.mjs`, Tier 1-4 test suites, `TEST_READY.md` | none | DONE |
| M1 | Stdio Protocol & Endpoint Hardening | Endpoint correction to `/api/mcp`, JSON-RPC 2.0 error handling, protocol versioning | none | DONE |
| M2 | MCP Tools Expansion | Implement `compare_projects`, enhanced `firewall_inspect`, `batch_audit`, `export_capabilities`, tool aliasing | M1 | DONE |
| M3 | Commercial Monetization & Billing Integration | `get_commercial_tiers`, `provision_api_key`, 4-tier `nexus://billing/plans`, upgrade teasers | M1 | DONE |
| M4 | Generative UI Dashboards | Interactive artifacts for Matrix, Firewall, Topology in `artifacts/` | M2, M3 | DONE |
| M5 | Final E2E Test Pass & Adversarial Hardening | Verify 100% test pass on Tiers 1-4, execute Tier 5 adversarial stress testing | M-E2E, M2, M3, M4 | DONE |

## Interface Contracts
### Stdio MCP JSON-RPC Wire Format
- Input: UTF-8 JSON-RPC 2.0 requests delimited by `\n`.
- Output: Strict JSON-RPC 2.0 responses delimited by `\n`. Out-of-band diagnostics to `stderr` only.
- Parse Error: `{"jsonrpc":"2.0","id":null,"error":{"code":-32700,"message":"Parse error"}}`
- Invalid Request: `{"jsonrpc":"2.0","id":null,"error":{"code":-32600,"message":"Invalid Request"}}`
- Method Not Found: `{"jsonrpc":"2.0","id":id,"error":{"code":-32601,"message":"Method not found"}}`

### Tools Interface
1. `compare_projects`:
   - Params: `{ "projects": string[] }`
   - Output: Formatted comparison table with license, stars, OS, token reduction, 8-factor scores, and security status.
2. `firewall_inspect`:
   - Params: `{ "content": string }`
   - Output: Risk score (0-100), risk level (CLEAN, LOW, MEDIUM, HIGH, CRITICAL), vector breakdown (injection, secrets, masquerading, priv_escalation, obfuscation), quarantine recommendation.
3. `batch_audit`:
   - Params: `{ "items": Array<{ "id": string, "type": "snippet"|"repo", "content": string }> }`
   - Output: Batch audit summary, per-item security verdict, aggregate risk profile.
4. `export_capabilities`:
   - Params: `{ "format": "json"|"markdown", "category"?: string }`
   - Output: Exported dataset with commercial tier metadata and upgrade links.
5. `provision_api_key`:
   - Params: `{ "email": string, "tier"?: "trial"|"pro"|"enterprise" }`
   - Output: Provisioned trial key `nxs_trial_<hex>`, credit limit, curl command, and checkout URL.
6. `get_commercial_tiers`:
   - Params: `{}`
   - Output: 4 commercial tiers (Community Free €0, Pro €19, Team €99, Sponsor €149), ROI metrics, checkout links.

## Code Layout
- `bin/cli.mjs`: Stdio bridge executable, local fast-path engine, remote proxy fallback.
- `package.json`: NPM package metadata with `"test": "node --test test/**/*.test.mjs"`.
- `artifacts/`: Generative UI HTML dashboards.
- `test/`:
  - `helpers/mcp-client.mjs`: Child process stdio test harness.
  - `tier1-feature-coverage.test.mjs`: Tier 1 tests.
  - `tier2-boundaries-errors.test.mjs`: Tier 2 tests.
  - `tier3-combinations-fuzz.test.mjs`: Tier 3 tests.
  - `tier4-real-world-workload.test.mjs`: Tier 4 tests.
