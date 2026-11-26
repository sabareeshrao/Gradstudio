import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const run = event.workflow_run;
const repository = process.env.GITHUB_REPOSITORY;
const pr = run?.pull_requests?.[0];
if (!run || run.name !== 'Application UI validation' || run.conclusion !== 'success' || !pr) process.exit(0);
if (pr.head.repo?.id !== pr.base.repo?.id || pr.base.ref !== 'main' || pr.base.repo?.name !== repository.split('/')[1]) process.exit(0);

execFileSync('git', ['fetch', '--no-tags', 'origin', pr.base.sha, pr.head.sha], { stdio: 'inherit' });
const fields = execFileSync('git', ['diff', '--raw', '--no-renames', '-z', pr.base.sha, pr.head.sha], { encoding: 'utf8' }).split('\0');
if (fields.pop() !== '' || !fields.length || fields.length % 2) throw new Error('Preview diff is malformed');

const changes = [];
let hasStaticChange = false;
for (let index = 0; index < fields.length; index += 2) {
  const match = fields[index].match(/^:(\d{6}) (\d{6}) [0-9a-f]+ [0-9a-f]+ ([AMD])$/);
  if (!match) throw new Error('Preview diff includes a rename or unsupported file operation');
  const [, oldMode, newMode, status] = match;
  const file = fields[index + 1].replaceAll('\\', '/');
  if (![oldMode, newMode].every(mode => mode === '000000' || mode === '100644')) throw new Error(`Preview rejects non-regular file ${file}`);
  if (!file.startsWith('static/') && !file.startsWith('docs/ui/')) throw new Error(`Preview rejects non-UI path ${file}`);
  if (file.startsWith('static/')) hasStaticChange = true;
  changes.push({ file, status });
}
if (!hasStaticChange) process.exit(0);

for (const { file, status } of changes) {
  const destination = path.resolve(file);
  if (!destination.startsWith(`${process.cwd()}${path.sep}`)) throw new Error(`Preview path escapes the checkout: ${file}`);
  if (status === 'D') {
    fs.rmSync(destination, { force: true });
    continue;
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, execFileSync('git', ['show', `${pr.head.sha}:${file}`], { encoding: 'buffer', maxBuffer: 50 * 1024 * 1024 }));
}

const alias = `pr-${pr.number}`;
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `eligible=true\npr_number=${pr.number}\nhead_sha=${pr.head.sha}\npreview_alias=${alias}\n`);
}
console.log(`Prepared trusted remote preview tree for PR #${pr.number} at ${pr.head.sha}.`);
