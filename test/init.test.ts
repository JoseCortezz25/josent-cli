import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import type { InitPromptIO } from '../src/init.js';
import {
  normalizeProjectName,
  parseInitArguments,
  prepareInitTarget,
} from '../src/init.js';

function createNonInteractiveIO(): InitPromptIO {
  return {
    input: { isTTY: false } as InitPromptIO['input'],
    output: { isTTY: false } as InitPromptIO['output'],
  };
}

describe('normalizeProjectName', () => {
  test('lowercases and replaces separators with hyphens', () => {
    expect(normalizeProjectName('  My New App!!  ')).toBe('my-new-app');
  });
});

describe('parseInitArguments', () => {
  test('supports positional arguments', () => {
    expect(parseInitArguments(['my-app', './tmp'])).toEqual({
      projectName: 'my-app',
      destination: './tmp',
    });
  });

  test('supports flags', () => {
    expect(
      parseInitArguments(['--name', 'My App', '--destination=./tmp']),
    ).toEqual({
      projectName: 'My App',
      destination: './tmp',
    });
  });
});

describe('prepareInitTarget', () => {
  test('normalizes the project name and accepts a new destination', async () => {
    const destination = join(
      mkdtempSync(join(tmpdir(), 'josent-init-')),
      'new-project',
    );

    await expect(
      prepareInitTarget(['My App', destination], createNonInteractiveIO()),
    ).resolves.toEqual({
      projectName: 'my-app',
      destination,
    });
  });

  test('rejects an existing destination with a clear message', async () => {
    const destination = mkdtempSync(join(tmpdir(), 'josent-existing-'));

    await expect(
      prepareInitTarget(['My App', destination], createNonInteractiveIO()),
    ).rejects.toThrow(`Destination already exists: ${destination}`);

    rmSync(destination, { recursive: true, force: true });
  });
});
