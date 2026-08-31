export const APP_NAME = 'josent';
export const VERSION = '0.1.0';

export function getHelpText(): string {
  return [
    `${APP_NAME} v${VERSION}`,
    '',
    'A Bun + TypeScript scaffold for the josent CLI.',
    '',
    'Usage:',
    `  ${APP_NAME} <command>`,
    '',
    'Commands:',
    '  init    Start the interactive starter workflow',
    '  list    Show the available starter catalog',
    '',
    'Flags:',
    '  -h, --help     Show this help text',
    '  -v, --version  Show the CLI version',
  ].join('\n');
}

export function run(argv: string[]): number {
  const [command] = argv;

  if (!command || command === '-h' || command === '--help') {
    console.log(getHelpText());
    return 0;
  }

  if (command === '-v' || command === '--version') {
    console.log(VERSION);
    return 0;
  }

  if (command === 'init' || command === 'list') {
    console.log(
      `${APP_NAME} is scaffolded and ready for the first implementation slice.`,
    );
    return 0;
  }

  console.error(`Unknown command: ${command}`);
  console.error('Run `josent --help` to see the available commands.');
  return 1;
}
