#!/usr/bin/env node

import { rmSync } from 'node:fs';

rmSync(new URL('../dist/types', import.meta.url), {
  recursive: true,
  force: true,
});
