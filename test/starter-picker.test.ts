import { PassThrough } from 'node:stream';

import { expect, test } from 'bun:test';

import type { StarterCatalogEntry } from '../src/catalog.js';
import {
  filterStarters,
  normalizeQuery,
  renderStarterPicker,
  selectStarter,
} from '../src/starter-picker.js';

const starters: StarterCatalogEntry[] = [
  {
    name: 'bun-cli',
    repoUrl: 'https://github.com/example/bun-cli.git',
    description: 'Bun and TypeScript CLI starter',
    tags: ['bun', 'typescript', 'cli'],
  },
  {
    name: 'web-app',
    repoUrl: 'https://github.com/example/web-app.git',
    description: 'Next.js application starter',
    tags: ['web', 'nextjs', 'typescript'],
  },
  {
    name: 'api-service',
    repoUrl: 'https://github.com/example/api-service.git',
    description: 'Node.js service starter',
    tags: ['api', 'node', 'typescript'],
  },
];

test('normalizeQuery trims and lowercases search input', () => {
  expect(normalizeQuery('  BuN  ')).toBe('bun');
});

test('filterStarters matches across names, tags, and descriptions', () => {
  expect(filterStarters(starters, 'nextjs')).toEqual([starters[1]]);
  expect(filterStarters(starters, 'service node')).toEqual([starters[2]]);
  expect(filterStarters(starters, 'typescrip')).toEqual(starters);
});

test('renderStarterPicker shows the list first and marks the selection', () => {
  const view = renderStarterPicker(starters, 1, '');

  expect(view).toContain('josent init');
  expect(view).toContain(
    'Use ↑/↓ to move, type to filter, Enter to select, Esc to clear, Ctrl+C to cancel.',
  );
  expect(view).toContain(
    '> web-app [web, nextjs, typescript] — Next.js application starter',
  );
  expect(view).toContain(
    '  bun-cli [bun, typescript, cli] — Bun and TypeScript CLI starter',
  );
});

test('renderStarterPicker reports empty results clearly', () => {
  const view = renderStarterPicker(starters, 0, 'rust');

  expect(view).toContain('No starters match "rust".');
});

test('selectStarter returns the filtered starter after arrow-key confirmation', async () => {
  const input = new PassThrough() as typeof process.stdin;
  const output = new PassThrough() as typeof process.stdout;

  Object.assign(input, {
    isTTY: true,
    isRaw: false,
    setRawMode(mode: boolean) {
      this.isRaw = mode;
    },
  });

  Object.assign(output, { isTTY: true });

  const collected: string[] = [];
  output.on('data', (chunk) => collected.push(chunk.toString('utf8')));

  const selectionPromise = selectStarter(starters, {
    input,
    output,
  });

  input.emit('keypress', 'w', {
    name: 'w',
    ctrl: false,
    meta: false,
    shift: false,
  });
  input.emit('keypress', 'e', {
    name: 'e',
    ctrl: false,
    meta: false,
    shift: false,
  });
  input.emit('keypress', 'b', {
    name: 'b',
    ctrl: false,
    meta: false,
    shift: false,
  });
  input.emit('keypress', undefined, {
    name: 'return',
    ctrl: false,
    meta: false,
    shift: false,
  });

  await expect(selectionPromise).resolves.toEqual(starters[1]);
  expect(collected.join('')).toContain('web-app');
});
