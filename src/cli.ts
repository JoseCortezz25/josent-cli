#!/usr/bin/env bun

import { run } from './index.js';

process.exitCode = run(process.argv.slice(2));
