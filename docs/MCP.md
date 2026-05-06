# Concert MCP Server

## What this is

Concert ships a read-only MCP (Model Context Protocol) server that exposes mission state, status, and metadata as structured tools. This lets AI assistants query Concert's live mission data directly instead of reading multiple files and parsing markdown — cutting token costs and improving reliability.

## Install

Concert is intended to be pinned per repository, so install it as a project-local dev dependency rather than globally:

```bash
npm install --save-dev @he3-org/concert @modelcontextprotocol/sdk
```

The CLI verbs (`get-status`, `get-state`, etc.) work without the MCP SDK; only `concert serve` requires it. Run any command via `npx concert <command>`.

## Tools

| Tool                             | Description                                                          | Input Schema                                                | CLI Mirror                                                |
| -------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------- |
| `concert.get_status`             | Comprehensive status snapshot (stage, modified docs, gaps, refactor) | `{ mission?: string }`                                      | `concert get-status [--mission]`                          |
| `concert.get_state`              | Mission state from `state.json` (progress, failures, next action)    | `{ mission?: string }`                                      | `concert get-state [--mission]`                           |
| `concert.list_missions`          | List all missions with metadata                                      | `{}`                                                        | `concert list-missions`                                   |
| `concert.get_section`            | Get markdown section by slug from a mission doc                      | `{ doc, section, mission? }`                                | `concert get-section <doc> <section>`                     |
| `concert.list_modified_sections` | List documents with `CONCERT:MODIFIED` markers                       | `{ mission?: string }`                                      | `concert list-modified-sections`                          |
| `concert.mark_section_modified`  | Insert/refresh one or more `CONCERT:MODIFIED` markers                | `{ doc, section?, sections?: string[], source?, mission? }` | `concert mark-section-modified <doc> <slug> [<slug>...]`  |
| `concert.clear_section_modified` | Remove one or more `CONCERT:MODIFIED` markers                        | `{ doc, section?, sections?: string[], mission? }`          | `concert clear-section-modified <doc> <slug> [<slug>...]` |

All tools return JSON. See `concert serve --inspect` for full schemas. The mutation tools above accept either a single `section` or a `sections[]` batch — prefer `sections[]` (or multiple positional CLI slugs) when touching several sections of the same document, so the server takes one mission lock, performs one read/write, and emits one telemetry event instead of N.

## Client config

The snippets below launch the MCP server via `npx`, so each client uses the Concert version pinned in your project's `package.json` — no global install required. The `-y` flag suppresses npx's first-time install prompt. If you have installed Concert globally instead, replace `"command": "npx", "args": ["-y", "@he3-org/concert", "serve"]` with `"command": "concert", "args": ["serve"]`.

### Claude Desktop

Add to `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "concert": {
      "command": "npx",
      "args": ["-y", "@he3-org/concert", "serve"]
    }
  }
}
```

### GitHub Copilot (VS Code)

Add to `.vscode/settings.json` in your project:

```json
{
  "github.copilot.mcp.servers": {
    "concert": {
      "command": "npx",
      "args": ["-y", "@he3-org/concert", "serve"]
    }
  }
}
```

### Cursor

Add to Cursor MCP settings:

```json
{
  "concert": {
    "command": "npx",
    "args": ["-y", "@he3-org/concert", "serve"]
  }
}
```

### Codex CLI

Add to Codex MCP config:

```json
{
  "servers": {
    "concert": {
      "command": "npx",
      "args": ["-y", "@he3-org/concert", "serve"]
    }
  }
}
```

## Token measurements

**Before S1 (file-based):** `/concert-status` reads 5–8 files (VISION, REQUIREMENTS, DEVELOPMENT-STATUS, DEVELOPMENT-REVIEW, REFACTOR-PLAN-\*, state.json, git HEAD) totaling ~3,500–6,000 input tokens depending on mission complexity.

**After S1 (MCP):** `concert.get_status` returns a ~600-byte JSON snapshot (~150 tokens) — a **20–40× reduction**. The agent still has access to the same information but trades sequential file reads for a single structured tool call.

Methodology: compare total input tokens for the `concert-status` agent before and after integrating `concert.get_status`. Measured on a medium mission (3 phases, 12 tasks, DEVELOPMENT-REVIEW with 8 gaps, REFACTOR-PLAN with 6 items). The MCP tool compresses all status into one compact payload without losing fidelity.

## Use cases

- **Status checks:** `concert.get_status` replaces reading 5+ files and parsing markdown.
- **Multi-mission orchestration:** `concert.list_missions` + `concert.get_state` for each.
- **Targeted section reads:** `concert.get_section` fetches only the section you need.
- **Modified-doc triage:** `concert.list_modified_sections` identifies what needs review.

All tools are read-only and idempotent — safe to call repeatedly or in parallel.
