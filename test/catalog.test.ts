import { expect, test } from 'bun:test';

import { loadStarterCatalog } from '../src/catalog.js';
import { getInitHelpText, getListText } from '../src/index.js';
import { selectStarter } from '../src/starter-picker.js';

test('starter catalog includes the first available repositories', async () => {
  const starters = loadStarterCatalog();

  expect(starters.slice(0, 2).map((starter) => starter.name)).toEqual([
    'nextjs-starter',
    'expo-react-native-starter',
  ]);
  expect(getListText()).toContain(
    '- nextjs-starter [nextjs, web, opencode, claude] — Next.js starter available for OpenCode and Claude',
  );
  expect(getListText()).toContain(
    '- expo-react-native-starter [expo, react-native, mobile, opencode, claude] — Expo / React Native starter available for OpenCode and Claude',
  );
  expect(getInitHelpText()).toContain(
    'Interactive starter selection and project setup.',
  );
  expect(getInitHelpText()).toContain('Esc          Clear the filter');

  await expect(
    selectStarter(starters, {
      input: { isTTY: false } as typeof process.stdin,
      output: { isTTY: false } as typeof process.stdout,
    }),
  ).resolves.toEqual(starters[0]);
});
