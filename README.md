# CapabilityMap Nexus MCP (`v1.0.0`)

[![Nexus MCP Verified](https://many-temperatures-optimum-radiation.trycloudflare.com/badge.svg)](https://many-temperatures-optimum-radiation.trycloudflare.com)
[![Live Workbench & Pricing](https://img.shields.io/badge/Live_Workbench-Try_Free_100_Calls-00f2fe?style=flat-square)](https://many-temperatures-optimum-radiation.trycloudflare.com/#pricing)
[![MCP Protocol](https://img.shields.io/badge/MCP_Protocol-2025--11--25-10b981?style=flat-square)](https://many-temperatures-optimum-radiation.trycloudflare.com/.well-known/mcp.json)

**CapabilityMap Nexus** is a problem-first **GitHub Capability Router & Prompt-Injection Firewall MCP Server** indexing **666 manifest-verified open-source repositories** across **15 engineering categories**.

Instead of burning **4,200+ context tokens** scraping noisy, unverified GitHub READMEs, AI coding agents (`Claude Code`, `Cursor`, `Windsurf`, `ChatGPT`, `Cline`) connect once to CapabilityMap Nexus and receive **manifest-verified, OS/license-filtered, multi-step architectural decompositions in ~150 tokens** (**96.4% median token reduction**) while blocking **100% of prompt-injection payloads**.

---

## 🚀 Live Endpoints & Commercial Workbench

- **Interactive Workbench & ROI Calculator:** [https://many-temperatures-optimum-radiation.trycloudflare.com](https://many-temperatures-optimum-radiation.trycloudflare.com)
- **Self-Serve API Keys & Pro Pricing (€19/mo):** [https://many-temperatures-optimum-radiation.trycloudflare.com/#pricing](https://many-temperatures-optimum-radiation.trycloudflare.com/#pricing)
- **MCP JSON-RPC 2025-11-25 Endpoint:** `https://many-temperatures-optimum-radiation.trycloudflare.com/api/mcp`
- **AI Agent Discovery Manifest (`llms.txt`):** [https://many-temperatures-optimum-radiation.trycloudflare.com/llms.txt](https://many-temperatures-optimum-radiation.trycloudflare.com/llms.txt)
- **MCP Registry Manifest (`.well-known/mcp.json`):** [https://many-temperatures-optimum-radiation.trycloudflare.com/.well-known/mcp.json](https://many-temperatures-optimum-radiation.trycloudflare.com/.well-known/mcp.json)

---

## 🔑 1-Click Free 100-Call Trial API Key (Zero Card Required)

Provision a live `nxs_trial_...` key directly from your terminal in 1 second:

```bash
curl -s -X POST "https://many-temperatures-optimum-radiation.trycloudflare.com/api/v1/billing/provision-key" \
  -H "Content-Type: application/json" \
  -d '{"owner":"your-github-handle","tier":"trial"}'
```

---

## ⚙️ Quickstart: Connect Your AI Agent (Claude Desktop / Cursor / Windsurf / Cline)

Add CapabilityMap Nexus to your `mcpServers` configuration:

```json
{
  "mcpServers": {
    "capabilitymap-nexus": {
      "url": "https://many-temperatures-optimum-radiation.trycloudflare.com/api/mcp?api_key=YOUR_NXS_KEY"
    }
  }
}
```

### Exposed MCP Tools
1. `search_capabilities` — Decompose a high-level engineering problem into sub-capabilities and return ranked, manifest-verified GitHub repositories with 8-factor trust breakdowns.
2. `get_project_details` — Inspect verified repository metadata, OS/license compatibility, and known operational limitations.
3. `compare_projects` — Side-by-side trade-off matrix between multiple candidate repositories (e.g., `pbatard/rufus` vs. `ventoy/Ventoy`).
4. `list_categories` — Browse all 15 primary engineering & AI capability taxonomies.
5. `propose_project_ingestion` — Submit a repository through the 5-Vector Prompt-Injection Firewall & Quarantine pipeline.

---

## 📊 Empirical Benchmark Summary (20-Task Agent Evaluation)

| Metric | Raw GitHub Search Baseline | CapabilityMap Nexus `v1.0.0` | Improvement |
| :--- | :---: | :---: | :---: |
| **Median Context Tokens Consumed** | `4,200 tokens` | `150 tokens` | **96.4% Reduction ($59.40 saved / 1k tasks)** |
| **Manifest-Verified Repositories** | Unverified | **666 Repos (15 Categories)** | **100% Evidence-Backed** |
| **OS / Platform Mismatch Rate** | `28.5%` | **`0.0%`** | **Zero macOS/Linux Cross-Contamination** |
| **Prompt-Injection Detection** | `0%` | **100% Precision / 100% Recall** | **5-Vector Heuristic & Canary Quarantine** |
