import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';

import { describe, expect, test } from 'bun:test';

import type { InitPromptIO } from '../src/init.js';
import {
  cloneStarter,
  normalizeProjectName,
  parseInitArguments,
  prepareInitTarget,
} from '../src/init.js';
import type { StarterCatalogEntry } from '../src/catalog.js';

function createNonInteractiveIO(): InitPromptIO {
  return {
    input: { isTTY: false } as InitPromptIO['input'],
    output: { isTTY: false } as InitPromptIO['output'],
  };
}

function createInteractiveIO(): InitPromptIO {
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

  return { input, output };
}

function runGit(args: string[], cwd: string): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
  });
}

function createStarterRepo(): {
  repoPath: string;
  starter: StarterCatalogEntry;
} {
  const repoPath = mkdtempSync(join(tmpdir(), 'josent-starter-repo-'));

  runGit(['init'], repoPath);
  runGit(['config', 'user.email', 'agent@example.com'], repoPath);
  runGit(['config', 'user.name', 'Agent Test'], repoPath);

  writeFileSync(join(repoPath, 'README.md'), '# template\n');
  writeFileSync(join(repoPath, 'src.txt'), 'starter contents\n');
  runGit(['add', '.'], repoPath);
  runGit(['commit', '-m', 'initial starter'], repoPath);

  return {
    repoPath,
    starter: {
      name: 'starter-template',
      repoUrl: repoPath,
      description: 'local test starter',
      tags: ['test'],
    },
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

describe('cloneStarter', () => {
  test('clones the starter, removes git history, and keeps files intact', async () => {
    const { starter } = createStarterRepo();
    const destination = join(
      mkdtempSync(join(tmpdir(), 'josent-clone-')),
      'my-app',
    );

    await expect(
      cloneStarter(starter, destination, createNonInteractiveIO()),
    ).resolves.toEqual({ originUrl: null });

    expect(existsSync(join(destination, 'README.md'))).toBeTrue();
    expect(readFileSync(join(destination, 'src.txt'), 'utf8')).toBe(
      'starter contents\n',
    );
    expect(existsSync(join(destination, '.git'))).toBeFalse();
  });

  test('can ask for and configure a new origin URL', async () => {
    const { starter } = createStarterRepo();
    const destination = join(
      mkdtempSync(join(tmpdir(), 'josent-origin-')),
      'my-app',
    );
    const io = createInteractiveIO();

    const clonePromise = cloneStarter(starter, destination, io);
    await Promise.resolve();
    io.input.write('https://github.com/example/new-origin.git\n');

    await expect(clonePromise).resolves.toEqual({
      originUrl: 'https://github.com/example/new-origin.git',
    });

    expect(existsSync(join(destination, '.git'))).toBeTrue();
    expect(runGit(['remote', 'get-url', 'origin'], destination).trim()).toBe(
      'https://github.com/example/new-origin.git',
    );
  });
});
