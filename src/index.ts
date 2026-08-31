import {
  CATALOG_VERSION,
  loadStarterCatalog,
  type StarterCatalogEntry,
} from './catalog.js';

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
    'Start the starter selection flow.',
    '',
    'Usage:',
    `  ${APP_NAME} init`,
    '',
    'Flags:',
    '  -h, --help  Show this help text',
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

export function getInitText(): string {
  return [
    `${APP_NAME} init`,
    '',
    'Interactive starter selection is coming online in the next slice.',
    `Use ${APP_NAME} list to inspect the current catalog.`,
  ].join('\n');
}

function isHelpFlag(value: string | undefined): boolean {
  return value === '-h' || value === '--help';
}

function writeLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function writeError(message: string): void {
  process.stderr.write(`${message}\n`);
}

export function run(argv: string[]): number {
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

    if (subcommand !== undefined) {
      writeError(`Unknown argument for ${APP_NAME} init: ${subcommand}`);
      writeError(`Run \`${APP_NAME} init --help\` to see the available usage.`);
      return 1;
    }

    writeLine(getInitText());
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
