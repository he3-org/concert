# Copilot Instructions for Concert

The canonical guidance for any agent working on this repo lives in
[`AGENTS.md`](../AGENTS.md). Read that file first.

This file exists because GitHub Copilot looks for `.github/copilot-instructions.md`
specifically. Anything Copilot-specific that does not also apply to other
agents belongs here; everything else belongs in `AGENTS.md` (single source
of truth — do not duplicate).

## Copilot-specific notes

- Cloud agent runs do **not** have an interactive interview tool by default.
  Agents that detect no interview tool (`AskUserQuestion` / `ask_user` /
  `vscode_askQuestions`) fall back to batch mode automatically — see the
  `concert-review-docs` agent definition.
- Copilot cloud agents commit and push directly; the develop agent does
  all work itself (no sub-agents — they lose commit permissions in cloud).
