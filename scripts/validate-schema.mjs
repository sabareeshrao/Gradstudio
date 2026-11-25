import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = path.join(root, 'worker', 'schema.sql');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gradstudio-schema-'));
const databasePath = path.join(tempRoot, 'schema.db');

try {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const create = spawnSync('sqlite3', [databasePath], { input: schema, encoding: 'utf8' });
  if (create.status !== 0) throw new Error(create.stderr || create.stdout || 'Schema creation failed.');

  const smoke = `
PRAGMA foreign_keys = ON;
SELECT id, title, parent_course_id, type, is_active, is_deleted, is_locked FROM courses WHERE 0;
SELECT id, course_id, title, is_deleted, is_locked FROM sections WHERE 0;
SELECT id, course_id, section_id, slug, file_path, link, is_deleted, is_locked FROM simulations WHERE 0;
SELECT id, email, role, is_active, last_login_at FROM users WHERE 0;
SELECT simulation_id, views, likes, dislikes, reports, last_synced_at FROM statistics WHERE 0;
SELECT id, carousel_id, course_links, content_type, text_position FROM carousel_cards WHERE 0;
SELECT id, event_type, metadata, created_at FROM security_events WHERE 0;
SELECT action, file_key, file_name, timestamp, details FROM file_audit_log WHERE 0;
SELECT item_key, type, course_id, lesson_index FROM user_pins WHERE 0;
SELECT 'integrity=' || integrity_check FROM pragma_integrity_check;
SELECT 'foreign-key-errors=' || COUNT(*) FROM pragma_foreign_key_check;
`;
  const verify = spawnSync('sqlite3', [databasePath], { input: smoke, encoding: 'utf8' });
  if (verify.status !== 0) throw new Error(verify.stderr || verify.stdout || 'Schema smoke test failed.');
  if (!verify.stdout.includes('integrity=ok') || !verify.stdout.includes('foreign-key-errors=0')) {
    throw new Error(`Schema integrity failed:\n${verify.stdout}`);
  }
  console.log('Fresh canonical schema validation passed.');
} finally {
  if (path.dirname(databasePath) === tempRoot && tempRoot.startsWith(os.tmpdir())) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}
