import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { stdin as processStdin, stdout as processStdout } from 'node:process';
import type { ReadStream, WriteStream } from 'node:tty';

export interface InitPromptIO {
  input: ReadStream;
  output: WriteStream;
}

export interface InitArguments {
  projectName?: string;
  destination?: string;
}

export interface PreparedInitTarget {
  projectName: string;
  destination: string;
}

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
    prompt.question(question, (answer) => {
      prompt.close();
      resolve(answer);
    });

    prompt.once('SIGINT', () => {
      prompt.close();
      reject(new Error('josent init was cancelled.'));
    });
  });
}

export function parseInitArguments(argv: string[]): InitArguments {
  let projectName: string | undefined;
  let destination: string | undefined;

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
    (isInteractive(io) ? (await askQuestion(io, 'Destination: ')).trim() : '');

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
  const { projectName, destination } = parseInitArguments(argv);

  return {
    projectName: await resolveProjectName(projectName, io),
    destination: await resolveDestination(destination, io),
  };
}
