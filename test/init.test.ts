import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
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

function createStarterRepo(
  options: {
    lockfile?: 'pnpm' | 'npm' | null;
  } = {},
): {
  repoPath: string;
  starter: StarterCatalogEntry;
} {
  const repoPath = mkdtempSync(join(tmpdir(), 'josent-starter-repo-'));

  runGit(['init'], repoPath);
  runGit(['config', 'user.email', 'agent@example.com'], repoPath);
  runGit(['config', 'user.name', 'Agent Test'], repoPath);

  writeFileSync(
    join(repoPath, 'package.json'),
    '{"name":"starter","private":true}\n',
  );
  writeFileSync(join(repoPath, 'README.md'), '# template\n');
  writeFileSync(join(repoPath, 'src.txt'), 'starter contents\n');

  if (options.lockfile === 'pnpm') {
    writeFileSync(join(repoPath, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
  }

  if (options.lockfile === 'npm') {
    writeFileSync(
      join(repoPath, 'package-lock.json'),
      '{"lockfileVersion":3}\n',
    );
  }

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

function createCommandDir(logPath: string, commands: string[]): string {
  const commandDir = mkdtempSync(join(tmpdir(), 'josent-bin-'));

  for (const command of commands) {
    const scriptPath = join(commandDir, command);
    writeFileSync(
      scriptPath,
      `#!/usr/bin/env node
const fs = require('node:fs');
fs.appendFileSync(${JSON.stringify(logPath)}, '${command} ' + process.argv.slice(2).join(' ') + '\\n');
`,
    );
    chmodSync(scriptPath, 0o755);
  }

  return commandDir;
}

function getSystemBinaryPath(binary: string): string {
  return execFileSync('which', [binary], { encoding: 'utf8' }).trim();
}

function createBinaryMirrorDir(binaries: Record<string, string>): string {
  const binaryDir = mkdtempSync(join(tmpdir(), 'josent-bin-mirror-'));

  for (const [name, target] of Object.entries(binaries)) {
    symlinkSync(target, join(binaryDir, name));
  }

  return binaryDir;
}

async function withPath<T>(
  pathEntries: string[],
  run: () => Promise<T>,
  preservePreviousPath = true,
): Promise<T> {
  const previousPath = process.env.PATH ?? '';
  process.env.PATH = preservePreviousPath
    ? `${pathEntries.join(':')}:${previousPath}`
    : pathEntries.join(':');

  try {
    return await run();
  } finally {
    process.env.PATH = previousPath;
  }
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
      installDependencies: true,
    });
  });

  test('supports flags', () => {
    expect(
      parseInitArguments(['--name', 'My App', '--destination=./tmp']),
    ).toEqual({
      projectName: 'My App',
      destination: './tmp',
      installDependencies: true,
    });
  });

  test('supports skipping dependency installation', () => {
    expect(parseInitArguments(['--no-install', 'my-app', './tmp'])).toEqual({
      projectName: 'my-app',
      destination: './tmp',
      installDependencies: false,
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
      installDependencies: true,
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
      cloneStarter(starter, destination, false, createNonInteractiveIO()),
    ).resolves.toEqual({ originUrl: null });

    expect(existsSync(join(destination, 'README.md'))).toBeTrue();
    expect(readFileSync(join(destination, 'src.txt'), 'utf8')).toBe(
      'starter contents\n',
    );
    expect(existsSync(join(destination, '.git'))).toBeFalse();
  });

  test('installs dependencies with pnpm when pnpm lockfiles are present', async () => {
    const { starter } = createStarterRepo({ lockfile: 'pnpm' });
    const destination = join(
      mkdtempSync(join(tmpdir(), 'josent-install-pnpm-')),
      'my-app',
    );
    const logPath = join(tmpdir(), `josent-install-${Date.now()}-pnpm.log`);
    const commandDir = createCommandDir(logPath, ['pnpm', 'npm']);

    await withPath([commandDir], async () => {
      await expect(
        cloneStarter(starter, destination, true, createNonInteractiveIO()),
      ).resolves.toEqual({ originUrl: null });
    });

    expect(readFileSync(logPath, 'utf8')).toBe('pnpm install\n');
  });

  test('falls back to npm when pnpm is unavailable', async () => {
    const { starter } = createStarterRepo({ lockfile: 'pnpm' });
    const destination = join(
      mkdtempSync(join(tmpdir(), 'josent-install-npm-')),
      'my-app',
    );
    const logPath = join(tmpdir(), `josent-install-${Date.now()}-npm.log`);
    const commandDir = createCommandDir(logPath, ['npm']);
    const binaryDir = createBinaryMirrorDir({
      git: getSystemBinaryPath('git'),
      node: getSystemBinaryPath('node'),
    });

    await withPath(
      [commandDir, binaryDir],
      async () => {
        await expect(
          cloneStarter(starter, destination, true, createNonInteractiveIO()),
        ).resolves.toEqual({ originUrl: null });
      },
      false,
    );

    expect(readFileSync(logPath, 'utf8')).toBe('npm install\n');
  });

  test('skips dependency installation when requested', async () => {
    const { starter } = createStarterRepo({ lockfile: 'pnpm' });
    const destination = join(
      mkdtempSync(join(tmpdir(), 'josent-install-skip-')),
      'my-app',
    );
    const logPath = join(tmpdir(), `josent-install-${Date.now()}-skip.log`);
    const commandDir = createCommandDir(logPath, ['pnpm', 'npm']);

    await withPath([commandDir], async () => {
      await expect(
        cloneStarter(starter, destination, false, createNonInteractiveIO()),
      ).resolves.toEqual({ originUrl: null });
    });

    expect(existsSync(logPath)).toBeFalse();
  });

  test('can ask for and configure a new origin URL', async () => {
    const { starter } = createStarterRepo();
    const destination = join(
      mkdtempSync(join(tmpdir(), 'josent-origin-')),
      'my-app',
    );
    const io = createInteractiveIO();

    const clonePromise = cloneStarter(starter, destination, false, io);
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
