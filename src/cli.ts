#!/usr/bin/env bun

import { run } from './index.js';
import { argv } from 'node:process';

const exitCode = await run(argv.slice(2));
globalThis.process.exitCode = exitCode;
