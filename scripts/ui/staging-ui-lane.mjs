import { execFileSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";
import fs from "node:fs";

export const COPY_FIELDS = Object.freeze({
  "static/ui-config/home.json": ["hero.title", "hero.heading", "hero.subheading", "hero.primaryAction.label", "hero.secondaryAction.label", "hero.featureAlt"],
  "static/ui-config/footer.json": ["description", "copyright"]
});
export const GENERATED = "static/ui-config/generated/ui-config.runtime.js";

function copyFieldsRemoved(value, fields) {
  const copy = structuredClone(value);
  for (const field of fields) {
    const parts = field.split(".");
    const key = parts.pop();
    let parent = copy;
    for (const part of parts) {
      if (!parent || typeof parent !== "object" || !Object.hasOwn(parent, part)) throw new Error("Missing copy parent");
      parent = parent[part];
    }
    if (!parent || typeof parent[key] !== "string" || !parent[key].trim()) throw new Error("Invalid copy value");
    delete parent[key];
  }
  return copy;
}

// Only ordinary file modifications of explicitly allowlisted text fields.
// Unknown, deleted, added, renamed, mode-changed, empty and mixed diffs take full validation.
export function selectLane(records, readJson) {
  try {
    if (!records.length || !records.every(r => r.status === "M" && r.oldMode === "100644" && r.newMode === "100644")) return "full";
    const files = new Set(records.map(r => r.path));
    if (files.size !== records.length || !files.has(GENERATED)) return "full";
    const configs = [...files].filter(file => file !== GENERATED);
    if (!configs.length || configs.some(file => !Object.hasOwn(COPY_FIELDS, file))) return "full";
    for (const file of configs) {
      const before = readJson(file, "base"), after = readJson(file, "head");
      if (isDeepStrictEqual(before, after)) return "full";
      if (!isDeepStrictEqual(copyFieldsRemoved(before, COPY_FIELDS[file]), copyFieldsRemoved(after, COPY_FIELDS[file]))) return "full";
    }
    return "copy";
  } catch { return "full"; }
}

export function classifyGit(base, head, git = (...args) => execFileSync("git", args, { encoding: "utf8" })) {
  try {
    if (![base, head].every(x => /^[0-9a-f]{40}$/.test(x) && !/^0+$/.test(x))) return "full";
    git("merge-base", "--is-ancestor", base, head);
    // PR checkout can be a synthetic merge. Require exactly the same tested tree.
    git("diff", "--quiet", "HEAD", head);
    const raw = git("diff", "--raw", "--no-renames", "-z", base, head).split("\0");
    if (raw.pop() !== "" || raw.length % 2) return "full";
    const records = [];
    for (let i=0; i<raw.length; i+=2) {
      const m = raw[i].match(/^:(\d{6}) (\d{6}) [0-9a-f]+ [0-9a-f]+ ([A-Z])$/);
      if (!m) return "full";
      records.push({oldMode:m[1],newMode:m[2],status:m[3],path:raw[i+1]});
    }
    return selectLane(records, (file, rev) => JSON.parse(git("show", (rev === "base" ? base : head) + ":" + file)));
  } catch { return "full"; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = classifyGit(process.env.UI_BASE_SHA, process.env.UI_HEAD_SHA);
  console.log("Staging UI validation lane: " + result);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, "lane=" + result + "\n");
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, "\nStaging UI validation lane: **" + result + "**. Production authorization: none.\n");
}
