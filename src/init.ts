import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { stdin as processStdin, stdout as processStdout } from 'node:process';
import type { ReadStream, WriteStream } from 'node:tty';

import type { StarterCatalogEntry } from './catalog.js';

export interface InitPromptIO {
  input: ReadStream;
  output: WriteStream;
}

export interface InitArguments {
  projectName?: string;
  destination?: string;
  installDependencies: boolean;
}

export interface PreparedInitTarget {
  projectName: string;
  destination: string;
  installDependencies: boolean;
}

export interface CloneStarterResult {
  originUrl: string | null;
}

type PackageManager = 'pnpm' | 'npm';

export function normalizeProjectName(projectName: string): string {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function isInteractive(io: InitPromptIO): boolean {
  return io.input.isTTY && io.output.isTTY;
}

function askQuestion(io: InitPromptIO, question: string): Promise<string> {
  const prompt = createInterface({
    input: io.input,
    output: io.output,
    terminal: true,
  });

  return new Promise<string>((resolve, reject) => {
    prompt.question(question, (answer: string) => {
      prompt.close();
      resolve(answer);
    });

    prompt.once('SIGINT', () => {
      prompt.close();
      reject(new Error('josent init was cancelled.'));
    });
  });
}

function runGit(args: string[], cwd: string): void {
  try {
    execFileSync('git', args, {
      cwd,
      stdio: 'pipe',
    });
  } catch (error) {
    const stderr =
      error instanceof Error && 'stderr' in error
        ? String((error as { stderr?: Buffer | string }).stderr ?? '').trim()
        : '';
    const command = ['git', ...args].join(' ');

    throw new Error(
      stderr === ''
        ? `Failed to run ${command}.`
        : `Failed to run ${command}: ${stderr}`,
      { cause: error },
    );
  }
}

function runPackageManager(
  packageManager: PackageManager,
  args: string[],
  cwd: string,
): void {
  try {
    execFileSync(packageManager, args, {
      cwd,
      stdio: 'pipe',
    });
  } catch (error) {
    if (isCommandNotFound(error)) {
      throw error;
    }

    const stderr =
      error instanceof Error && 'stderr' in error
        ? String((error as { stderr?: Buffer | string }).stderr ?? '').trim()
        : '';
    const command = [packageManager, ...args].join(' ');

    throw new Error(
      stderr === ''
        ? `Failed to run ${command}.`
        : `Failed to run ${command}: ${stderr}`,
      { cause: error },
    );
  }
}

function isCommandNotFound(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  const code = (error as { code?: string }).code;

  return (
    code === 'ENOENT' ||
    message.includes('executable not found in $path') ||
    message.includes('enoent')
  );
}

function cloneStarterRepository(
  starter: StarterCatalogEntry,
  destination: string,
): void {
  const args = ['clone'];

  if (starter.branch !== undefined) {
    args.push('--branch', starter.branch);
  }

  args.push(starter.repoUrl, destination);
  runGit(args, '.');
}

function removeGitHistory(destination: string): void {
  rmSync(join(destination, '.git'), {
    force: true,
    recursive: true,
  });
}

function detectPreferredPackageManager(destination: string): PackageManager {
  if (existsSync(join(destination, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }

  if (existsSync(join(destination, 'package-lock.json'))) {
    return 'npm';
  }

  return 'pnpm';
}

function installDependencies(destination: string): void {
  const preferredPackageManager = detectPreferredPackageManager(destination);

  if (preferredPackageManager === 'npm') {
    runPackageManager('npm', ['install'], destination);
    return;
  }

  try {
    runPackageManager('pnpm', ['install'], destination);
  } catch (error) {
    if (!isCommandNotFound(error)) {
      throw error;
    }

    runPackageManager('npm', ['install'], destination);
  }
}

async function askForNewOriginUrl(io: InitPromptIO): Promise<string | null> {
  if (!isInteractive(io)) {
    return null;
  }

  const answer = await askQuestion(io, 'New origin URL (optional): ');
  const normalized = answer.trim();

  return normalized === '' ? null : normalized;
}

function configureOrigin(destination: string, originUrl: string): void {
  runGit(['init'], destination);
  runGit(['remote', 'add', 'origin', originUrl], destination);
}

export async function cloneStarter(
  starter: StarterCatalogEntry,
  destination: string,
  install = true,
  io: InitPromptIO = {
    input: processStdin,
    output: processStdout,
  },
): Promise<CloneStarterResult> {
  cloneStarterRepository(starter, destination);
  removeGitHistory(destination);

  const originUrl = await askForNewOriginUrl(io);

  if (originUrl !== null) {
    configureOrigin(destination, originUrl);
  }

  if (install) {
    installDependencies(destination);
  }

  return { originUrl };
}

export function parseInitArguments(argv: string[]): InitArguments {
  let projectName: string | undefined;
  let destination: string | undefined;
  let installDependencies = true;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === undefined) {
      continue;
    }

    if (argument === '-n' || argument === '--name') {
      const next = argv[++index];

      if (next === undefined || next.startsWith('-')) {
        throw new Error('Missing value for --name.');
      }

      projectName = next;
      continue;
    }

    if (argument.startsWith('--name=')) {
      projectName = argument.slice('--name='.length);
      continue;
    }

    if (
      argument === '-d' ||
      argument === '--destination' ||
      argument === '--path'
    ) {
      const next = argv[++index];

      if (next === undefined || next.startsWith('-')) {
        throw new Error('Missing value for --destination.');
      }

      destination = next;
      continue;
    }

    if (argument === '--no-install') {
      installDependencies = false;
      continue;
    }

    if (
      argument.startsWith('--destination=') ||
      argument.startsWith('--path=')
    ) {
      destination = argument.slice(argument.indexOf('=') + 1);
      continue;
    }

    if (argument.startsWith('-')) {
      throw new Error(`Unknown argument for josent init: ${argument}`);
    }

    if (projectName === undefined) {
      projectName = argument;
      continue;
    }

    if (destination === undefined) {
      destination = argument;
      continue;
    }

    throw new Error(`Unknown argument for josent init: ${argument}`);
  }

  return {
    ...(projectName === undefined ? {} : { projectName }),
    ...(destination === undefined ? {} : { destination }),
    installDependencies,
  };
}

async function resolveProjectName(
  projectName: string | undefined,
  io: InitPromptIO,
): Promise<string> {
  const answer =
    projectName?.trim() ||
    (isInteractive(io) ? (await askQuestion(io, 'Project name: ')).trim() : '');

  if (answer === '') {
    throw new Error(
      'A project name is required. Pass one as an argument or run josent init interactively.',
    );
  }

  const normalized = normalizeProjectName(answer);

  if (normalized === '') {
    throw new Error(
      `Project name ${JSON.stringify(answer)} does not contain any letters or numbers.`,
    );
  }

  return normalized;
}

async function resolveDestination(
  destination: string | undefined,
  io: InitPromptIO,
): Promise<string> {
  const answer =
    destination?.trim() ||
    (isInteractive(io)
      ? (await askQuestion(io, 'Destination path: ')).trim()
      : '');

  if (answer === '') {
    throw new Error(
      'A destination is required. Pass one as an argument or run josent init interactively.',
    );
  }

  if (existsSync(answer)) {
    throw new Error(
      `Destination already exists: ${answer}. Choose an empty directory or remove it before running josent init.`,
    );
  }

  return answer;
}

export async function prepareInitTarget(
  argv: string[],
  io: InitPromptIO = {
    input: processStdin,
    output: processStdout,
  },
): Promise<PreparedInitTarget> {
  const { projectName, destination, installDependencies } =
    parseInitArguments(argv);

  return {
    projectName: await resolveProjectName(projectName, io),
    destination: await resolveDestination(destination, io),
    installDependencies,
  };
}
