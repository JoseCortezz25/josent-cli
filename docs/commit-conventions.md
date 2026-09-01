# Commit Message Conventions

This repository follows [Conventional Commits](https://www.conventionalcommits.org/).

## Format

```text
<type>(<scope>): <short summary>
```

## Examples

- `feat(cli): add command dispatcher scaffold`
- `fix(readme): clarify setup instructions`
- `docs: describe commit workflow`
- `chore: update linting rules`

## Rules

- Use lowercase types.
- Keep the summary short and imperative.
- Prefer a scope when the change touches a clear area of the codebase.
- Do not end the subject with a period.
- Keep the whole subject line concise and readable.

## Common types

- `feat` for new functionality
- `fix` for bug fixes
- `docs` for documentation
- `style` for formatting-only changes
- `refactor` for code changes that do not add features or fix bugs
- `test` for tests
- `chore` for maintenance work
