import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const PRODUCTION_FINGERPRINTS = [
  'b1f24bfd-4ca5-4c2b-94af-8037cd68422f',
  'e5dc25fdeb9d42eb8947287323cf7027',
  '92489a91aab6495ab072d7e2715eb8e0',
  'dd4395372be745e5b7d5f63acddb002a',
  'bucket_name = "learning-simulations"',
  'gradstudio.org/*',
  'www.gradstudio.org/*',
  'api.gradstudio.org'
];

const REQUIRED_BINDINGS = ['DB', 'KV', 'REFRESH_TOKENS', 'RATE_LIMITS', 'R2'];

export function validateEnvironmentConfig(content, expectedEnvironment, options = {}) {
  const errors = [];
  const example = Boolean(options.example);

  if (!['dev', 'staging'].includes(expectedEnvironment)) {
    errors.push('Expected environment must be dev or staging.');
  }

  for (const fingerprint of PRODUCTION_FINGERPRINTS) {
    if (content.includes(fingerprint)) errors.push(`Production fingerprint is forbidden: ${fingerprint}`);
  }

  if (!content.includes(`ENVIRONMENT = "${expectedEnvironment}"`)) {
    errors.push(`ENVIRONMENT must be ${expectedEnvironment}.`);
  }
  if (!content.includes('ENVIRONMENT_ISOLATED = "true"')) {
    errors.push('ENVIRONMENT_ISOLATED must be true.');
  }

  for (const binding of REQUIRED_BINDINGS) {
    if (!content.includes(`binding = "${binding}"`)) errors.push(`Missing ${binding} binding.`);
  }

  const nameMatch = content.match(/^name\s*=\s*"([^"]+)"/m);
  if (!nameMatch || !nameMatch[1].includes(expectedEnvironment)) {
    errors.push(`Worker name must contain ${expectedEnvironment}.`);
  }

  const databaseName = content.match(/^database_name\s*=\s*"([^"]+)"/m)?.[1] || '';
  if (!databaseName.includes(expectedEnvironment)) errors.push(`D1 database name must contain ${expectedEnvironment}.`);

  const bucketName = content.match(/^bucket_name\s*=\s*"([^"]+)"/m)?.[1] || '';
  if (!bucketName.includes(expectedEnvironment)) errors.push(`R2 bucket name must contain ${expectedEnvironment}.`);

  if (!example && /REPLACE_WITH_[A-Z0-9_]+/.test(content)) {
    errors.push('Configuration still contains placeholder values.');
  }

  const ids = [...content.matchAll(/^id\s*=\s*"([^"]+)"/gm)].map(match => match[1]);
  if (!example && new Set(ids).size !== ids.length) errors.push('KV namespace IDs must be distinct.');

  return errors;
}

function main() {
  const args = process.argv.slice(2);
  const example = args.includes('--example');
  const positional = args.filter(arg => arg !== '--example');
  if (positional.length !== 2) {
    console.error('Usage: node scripts/validate-environment-config.mjs <config> <dev|staging> [--example]');
    process.exit(2);
  }

  const [configPath, expectedEnvironment] = positional;
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) {
    console.error(`Configuration not found: ${resolved}`);
    process.exit(2);
  }

  const errors = validateEnvironmentConfig(fs.readFileSync(resolved, 'utf8'), expectedEnvironment, { example });
  if (errors.length) {
    errors.forEach(error => console.error(`ERROR: ${error}`));
    process.exit(1);
  }
  console.log(`Environment configuration is isolated: ${resolved}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
