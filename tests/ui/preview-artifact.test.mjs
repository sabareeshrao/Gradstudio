import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "../..");
const manifestPath = path.join(root, "dist", "ui-preview", "release-manifest.json");

test("preview artifact is reproducible, revision-labeled, and content-addressed", () => {
  build();
  const first = fs.readFileSync(manifestPath, "utf8");
  build();
  const second = fs.readFileSync(manifestPath, "utf8");
  assert.equal(first, second);

  const manifest = JSON.parse(first);
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  assert.equal(manifest.sourceRevision, process.env.GITHUB_SHA || head);
  assert.equal(manifest.entrypoint, "index.html");
  assert.equal(manifest.fileCount, manifest.files.length);
  assert.deepEqual(manifest.files.map((file) => file.path), [...manifest.files.map((file) => file.path)].sort((a, b) => a.localeCompare(b, "en")));

  for (const file of manifest.files) {
    const target = path.join(root, "dist", "ui-preview", ...file.path.split("/"));
    const bytes = fs.readFileSync(target);
    assert.equal(bytes.length, file.size, file.path);
    assert.equal(sha256(bytes), file.sha256, file.path);
  }

  const expectedDigest = sha256(manifest.files.map((file) => `${file.path}\0${file.sha256}\0${file.size}`).join("\n"));
  assert.equal(manifest.releaseDigest, expectedDigest);
});

function build() {
  execFileSync(process.execPath, ["scripts/ui/build-preview-artifact.mjs"], { cwd: root, stdio: "pipe" });
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
