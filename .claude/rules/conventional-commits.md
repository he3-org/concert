## Commits and PRs

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): description
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `ci`, `perf`, `style`

- `feat` — new capability (not just new code — a user-visible feature)
- `fix` — bug fix
- `refactor` — restructuring without behavior change
- `chore` — maintenance (deps, config, tooling)
- `docs` — documentation only
- `test` — adding or fixing tests
- Scope is optional but encouraged: `feat(agents):`, `fix(cli):`
- Description is lowercase, imperative mood, no period
- Breaking changes: add `!` after type: `feat!: remove legacy API`

### PR Titles

Follow the same conventional commit format. The PR title becomes the squash commit message.

### PR Descriptions

Include:
- **Summary** — 1-3 bullet points of what changed and why
- **Test plan** — how to verify the changes work
