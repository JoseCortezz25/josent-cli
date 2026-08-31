import {
  CATALOG_VERSION,
  loadStarterCatalog,
  type StarterCatalogEntry,
} from './catalog.js';
import { cloneStarter, prepareInitTarget } from './init.js';
import { selectStarter } from './starter-picker.js';

export const APP_NAME = 'josent';
export const VERSION = '0.1.0';

function formatStarter(entry: StarterCatalogEntry): string {
  const tags =
    entry.tags.length > 0 ? `[${entry.tags.join(', ')}]` : '[no tags]';
  return `- ${entry.name} ${tags} — ${entry.description}`;
}

export function getHelpText(): string {
  return [
    `${APP_NAME} v${VERSION}`,
    '',
    'A Bun + TypeScript CLI for curated template starters.',
    '',
    'Usage:',
    `  ${APP_NAME} <command>`,
    '',
    'Commands:',
    '  init    Start the interactive starter workflow',
    '  list    Show the starter catalog',
    '',
    'Examples:',
    `  ${APP_NAME} init`,
    `  ${APP_NAME} init --help`,
    `  ${APP_NAME} list`,
    '',
    'Flags:',
    '  -h, --help     Show this help text',
    '  -v, --version  Show the CLI version',
  ].join('\n');
}

export function getInitHelpText(): string {
  return [
    `${APP_NAME} init`,
    '',
    'Start interactive starter selection and project setup.',
    '',
    'Usage:',
    `  ${APP_NAME} init [project-name] [destination]`,
    '',
    'Controls:',
    '  type         Filter the starter list',
    '  ↑ / ↓        Move the selection',
    '  Enter        Choose the highlighted starter',
    '  Esc          Clear the search query',
    '  Ctrl+C       Cancel the flow',
    '',
    'The selected starter is cloned, its git history is removed, and you can',
    'optionally set a new origin URL.',
    '',
    'Flags:',
    '  -n, --name <name>           Set the project name',
    '  -d, --destination <path>    Set the destination path',
    '',
    'Related commands:',
    `  ${APP_NAME} list`,
  ].join('\n');
}

export function getListText(): string {
  const starters = loadStarterCatalog(CATALOG_VERSION);

  return [
    `${APP_NAME} starter catalog v${CATALOG_VERSION}`,
    '',
    ...starters.map((starter) => formatStarter(starter)),
  ].join('\n');
}

function isHelpFlag(value: string | undefined): boolean {
  return value === '-h' || value === '--help';
}

function writeLine(message: string): void {
  console.log(message);
}

function writeError(message: string): void {
  console.error(message);
}

export async function run(argv: string[]): Promise<number> {
  const [command, subcommand] = argv;

  if (!command || isHelpFlag(command)) {
    writeLine(getHelpText());
    return 0;
  }

  if (command === '-v' || command === '--version') {
    writeLine(VERSION);
    return 0;
  }

  if (command === 'init') {
    if (isHelpFlag(subcommand)) {
      writeLine(getInitHelpText());
      return 0;
    }

    const starters = loadStarterCatalog(CATALOG_VERSION);
    const starter = await selectStarter(starters);

    if (starter === null) {
      writeError(`No starters are available in the ${APP_NAME} catalog.`);
      return 1;
    }

    let projectTarget: Awaited<ReturnType<typeof prepareInitTarget>>;

    try {
      projectTarget = await prepareInitTarget(argv.slice(1));
      const cloneResult = await cloneStarter(
        starter,
        projectTarget.destination,
      );

      writeLine(`Selected starter: ${starter.name}`);
      writeLine(`Repository: ${starter.repoUrl}`);
      writeLine(`Project name: ${projectTarget.projectName}`);
      writeLine(`Destination: ${projectTarget.destination}`);
      writeLine('Starter cloned successfully.');

      if (cloneResult.originUrl !== null) {
        writeLine(`New origin: ${cloneResult.originUrl}`);
      }
    } catch (error) {
      writeError(error instanceof Error ? error.message : String(error));
      return 1;
    }

    return 0;
  }

  if (command === 'list') {
    if (isHelpFlag(subcommand)) {
      writeLine(`${APP_NAME} list\n\nShow the starter catalog.`);
      return 0;
    }

    if (subcommand !== undefined) {
      writeError(`Unknown argument for ${APP_NAME} list: ${subcommand}`);
      writeError(`Run \`${APP_NAME} --help\` to see the available commands.`);
      return 1;
    }

    writeLine(getListText());
    return 0;
  }

  writeError(`Unknown command: ${command}`);
  writeError(`Run \`${APP_NAME} --help\` to see the available commands.`);
  return 1;
}
