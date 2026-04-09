# Vision: Concert CLI `commit` Command

## Problem Statement

The Concert CLI currently provides three commands — `init`, `update`, and `push` — but no standalone `commit` command. Developers working within Concert workflows often need to commit work-in-progress before pushing, yet the only path today embeds an implicit commit inside `push` (with a hardcoded message `'chore: concert-push handoff'`). This conflates two distinct git operations and gives users no control over commit messages or commit timing.

Users who want to commit their work without pushing — to save progress, create a checkpoint, or follow a commit-then-review workflow — have no Concert-native way to do so. They must fall back to raw `git commit`, which bypasses any Concert-specific conventions or state tracking.

## What We're Building

A new `concert commit` CLI command that lets users create a git commit from within the Concert CLI. The command accepts a commit message, stages the appropriate files, and creates the commit — without pushing. It mirrors the familiar `git commit -m "..."` experience while fitting Concert's conventions and output style.

### Core Capabilities

- Accept a commit message as a required argument (e.g., `concert commit "feat: add login page"`)
- Stage all tracked modified files before committing (assumed — see Assumptions)
- Create the commit using the existing `commit()` git utility
- Print a confirmation with the resulting commit SHA and a "next steps" hint
- Validate preconditions: must be inside a git repo, must have changes to commit
- Exit with a meaningful error and non-zero exit code on failure

## Target Users

**Primary:** Developers using Concert to orchestrate AI-driven development on their repository. They are comfortable with git and the CLI but want Concert's conventions (conventional commits, state awareness) applied consistently when committing mid-workflow.

**Secondary:** Concert agents (AI workflows) that need to commit intermediate work before handing off to a subsequent stage, without triggering a push.

## User Experience Goals

- **Familiar** — the interface mirrors `git commit -m`, minimizing any learning curve
- **Fast** — executes immediately, no prompts
- **Transparent** — output confirms exactly what was committed (SHA, file count)
- **Consistent** — error messages and output format match the style of existing Concert commands (`push`, `init`)

## Success Criteria

- `concert commit "feat: add thing"` succeeds and produces a commit in the local git repo
- Running `concert commit` without a message produces a clear usage error
- Running outside a git repo produces the standard "not a git repository" error and exits with code 1
- Running with nothing to commit produces an informative message and exits cleanly (exit 0 or a documented non-zero code)
- The command appears in `concert --help` output
- All existing tests continue to pass; the new command has test coverage consistent with `push` and `init`

## Scope

### In Scope

- New `src/commands/commit.ts` implementing `runCommit(cwd, message)`
- Registration of `commit` in `src/cli.ts` (switch case + help text)
- Reuse of existing git utilities (`stageAll`, `commit`, `getStagedFiles`, `isGitRepo`)
- Unit tests in `src/__tests__/commands/commit.test.ts`
- Conventional-commit message passed through as-is (no validation or enforcement — assumed; see Questions)

### Out of Scope

- Interactive commit message prompting (no editor launch, no `git commit` without `-m`)
- Selective file staging (staging specific files by path argument)
- Amending previous commits
- Signed commits or GPG support
- Integration with Concert `state.json` beyond what `push` already does (assumed — see Questions)
- Automatic conventional-commit linting or message formatting

## Constraints and Assumptions

### Constraints

- Must be TypeScript, consistent with existing `src/commands/*.ts` pattern
- Must reuse `src/lib/git.ts` utilities — no direct `execFileSync` calls in the command file
- Must follow Concert's exit code convention: `0` success, `1` error
- Output must use `process.stdout.write` / `process.stderr.write` (not `console.log`) consistent with other commands

### Assumptions

- **(assumed)** The command stages all tracked modified files (`git add -u`) before committing, matching the behavior of `stageAll()` in `git.ts`
- **(assumed)** Untracked new files are NOT automatically staged — users must stage them manually with `git add` first, consistent with how `stageAll` works
- **(assumed)** The commit message is passed through verbatim — Concert does not validate or reformat it
- **(assumed)** No Concert `state.json` update is needed — `commit` is a low-level utility command, not a workflow step
- **(assumed)** If there are already staged changes (from a prior `git add`), they are committed as-is without re-running `stageAll`

## Risks

- **Confusion with `push`'s implicit commit** — the `push` command currently auto-commits staged files with a hardcoded message. Adding `commit` may create overlap; users may be unclear when to use which. Mitigation: clear help text and documentation; consider whether `push` should skip its implicit commit if no changes exist (low likelihood of breakage, medium impact).
- **Staging behavior surprises** — if `stageAll` stages more than the user expects (e.g., modified config files), it could produce unintended commits. Mitigation: output lists the files staged/committed. (Medium likelihood, medium impact.)
- **Message argument parsing edge cases** — messages with special shell characters could be mishandled if the CLI argument parsing is naive. Mitigation: use `process.argv` directly (already done in `cli.ts`), which passes the string as-is after shell expansion. (Low likelihood, low impact.)

## Questions

- [ ] Should `concert commit` also update `.concert/state.json` (e.g., increment `commits` counter) to keep state in sync with actual git history?
- [ ] Should the command validate that the commit message follows conventional commit format, or pass it through silently?
- [ ] Should untracked files be staged automatically (full `git add -A`) or only tracked modified files (`git add -u`)?
- [ ] Should the implicit commit inside `concert push` be removed or deprecated now that a dedicated `commit` command exists?
- [ ] What exit code should be used when there is nothing to commit — `0` (clean state is not an error) or a distinct non-zero code?
