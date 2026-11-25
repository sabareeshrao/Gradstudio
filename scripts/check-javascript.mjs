import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1))), '..');
const roots = ['worker/src', 'worker/test', 'scripts', 'static'];
const failures = [];

function visit(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(target);
    else if (/\.(?:js|mjs)$/.test(entry.name)) {
      const result = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
      if (result.status !== 0) failures.push(`${path.relative(root, target)}\n${result.stderr || result.stdout}`);
    }
  }
}

roots.forEach(relative => visit(path.join(root, relative)));
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('JavaScript syntax checks passed.');
