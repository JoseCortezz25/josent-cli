import { createInterface, emitKeypressEvents, type Key } from 'node:readline';
import { stdin as processStdin, stdout as processStdout } from 'node:process';
import type { ReadStream, WriteStream } from 'node:tty';

import type { StarterCatalogEntry } from './catalog.js';

export interface PromptIO {
  input: ReadStream;
  output: WriteStream;
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function filterStarters(
  starters: StarterCatalogEntry[],
  query: string,
): StarterCatalogEntry[] {
  const normalizedQuery = normalizeQuery(query);

  if (normalizedQuery === '') {
    return starters;
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  return starters.filter((starter) => {
    const haystack = [
      starter.name,
      starter.description,
      starter.repoUrl,
      starter.branch ?? '',
      ...starter.tags,
    ]
      .join(' ')
      .toLowerCase();

    return terms.every((term) => haystack.includes(term));
  });
}

function formatStarterLine(
  starter: StarterCatalogEntry,
  isSelected: boolean,
): string {
  const marker = isSelected ? '›' : ' ';
  const tags = starter.tags.length > 0 ? starter.tags.join(', ') : 'no tags';

  return `${marker} ${starter.name} [${tags}] — ${starter.description}`;
}

export function renderStarterPicker(
  starters: StarterCatalogEntry[],
  selectedIndex: number,
  query: string,
): string {
  const filtered = filterStarters(starters, query);
  const safeSelectedIndex =
    filtered.length === 0
      ? 0
      : Math.min(Math.max(selectedIndex, 0), filtered.length - 1);
  const normalizedQuery = normalizeQuery(query);

  return [
    'josent init',
    '',
    'Select a starter',
    '',
    'Type to filter · ↑/↓ move · Enter select · Esc clear · Ctrl+C cancel',
    `Filter: ${normalizedQuery === '' ? 'all starters' : query}`,
    '',
    filtered.length === 0
      ? `No starters match ${JSON.stringify(query)}.`
      : `${filtered.length} starter${filtered.length === 1 ? '' : 's'} found.`,
    '',
    ...filtered.map((starter, index) =>
      formatStarterLine(starter, index === safeSelectedIndex),
    ),
  ].join('\n');
}

function writePickerFrame(
  io: PromptIO,
  starters: StarterCatalogEntry[],
  selectedIndex: number,
  query: string,
): void {
  io.output.write('\x1Bc');
  io.output.write(`${renderStarterPicker(starters, selectedIndex, query)}\n`);
}

export async function selectStarter(
  starters: StarterCatalogEntry[],
  io: PromptIO = {
    input: processStdin,
    output: processStdout,
  },
): Promise<StarterCatalogEntry | null> {
  if (starters.length === 0) {
    return null;
  }

  if (!io.input.isTTY || !io.output.isTTY) {
    return starters[0] ?? null;
  }

  const rawModeWasEnabled = Boolean(io.input.isRaw);
  const prompt = createInterface({
    input: io.input,
    output: io.output,
    terminal: true,
    historySize: 0,
  });

  return await new Promise<StarterCatalogEntry | null>((resolve, reject) => {
    let selectedIndex = 0;
    let query = '';
    let settled = false;

    const finish = (result: StarterCatalogEntry | null): void => {
      if (settled) {
        return;
      }

      settled = true;
      io.input.off('keypress', handleKeypress);

      if (io.input.isTTY && io.input.isRaw && !rawModeWasEnabled) {
        io.input.setRawMode(false);
      }

      prompt.close();
      io.output.write('\x1Bc');
      resolve(result);
    };

    const fail = (error: Error): void => {
      if (settled) {
        return;
      }

      settled = true;
      io.input.off('keypress', handleKeypress);

      if (io.input.isTTY && io.input.isRaw && !rawModeWasEnabled) {
        io.input.setRawMode(false);
      }

      prompt.close();
      reject(error);
    };

    const getFilteredStarters = (): StarterCatalogEntry[] =>
      filterStarters(starters, query);

    const syncSelectedIndex = (): void => {
      const filtered = getFilteredStarters();
      if (filtered.length === 0) {
        selectedIndex = 0;
        return;
      }

      selectedIndex = Math.min(selectedIndex, filtered.length - 1);
    };

    const render = (): void => {
      syncSelectedIndex();
      writePickerFrame(io, starters, selectedIndex, query);
    };

    const handleKeypress = (
      str: string | undefined,
      key: Key | undefined,
    ): void => {
      if (key === undefined) {
        return;
      }

      if (key.ctrl && key.name === 'c') {
        fail(new Error('Starter selection cancelled.'));
        return;
      }

      if (key.name === 'return') {
        const filtered = getFilteredStarters();
        if (filtered.length > 0) {
          finish(filtered[selectedIndex] ?? filtered[0] ?? null);
        }
        return;
      }

      if (key.name === 'up') {
        const filtered = getFilteredStarters();
        if (filtered.length > 0) {
          selectedIndex =
            (selectedIndex - 1 + filtered.length) % filtered.length;
          render();
        }
        return;
      }

      if (key.name === 'down') {
        const filtered = getFilteredStarters();
        if (filtered.length > 0) {
          selectedIndex = (selectedIndex + 1) % filtered.length;
          render();
        }
        return;
      }

      if (key.name === 'backspace' || key.name === 'delete') {
        query = query.slice(0, -1);
        selectedIndex = 0;
        render();
        return;
      }

      if (key.name === 'escape') {
        if (query !== '') {
          query = '';
          selectedIndex = 0;
          render();
        }
        return;
      }

      if (str !== undefined && str.length > 0 && !key.ctrl && !key.meta) {
        query += str;
        selectedIndex = 0;
        render();
      }
    };

    emitKeypressEvents(io.input);
    if (io.input.isTTY) {
      io.input.setRawMode(true);
    }

    io.input.on('keypress', handleKeypress);
    prompt.once('SIGINT', () =>
      fail(new Error('Starter selection cancelled.')),
    );

    render();
  });
}
