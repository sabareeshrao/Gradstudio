import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { classifyUiChanges } from "./change-classification.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const options = parseArguments(process.argv.slice(2));
const changedPaths = options.files.length
  ? options.files
  : changedPathsFromGit(options.base, options.head);
const result = {
  ...classifyUiChanges(changedPaths),
  comparedRevisions: options.files.length ? null : { base: options.base, head: options.head }
};
const serialized = `${JSON.stringify(result, null, 2)}\n`;

if (options.output) {
  const output = path.resolve(options.output);
  const distRoot = path.join(repositoryRoot, "dist");
  if (!output.startsWith(`${distRoot}${path.sep}`)) {
    throw new Error(`Classification output must stay inside repository dist: ${output}`);
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, serialized);
}

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderSummary(result));
}

process.stdout.write(serialized);

function parseArguments(args) {
  const parsed = { base: "", head: "", output: "", files: [] };
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    const value = args[index + 1];
    if (["--base", "--head", "--output", "--file"].includes(key) && !value) throw new Error(`${key} requires a value`);
    if (key === "--base") parsed.base = value;
    else if (key === "--head") parsed.head = value;
    else if (key === "--output") parsed.output = value;
    else if (key === "--file") parsed.files.push(value);
    else throw new Error(`Unsupported argument: ${key}`);
    index += 1;
  }
  if (!parsed.files.length && (!parsed.base || !parsed.head)) {
    throw new Error("Provide at least one --file or both --base and --head");
  }
  return parsed;
}

function changedPathsFromGit(base, head) {
  validateRevision(base);
  validateRevision(head);
  if (/^0+$/.test(base)) {
    return lines(execFileSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", head], { encoding: "utf8" }));
  }
  return lines(execFileSync("git", ["diff", "--name-only", base, head], { encoding: "utf8" }));
}

function validateRevision(value) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_./^~-]*$/.test(value)) throw new Error(`Unsafe Git revision: ${value}`);
}

function lines(value) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function renderSummary(result) {
  const fileRows = result.files.map((file) => `| \`${file.path}\` | ${file.classification} | ${file.reason} |`).join("\n");
  return [
    "## Application UI change classification",
    "",
    `**Result:** ${result.classification}`,
    "",
    `**Routine candidate:** ${result.routineCandidate ? "yes" : "no"}`,
    "",
    "Production deployment remains unauthorized by classification alone.",
    "",
    "| Path | Class | Reason |",
    "|---|---|---|",
    fileRows || "| _none_ | no-change | No changed paths |",
    ""
  ].join("\n");
}
