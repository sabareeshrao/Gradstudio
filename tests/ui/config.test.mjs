import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "../..");

test("compiled UI configuration is deterministic and current", () => {
  const first = fs.readFileSync(path.join(root, "static/ui-config/generated/ui-config.runtime.js"), "utf8");
  const result = spawnSync(process.execPath, ["scripts/ui/compile-ui-config.mjs", "--check"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const second = fs.readFileSync(path.join(root, "static/ui-config/generated/ui-config.runtime.js"), "utf8");
  assert.equal(first, second);
});

test("runtime configuration round-trips as a deeply frozen data object", () => {
  const source = fs.readFileSync(path.join(root, "static/ui-config/generated/ui-config.runtime.js"), "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: "ui-config.runtime.js" });
  const config = context.window.__GRADSTUDIO_UI_CONFIG__;
  assert.equal(config.schemaVersion, 1);
  assert.equal(config.home.hero.heading, "Clearer concepts. Faster learning.");
  assert.equal(Object.isFrozen(config), true);
  assert.equal(Object.isFrozen(config.theme.colors), true);
});

test("configuration contains data only and registered paths stay inside owned roots", () => {
  const registry = JSON.parse(fs.readFileSync(path.join(root, "static/ui-config/registry.json"), "utf8"));
  const runtime = fs.readFileSync(path.join(root, "static/ui-config/generated/ui-config.runtime.js"), "utf8");
  assert.doesNotMatch(runtime, /<\s*script\b|javascript\s*:|data\s*:\s*text\/html/i);
  for (const component of Object.values(registry.components)) {
    for (const value of [...component.source, component.styleOwner, component.behaviorOwner, ...(component.configPaths || [])]) {
      assert.doesNotMatch(value, /(^|\/)\.\.(\/|$)|^[A-Za-z]:|^\//);
    }
  }
});
