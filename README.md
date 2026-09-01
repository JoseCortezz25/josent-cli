# josent-cli

`josent` is an interactive CLI for installing curated template starters from a fixed catalog of GitHub repositories. It clones the starter you pick, removes its git history, optionally sets a new `origin`, and installs dependencies so you can start working immediately.

## Usage

Run without installing:

```bash
npx josent-cli init
```

Or install globally:

```bash
npm install -g josent-cli
josent init
```

## Commands

- `josent init [project-name] [destination]` — interactive starter selection and project setup
- `josent list` — show the available starter catalog

### `josent init` flags

- `-n, --name <name>` — set the project name
- `-d, --destination <path>` — set the destination path
- `--no-install` — skip dependency installation

### Global flags

- `-h, --help` — show help text
- `-v, --version` — show the CLI version

## `init` controls

While the starter list is open:

- type — filter the starter list
- `↑` / `↓` — move the selection
- `Enter` — choose the highlighted starter
- `Esc` — clear the search query
- `Ctrl+C` — cancel the flow

## Requirements

- Node.js 18 or newer
- `git` available on `PATH`
- `pnpm` or `npm` for dependency installation (npm is used as a fallback)

## Development

Prerequisites: [Bun](https://bun.sh/) 1.4 or newer.

```bash
bun install
bun run dev -- --help
bun run build
bun run check
```

## Commit messages

Commit messages follow [Conventional Commits](./docs/commit-conventions.md). The `commit-msg` hook rejects messages that do not match the convention.

## License

[MIT](./LICENSE)
