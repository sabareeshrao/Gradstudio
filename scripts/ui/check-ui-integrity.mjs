import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const staticRoot = path.join(root, "static");
const html = read("static/index.html");
const client = read("static/gradstudio-learn-demo.js");
const css = read("static/gradstudio-learn-demo.css");
const applyConfig = read("static/ui-config/apply-config.js");
const registry = JSON.parse(read("static/ui-config/registry.json"));
const inventory = read("docs/ui/component-inventory.md");
const failures = [];

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assertUnique(ids, "HTML id");

for (const [key, component] of Object.entries(registry.components)) {
  if (key !== component.componentId) fail(`${key}: registry key differs from componentId`);
  for (const relative of [...component.source, component.styleOwner, component.behaviorOwner, ...(component.configPaths || [])]) {
    if (relative.includes("..") || path.isAbsolute(relative)) fail(`${key}: unsafe path ${relative}`);
    if (!fs.existsSync(path.join(root, relative))) fail(`${key}: missing path ${relative}`);
  }
  if (!inventory.includes(`\`${key}\``)) fail(`${key}: missing from docs/ui/component-inventory.md`);
  if (["public", "dynamic"].includes(component.scope)) {
    const literal = `data-component-id="${key}"`;
    const ownedSource = component.source.map((relative) => read(relative)).join("\n");
    if (!ownedSource.includes(literal)) fail(`${key}: no deterministic component hook in an owned source file`);
  }
}

for (const asset of collectLocalAssets(html)) {
  const target = path.join(staticRoot, asset);
  if (!fs.existsSync(target)) fail(`canonical HTML references missing local asset ${asset}`);
}

for (const prototype of ["learn-next.html", "learn-next.js", "gradstudioapplelike.html"]) {
  if (html.includes(prototype)) fail(`canonical shell imports prototype ${prototype}`);
}

for (const required of [
  "ui-config/generated/ui-config.runtime.js",
  "ui-config/apply-config.js",
  "gradstudio-learn-demo.js"
]) {
  if (!html.includes(required)) fail(`canonical shell does not load ${required}`);
}

const runtimeIndex = html.indexOf("ui-config/generated/ui-config.runtime.js");
const adapterIndex = html.indexOf("ui-config/apply-config.js");
const applicationIndex = html.indexOf("gradstudio-learn-demo.js");
if (!(runtimeIndex < adapterIndex && adapterIndex < applicationIndex)) fail("UI config must load before the canonical application script");

if (/\.(?:innerHTML|outerHTML)\s*=|\beval\s*\(|\bnew\s+Function\b/.test(applyConfig)) {
  fail("configuration adapter must use safe DOM APIs and may not evaluate or inject markup");
}

for (const token of [
  "--page-bg", "--ui-font", "--space-md", "--radius", "--shadow", "--motion-fast",
  "--catalog-sidebar-width", "--course-card-min-width"
]) {
  if (!css.includes(token)) fail(`canonical stylesheet is missing design token ${token}`);
}

const preview = read("static/gradstudio-learn-demo.html");
if (!preview.includes("Generated from static/index.html")) fail("preview shell is not marked as generated");

if (failures.length) {
  console.error(`UI integrity failed (${failures.length}):`);
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`UI integrity passed: ${Object.keys(registry.components).length} components, ${ids.length} unique static IDs, ${collectLocalAssets(html).length} local assets.`);

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function fail(message) {
  failures.push(message);
}

function assertUnique(values, label) {
  const seen = new Set();
  values.forEach((value) => {
    if (seen.has(value)) fail(`duplicate ${label}: ${value}`);
    seen.add(value);
  });
}

function collectLocalAssets(source) {
  const results = [];
  for (const match of source.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const value = match[1].split("?")[0];
    if (!value || value.startsWith("#") || value.startsWith("/") || /^[a-z]+:/i.test(value)) continue;
    results.push(value);
  }
  return [...new Set(results)];
}
