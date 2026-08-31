# josent-cli Context

## Project Goal

Build `josent`, an interactive Bun + TypeScript CLI that helps humans and agents install curated template-starters from a fixed catalog of GitHub repositories.

## Product Shape

- Primary command: `josent init`
- Secondary command: `josent list`
- Standard CLI support: `--help`, `init --help`, `--version`
- User-facing messages: English only
- Intended users: humans and agents, with strong bias toward agent-friendly automation

## Core User Flow

1. The user runs `josent init`.
2. The CLI shows the available starters in a list.
3. The user can search and choose a starter with arrow keys and Enter.
4. The CLI asks for a project name.
5. The CLI normalizes the name to lowercase with hyphens.
6. The CLI asks where to clone the project.
7. The CLI fails clearly if the destination already exists.
8. The CLI clones the selected GitHub repo into the chosen directory.
9. The cloned starter is left intact during clone.
10. The CLI removes the git history by default.
11. The CLI optionally asks for a new origin URL.
12. The CLI installs dependencies automatically by default.
13. The user can skip installation with `--no-install`.
14. The CLI prefers the package manager implied by the starter's lockfile.
15. If `pnpm` is available, it is preferred; if not, the CLI falls back to `npm`.

## Catalog Rules

- The starter catalog is fixed and versioned in the CLI repo.
- The catalog will be stored as JSON in the repository.
- Each starter entry includes:
  - `name`
  - `repoUrl`
  - `description`
  - `tags`
  - optional `branch`
- Tags are used for provider support and other starter metadata.
- `josent list` should show starter names plus tags.

## Naming and Path Rules

- Project names are normalized automatically.
- Names must become lowercase with hyphens.
- The destination folder name is the project name chosen by the user.
- The destination is checked before cloning.
- Existing destinations must fail with a clear, actionable message.

## Git Rules

- The clone is a normal git clone, not a shallow clone.
- Git history is removed after clone.
- A new origin URL is optional.
- If the user does not provide a new origin, the CLI only removes the old git metadata.

## DX Rules

- The CLI must feel intuitive and simple for humans.
- The CLI must remain predictable for agents.
- Interactive flow is the default.
- Flags should exist for non-interactive use.
- Errors should be short, clear, and actionable.

## Implementation Constraints

- Build with Bun and TypeScript.
- Keep the first version focused on the core flow.
- Do not rewrite starter files in the MVP.
- Do not add multilingual output.
- Do not add shallow clone support in the MVP.
- Do not add remote catalog syncing in the MVP.

## Related Tracker State

- GitHub Issues are the source of execution work.
- `ready-for-agent` is the pickup label.
- The repo also keeps engineering conventions in `AGENTS.md` and `docs/agents/*.md`.
