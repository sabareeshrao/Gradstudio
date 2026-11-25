import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "../..");
const INVENTORY_SOURCES = Object.freeze([
  "AGENTS.md",
  "docs/ui/change-classification.md",
  "docs/ui/component-inventory.md",
  "docs/ui/configuration-contract.md",
  "docs/ui/prompt-operation-playbook.md",
  "static/ui-config/registry.json"
]);

export function buildComponentInventory({
  outputRoot = path.join(repositoryRoot, "dist", "ui-component-inventory"),
  sourceRevision = resolveRevision()
} = {}) {
  const resolvedOutput = path.resolve(outputRoot);
  assertSafeOutput(resolvedOutput);
  fs.rmSync(resolvedOutput, { recursive: true, force: true });
  fs.mkdirSync(resolvedOutput, { recursive: true });

  const files = INVENTORY_SOURCES.map((relativePath) => {
    const source = path.join(repositoryRoot, relativePath);
    const stat = fs.lstatSync(source);
    if (stat.isSymbolicLink()) throw new Error(`Refusing symbolic link in component inventory: ${relativePath}`);
    if (!stat.isFile()) throw new Error(`Component inventory source is not a file: ${relativePath}`);
    const content = fs.readFileSync(source);
    const target = path.join(resolvedOutput, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
    return {
      path: relativePath,
      bytes: content.length,
      sha256: sha256(content)
    };
  });

  const registry = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "static/ui-config/registry.json"), "utf8"));
  const components = Object.values(registry.components);
  const manifest = {
    schemaVersion: 1,
    sourceRevision,
    inventoryDigest: sha256(files.map((file) => `${file.path}\0${file.sha256}`).join("\n")),
    componentCount: components.length,
    counts: {
      riskClass: countBy(components, "riskClass"),
      scope: countBy(components, "scope"),
      status: countBy(components, "status")
    },
    files
  };
  fs.writeFileSync(path.join(resolvedOutput, "inventory-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (path.resolve(process.argv[1] ?? "") === scriptPath) {
  const options = parseArguments(process.argv.slice(2));
  const manifest = buildComponentInventory(options);
  console.log(`UI component inventory built: ${manifest.componentCount} components, digest ${manifest.inventoryDigest}, revision ${manifest.sourceRevision}.`);
}

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!value) throw new Error(`${key} requires a value`);
    if (key === "--output") options.outputRoot = value;
    else if (key === "--revision") options.sourceRevision = value;
    else throw new Error(`Unsupported argument: ${key}`);
  }
  return options;
}

function resolveRevision() {
  return process.env.UI_HEAD_SHA || process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
    encoding: "utf8"
  }).trim();
}

function countBy(values, key) {
  return Object.fromEntries(Object.entries(values.reduce((counts, value) => {
    counts[value[key]] = (counts[value[key]] ?? 0) + 1;
    return counts;
  }, {})).sort(([left], [right]) => left.localeCompare(right)));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function assertSafeOutput(output) {
  const allowedRoots = [path.join(repositoryRoot, "dist"), path.resolve(os.tmpdir())];
  if (!allowedRoots.some((root) => output.startsWith(`${root}${path.sep}`))) {
    throw new Error(`Component inventory output must stay inside repository dist or the system temporary directory: ${output}`);
  }
}
