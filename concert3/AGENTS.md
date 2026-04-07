# Project Agents

This project uses **Concert 3** for AI-guided SDLC orchestration.

## How It Works

Concert 3 uses GitHub as the orchestrator — issues are state, actions are the
state machine, and Copilot Coding Agent does the work.

### Available Agents

| Agent | Role | When Used |
|-------|------|-----------|
| `concert-analyst` | Requirements analysis | After vision is accepted |
| `concert-architect` | Architecture design | After requirements accepted |
| `concert-designer` | UX/UI design | After architecture accepted (full workflow) |
| `concert-planner` | Task decomposition | After design/architecture accepted |
| `concert-coder` | TDD implementation | During execution phase |
| `concert-reviewer` | Code quality review | After each task completes |

### Getting Started

1. Go to **Actions** → **🎵 Concert Init** → **Run workflow**
2. Enter mission name, select workflow size, provide description
3. A mission issue and draft PR will be created automatically
4. Edit `VISION.md` on the branch, then comment `/accept` on the mission issue
5. The pipeline runs automatically from there!

### Commands

Comment on the mission issue:
- `/accept` — Approve the current stage
- `/revise: <feedback>` — Request changes with specific feedback

### Project Conventions

See `.github/instructions/concert-conventions.instructions.md` for coding standards.
