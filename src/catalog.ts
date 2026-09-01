import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const CATALOG_VERSION = '0.1.0';

export interface StarterCatalogEntry {
  name: string;
  repoUrl: string;
  description: string;
  tags: string[];
  branch?: string;
}

interface StarterCatalogFile {
  version: string;
  starters: StarterCatalogEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function isStarterCatalogEntry(value: unknown): value is StarterCatalogEntry {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.name === 'string' &&
    typeof value.repoUrl === 'string' &&
    typeof value.description === 'string' &&
    isStringArray(value.tags) &&
    (value.branch === undefined || typeof value.branch === 'string')
  );
}

function isStarterCatalogFile(value: unknown): value is StarterCatalogFile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.version === 'string' &&
    Array.isArray(value.starters) &&
    value.starters.every((entry) => isStarterCatalogEntry(entry))
  );
}

export function loadStarterCatalog(
  version = CATALOG_VERSION,
): StarterCatalogEntry[] {
  const catalogPath = fileURLToPath(
    new URL(`../catalogs/starter-catalog.v${version}.json`, import.meta.url),
  );
  const parsed: unknown = JSON.parse(readFileSync(catalogPath, 'utf8'));

  if (!isStarterCatalogFile(parsed)) {
    throw new Error(`Starter catalog ${version} is invalid.`);
  }

  if (parsed.version !== version) {
    throw new Error(
      `Starter catalog version mismatch: expected ${version}, found ${parsed.version}.`,
    );
  }

  return parsed.starters;
}
