---
name: skill-authoring
description: >-
  Guide for authoring GitHub Copilot agent skills (`SKILL.md` files), optimised
  for low token consumption and high quality. Use this skill when asked to
  create, write, refactor, or review a skill.
---

# Skill Authoring (Token-Optimised)

Use this skill whenever you author or edit a Copilot agent skill (`.github/skills/<skill-name>/SKILL.md`). Skills are loaded on demand, but their cost is paid in full each time they are loaded — keep them short and concrete.

## What a skill is

A folder of instructions Copilot loads when relevant. Each skill lives at `.github/skills/<skill-name>/` and must contain `SKILL.md` plus any optional supporting files (scripts, examples, reference markdown).

```
.github/skills/<skill-name>/
├── SKILL.md          # required
└── <optional files>  # scripts, examples, reference material
```

## `SKILL.md` format

YAML frontmatter followed by a Markdown body.

### Required frontmatter

| Field         | Value                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------ |
| `name`        | Lowercase, hyphenated. Must equal the directory name.                                      |
| `description` | One sentence: what the skill does AND the trigger phrase (e.g. "Use this when asked to…"). |

### Optional frontmatter

- `license` — license that applies to the skill content.
- `allowed-tools` — tools Copilot may use without confirmation (`shell`, `bash`). Only include if you have reviewed every referenced script and trust it.

### Frontmatter example

```yaml
---
name: my-skill
description: >-
  Describe what the skill does and when to use it. Use this when asked to…
allowed-tools: shell
---
```

## Body structure

Recommended sections (drop any that do not apply):

| Section            | Purpose                                             | Size budget |
| ------------------ | --------------------------------------------------- | ----------- |
| Intro              | One sentence: what to do when this skill is invoked | 1 line      |
| Format / structure | Concrete file layout, tables, fenced templates      | as needed   |
| Step-by-step       | Numbered list of steps                              | ≤ 10 steps  |
| Quality checklist  | Bulleted `- [ ]` list                               | ≤ 12 items  |
| Example            | One minimal worked example                          | 1 example   |

## Authoring rules

1. **Self-contained.** Everything Copilot needs to complete the task lives in the skill body or in files inside the skill directory.
2. **Repo- and project-agnostic.** No specific repo names, org names, internal tool names, or hard-coded paths. Use placeholders.
3. **One concern per skill.** If you find yourself writing two different procedures, split into two skills.
4. **Numbered steps for procedures, bullets for guidelines.** Do not mix.
5. **Templates inlined as fenced code, with no surrounding prose.**
6. **Examples are minimal.** One short example beats three full ones.
7. **No persona text.** A skill is instructions, not a character.
8. **No restatement of the trigger.** The frontmatter description already says when to use the skill.
9. **No `allowed-tools: shell` unless every referenced script is reviewed and trusted.**

## Token-optimisation rules

- Tables and bullets over paragraphs.
- Drop articles in headings and table cells when meaning is preserved.
- Reference long content (specs, rubrics, large templates) by path; do not inline.
- State expected output size and shape explicitly (e.g. "Return ≤ 10 bullets").
- Hard size targets: **≤ 150 lines / ≤ 6 KB** (target), **≤ 250 lines / 10 KB** (ceiling).
- If the skill exceeds the target, look first for: duplicated instructions across sections, verbose examples, restated GitHub/Copilot/Claude documentation, and prose that could be a table.

## Step-by-step

1. **Identify the purpose.** One sentence: "When asked to <X>, do <Y>." If you need two sentences, split the skill.
2. **Choose a name.** Lowercase, hyphens only. Reflects the task, not a project or team.
3. **Create the directory** `.github/skills/<skill-name>/`.
4. **Write `SKILL.md`** with frontmatter (`name`, `description`) and a body following the recommended sections.
5. **Add supporting files** only if the skill needs scripts or reference material; reference them by filename.
6. **Scrub for project-specific content** — repo names, org names, URLs, internal tool names, hard-coded paths. Replace with placeholders.
7. **Cut.** Read top to bottom and delete every word the agent could behave correctly without.
8. **Measure.** `wc -l -c` on `SKILL.md`. If over target, cut more.

## Quality checklist

- [ ] `SKILL.md` is present in the skill's directory.
- [ ] Frontmatter has `name` (matches directory name) and `description` (one sentence with trigger).
- [ ] No `allowed-tools` other than what is required AND reviewed.
- [ ] Body uses numbered steps for procedures, bullets for guidelines.
- [ ] Output templates are fenced code blocks with no surrounding prose.
- [ ] Output size is explicitly bounded.
- [ ] No references to specific repos, orgs, internal tools, or hard-coded paths.
- [ ] No persona text, banners, emojis, decorative dividers.
- [ ] No restated GitHub / Copilot / Claude documentation.
- [ ] At most one short worked example.
- [ ] Any referenced script is included in the skill directory and reviewed.
- [ ] File ≤ 150 lines / ≤ 6 KB (or justified up to 250 / 10 KB).

## Anti-patterns

- "You are an expert in …" — skills are not personas; delete.
- Long marketing description in frontmatter — one sentence with the trigger is enough.
- Two different procedures in one skill — split.
- Embedding the entire GitHub docs page in the skill — link to it instead, quote only what is acted on.
- Tables where one column is always the same value — drop it.
- "Make sure to think carefully about…" — model-side default, not skill content.

## Minimal example

`SKILL.md`:

```markdown
---
name: conventional-commits
description: >-
  Conventional Commits style guide. Use this when asked to write, review, or
  fix a commit message.
---

Follow the Conventional Commits specification (<https://www.conventionalcommits.org>).

## Format
```

<type>[optional scope]: <description>

[optional body]
[optional footer(s)]

```

## Types

- `feat` — new feature
- `fix` — bug fix
- `docs` — docs only
- `refactor` — no behaviour change
- `test` — tests only
- `chore` — tooling

## Rules

- Description ≤ 72 characters, imperative mood, no trailing period.
- Breaking change: `!` after type/scope AND `BREAKING CHANGE:` footer.

## Output

One commit message, no surrounding commentary.
```
