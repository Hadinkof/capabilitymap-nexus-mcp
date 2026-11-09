# E2E Test Infra: CapabilityMap Nexus MCP

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on internal implementation details.
- Protocol Wire Level: Spawns `./bin/cli.mjs` via `child_process.spawn`, exercises standard JSON-RPC 2.0 communication over `stdin`/`stdout`.
- Zero External Bloat: Powered by Node.js native `node:test` and `node:assert/strict`.

## Feature Inventory
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|--------|:------:|:------:|:------:|:------:|
| 1 | Stdio Protocol & Handshake | ORIGINAL_REQUEST §Architecture | 5 | 5 | ✓ | ✓ |
| 2 | Tool Discovery & Schema Compliance | ORIGINAL_REQUEST §Existing tools | 5 | 5 | ✓ | ✓ |
| 3 | Prompts Inspection & Formatting | ORIGINAL_REQUEST §Existing prompts | 5 | 5 | ✓ | ✓ |
| 4 | Resources Read & Monetization Plans | ORIGINAL_REQUEST §Existing resources | 5 | 5 | ✓ | ✓ |
| 5 | Tool Execution: compare_projects | ORIGINAL_REQUEST §Goal 1 | 5 | 5 | ✓ | ✓ |
| 6 | Tool Execution: firewall_inspect (5 Vectors) | ORIGINAL_REQUEST §Goal 1 | 5 | 5 | ✓ | ✓ |
| 7 | Tool Execution: batch_audit | ORIGINAL_REQUEST §Goal 1 | 5 | 5 | ✓ | ✓ |
| 8 | Tool Execution: export_capabilities | ORIGINAL_REQUEST §Goal 1 | 5 | 5 | ✓ | ✓ |
| 9 | Monetization: tiers & key provisioning | ORIGINAL_REQUEST §Goal 3 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test runner: `node --test test/**/*.test.mjs`
- Test client harness: `test/helpers/mcp-client.mjs`
- Directory layout:
  - `test/helpers/mcp-client.mjs`
  - `test/tier1-feature-coverage.test.mjs`
  - `test/tier2-boundaries-errors.test.mjs`
  - `test/tier3-combinations-fuzz.test.mjs`
  - `test/tier4-real-world-workload.test.mjs`

## Coverage Thresholds
- Tier 1: ≥45 test cases (5 per feature across 9 features)
- Tier 2: ≥45 boundary & error test cases
- Tier 3: ≥10 cross-feature & stress test cases
- Tier 4: ≥8 real-world application & workload scenarios
- Total Target: ≥108 automated test cases with 100% pass rate.
