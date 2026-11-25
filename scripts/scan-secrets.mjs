import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ignoredDirectories = new Set(['.git', 'node_modules', '.wrangler']);
const ignoredExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.zip', '.tgz', '.woff', '.woff2']);
const findings = [];

const signatures = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['GitHub token', /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ['assigned JWT secret', /\bJWT_(?:REFRESH_)?SECRET\s*=\s*["'][^"']{32,}["']/]
];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(target);
      continue;
    }
    if (ignoredExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    if (fs.statSync(target).size > 2 * 1024 * 1024) continue;
    const content = fs.readFileSync(target, 'utf8');
    for (const [label, pattern] of signatures) {
      if (pattern.test(content)) findings.push(`${path.relative(root, target)}: ${label}`);
    }
  }
}

visit(root);
if (findings.length) {
  console.error('Potential secrets detected (values suppressed):');
  findings.forEach(finding => console.error(`- ${finding}`));
  process.exit(1);
}
console.log('Secret-signature scan passed.');
