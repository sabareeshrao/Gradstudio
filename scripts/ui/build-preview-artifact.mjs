import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourceRoot = path.join(repositoryRoot, "static");
const outputRoot = path.join(repositoryRoot, "dist", "ui-preview");
const sourceRevision = process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: repositoryRoot,
  encoding: "utf8"
}).trim();

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });

const files = [];
walk(sourceRoot);
files.sort((left, right) => left.path.localeCompare(right.path, "en"));

const releaseDigest = sha256(files.map((file) => `${file.path}\0${file.sha256}\0${file.size}`).join("\n"));
const manifest = {
  schemaVersion: 1,
  sourceRepository: "sabareeshrao/Gradstudio",
  sourceRevision,
  entrypoint: "index.html",
  fileCount: files.length,
  releaseDigest,
  files
};

fs.writeFileSync(path.join(outputRoot, "release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`UI preview built: ${files.length} files, digest ${releaseDigest}, revision ${sourceRevision}.`);

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const source = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Refusing symbolic link in UI preview source: ${path.relative(sourceRoot, source)}`);
    if (entry.isDirectory()) {
      walk(source);
      continue;
    }
    if (!entry.isFile()) continue;

    const relative = path.relative(sourceRoot, source).split(path.sep).join("/");
    const destination = path.join(outputRoot, ...relative.split("/"));
    const bytes = fs.readFileSync(source);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes);
    files.push({ path: relative, size: bytes.length, sha256: sha256(bytes) });
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
