import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildComponentInventory } from "../../scripts/ui/build-component-inventory.mjs";

test("component inventory artifact is deterministic, complete, and revision-labeled", (context) => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gradstudio-ui-inventory-"));
  context.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));
  const firstOutput = path.join(temporaryRoot, "first");
  const secondOutput = path.join(temporaryRoot, "second");
  const first = buildComponentInventory({ outputRoot: firstOutput, sourceRevision: "test-revision" });
  const second = buildComponentInventory({ outputRoot: secondOutput, sourceRevision: "test-revision" });

  assert.deepEqual(first, second);
  assert.equal(first.componentCount, 40);
  assert.equal(first.sourceRevision, "test-revision");
  assert.match(first.inventoryDigest, /^[a-f0-9]{64}$/);
  assert.equal(first.counts.riskClass.routine, 6);
  assert.equal(first.counts.riskClass["high-risk"], 10);
  assert.deepEqual(first.files.map((file) => file.path), [...first.files.map((file) => file.path)].sort());

  for (const file of first.files) {
    assert.equal(
      fs.readFileSync(path.join(firstOutput, file.path), "utf8"),
      fs.readFileSync(path.join(secondOutput, file.path), "utf8")
    );
  }
  assert.equal(
    fs.readFileSync(path.join(firstOutput, "inventory-manifest.json"), "utf8"),
    fs.readFileSync(path.join(secondOutput, "inventory-manifest.json"), "utf8")
  );
  assert.throws(
    () => buildComponentInventory({ outputRoot: path.resolve("."), sourceRevision: "unsafe" }),
    /must stay inside repository dist or the system temporary directory/
  );
});
