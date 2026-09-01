# josent-cli

`josent` is an interactive Bun + TypeScript CLI for installing curated template starters from a fixed catalog of GitHub repositories.

This repository currently contains the foundation for the CLI: TypeScript scaffolding, linting, formatting, pre-commit checks, and commit message conventions.

## What the CLI will do

The first product slice will focus on two commands:

- `josent init` — guide the user through selecting and cloning a starter
- `josent list` — show the available starter catalog

The long-term goal is to make the CLI easy for both humans and agents to use.

## Getting started

### Prerequisites

- [Bun](https://bun.sh/) 1.4 or newer

### Install dependencies

```bash
bun install
```

### Run the scaffolded CLI

```bash
bun run src/cli.ts --help
bun run src/cli.ts --version
bun run src/cli.ts init
bun run src/cli.ts init my-app ./tmp/my-app
bun run src/cli.ts init --name my-app --destination ./tmp/my-app
bun run src/cli.ts list
```

### Useful scripts

```bash
bun run dev
bun run build
bun run lint
bun run format:check
bun run format
bun run typecheck
bun run check
```

## Tooling

- TypeScript for the application code
- ESLint for code-quality checks
- Prettier for formatting
- Husky for Git hooks
- lint-staged for staged-file checks
- Commitlint for Conventional Commit enforcement

## Commit messages

Commit messages follow [Conventional Commits](./docs/commit-conventions.md).

The `commit-msg` hook rejects messages that do not match the convention.

## Project structure

```text
src/
  cli.ts
  index.ts
```
