# Token Optimization Guide

GitHub now meters AI Agent usage in **AI Credits**, billed against monthly token consumption — input, output, and cached tokens — at per-model API rates. Every byte of every prompt, file, and response counts. This guide gives humans the rules, defaults, and review habits to keep a Concert-managed repository token-efficient without sacrificing output quality.

It applies to repositories that use Concert agents, but the rules generalize to any repo that hosts agent definitions, skills, or instruction files consumed by LLMs.

---

## Why this matters

A single agent invocation typically loads:

1. The agent's own definition (`.github/agents/<name>.agent.md`)
2. The repo-level instructions (`.github/copilot-instructions.md`, `AGENTS.md`, `CLAUDE.md`)
3. Any skills the agent decides to load
4. The files the agent reads to do its job
5. The agent's prior turns in the conversation

Items 1–3 are paid for on **every** invocation. A 600-line agent file costs the same tokens whether the user sends a 5-word prompt or a 500-word one. Bloat in agent and instruction files is a fixed tax on every run.

---

## The 10 rules

### 1. One job per agent, one job per skill

Split overloaded agents into focused ones. A focused agent is shorter, gets loaded only when relevant, and produces tighter output. The same applies to skills: one skill per concern.

### 2. Default to the smallest viable model

Write agent and skill content so it works on Sonnet- and Haiku-class models. If a section reads like it requires Opus-class reasoning to follow, it is too vague — rewrite it as concrete steps, tables, or examples.

### 3. Bullets and tables beat paragraphs

Prose is the largest source of avoidable tokens. Convert explanations to lists. Convert lists of "key: value" sentences to two-column tables. Drop articles ("the", "a") in tables and headers when meaning is preserved.

### 4. Say it once

Boilerplate that appears in every agent (interview-tool detection, "boot sequence", failure-handling stanzas) should live in **one** place — a shared skill, `AGENTS.md`, or repo instructions — and be referenced by name from each agent. Duplication multiplies tokens by the number of agents.

### 5. Cut decorative content

Remove:

- Persona prose ("You are a senior, world-class…") beyond one sentence of role
- Restatements of what the user already said
- Closing pleasantries, encouragements, and meta-commentary
- ASCII art, banners, decorative separators
- Rationale that the model does not need to act ("we do this because historically…")

### 6. Specify outputs, not feelings

Replace "produce a comprehensive, well-thought-out document" with the literal output template. A concrete template is shorter than abstract guidance and produces more consistent results.

### 7. Reference, don't inline

When an agent needs a long checklist, output template, or rubric used by other agents too, put it in a skill or doc and reference it by path. Skills are loaded on demand; inlined templates are loaded always.

### 8. Constrain output length explicitly

Every agent should declare the expected size and shape of its output (e.g., "Return ≤ 10 bullets", "Output ≤ 200 words unless the user asks for more"). Output tokens are billed too, often at higher rates than input.

### 9. Prefer paths over content

Tell agents to read a file by path when needed instead of inlining its content. Quote only the lines that matter. Use `view_range` / line ranges where supported.

### 10. Measure before and after

Track agent and skill file sizes (lines and bytes) over time. Any change that increases an agent's size must justify the tokens it adds on every future call.

---

## Authoring defaults

Apply these defaults to every new or edited agent / skill / instruction file:

| Element                 | Default                                                           |
| ----------------------- | ----------------------------------------------------------------- |
| Persona statement       | ≤ 1 sentence                                                      |
| Operating principles    | ≤ 8 rows, each ≤ 1 line                                           |
| Boundaries (NEVER list) | ≤ 6 bullets, each ≤ 1 line                                        |
| Boot sequence           | Numbered list, ≤ 6 items, paths only                              |
| Command spec            | Heading + ≤ 3 bullets per command                                 |
| Output templates        | Inlined as fenced code, no surrounding prose                      |
| Examples                | At most 1 per concept, only when the rule is ambiguous without it |
| Headers                 | Sentence case, no emoji, no decorative dividers                   |

Hard size targets for `.github/agents/*.agent.md`:

- **Target**: ≤ 250 lines / ≤ 12 KB
- **Hard ceiling**: 400 lines / 20 KB — anything larger must be split or moved into a skill

Hard size targets for `.github/skills/*/SKILL.md`:

- **Target**: ≤ 150 lines / ≤ 6 KB
- **Hard ceiling**: 250 lines / 10 KB

---

## Repository-level rules

Things to keep in shape at the repo level so every agent invocation stays cheap:

1. **Trim `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md` aggressively.** These load on every run. Keep them under 100 lines each. Move detail into agents, skills, or `docs/`.
2. **Avoid auto-loaded "rules" files that grow without bounds.** If you have `.cursor/rules/`, `.claude/rules/`, or similar, audit them quarterly and delete or merge entries.
3. **Keep README and docs out of the auto-load path.** They are for humans and should not be referenced from agent boot sequences unless the agent truly needs them.
4. **Pin large generated artifacts (logs, snapshots, build outputs) in `.gitignore`** so agents do not accidentally read them.
5. **Prefer `view_range` / line-bounded reads** in agent instructions when pointing to large files.
6. **Cap example datasets and fixtures** committed to the repo. Large JSON/YAML fixtures that an agent might `view` in full are a recurring tax.
7. **Use one canonical instruction file per assistant.** Do not duplicate the same rules in `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, and a top-level `INSTRUCTIONS.md`. Pick one and have the others reference it.

---

## Review checklist

Use this when reviewing a PR that adds or edits an agent, skill, or instruction file.

- [ ] No persona paragraph longer than 1 sentence
- [ ] No duplicated boilerplate that already lives in another file
- [ ] All "you should…", "you must…" rules collapsed into a single principles table or bullet list
- [ ] All output templates inlined as fenced code, no surrounding prose
- [ ] No restatement of GitHub / Copilot / Claude documentation
- [ ] File size within target; if not, it is split or content moved to a skill
- [ ] Output length is explicitly bounded
- [ ] Agent reads files by path with `view_range` where applicable
- [ ] No emojis, banners, or decorative separators
- [ ] No restatement of the user's input back to them
- [ ] Examples kept to the minimum needed for disambiguation

---

## Anti-patterns to delete on sight

- "You are a world-class, senior, principal engineer with deep expertise in…" — keep the role, drop the adjectives.
- "Take your time and think carefully before responding." — model-side default; not needed in instructions.
- "Important! Critical! MUST!" sprinkled across paragraphs — collapse into a single Boundaries list.
- "Here is the structure you should follow:" followed by an obvious markdown outline — just inline the outline in a fenced block.
- Re-explaining what a section header already says.
- Tables where every cell is "Yes" or "ALWAYS" — drop the column.
- Long "Failure handling" or "Recovery" sections that say "report what failed and stop" — one sentence is enough.

---

## Further reading

- `.github/skills/agent-authoring/SKILL.md` — token-optimized agent authoring
- `.github/skills/skill-authoring/SKILL.md` — token-optimized skill authoring
- `AGENTS.md` — guidance for coding agents working in this repo
- `concert-token-optimizer` agent — automated audit and optimization plan generator
