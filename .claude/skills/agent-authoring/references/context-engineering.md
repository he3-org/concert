## Context Engineering for Agents

### Progressive Disclosure

Structure the agent's context loading in tiers to minimize token footprint:

1. **Boot sequence** — The agent reads state files and task assignments first. These are small and tell the agent what to do.
2. **On-demand context** — Skills, specs, and reference docs are read only when the execution flow reaches a step that needs them. Never front-load all context.
3. **Working context** — Code files, test output, and diffs are read during execution as needed. These are the most volatile and should never be cached in the agent definition.

### Assume Intelligence

Do not explain concepts the model already knows from training data. Include only:
- **Project-specific conventions** — naming patterns, directory structure, commit format
- **State that changes** — current branch, active mission, task assignments
- **Relationships the model can't infer** — "the reviewer agent sends findings back to the coder agent," "state.json is the handoff mechanism between sessions"

Omit: standard library APIs, common design patterns, language syntax, well-known tool usage.

### Compression Patterns

When an agent needs to consume external content (specs, docs, review feedback):
- Instruct it to extract structured key-value pairs or bullet lists, not to read and summarize prose
- Strip headers, boilerplate, and repeated definitions before injecting into working context
- If a file is over 200 lines, instruct the agent to read only the relevant section (use line ranges or grep first)

### Stable Prefix Ordering

Place durable, unchanging content at the top of the agent definition:
1. `<role>` — identity (never changes)
2. `<operating_principles>` — constraints table (rarely changes)
3. `<boundaries>` — scope limits (rarely changes)
4. `<workflow_integration>` — boot sequence (changes when architecture changes)
5. `<execution_flow>` — step-by-step instructions (changes when behavior changes)
6. `<user_guidance>` — output format (most likely to be tuned)

This ordering maximizes prompt cache hits — changes to output format don't invalidate the cached role and principles.

### Template Patterns

For any structured output the agent must produce (status reports, review findings, commit messages), provide an exact template in the `<user_guidance>` section. Templates are more reliable than abstract descriptions because they give the model a concrete structure to fill.
