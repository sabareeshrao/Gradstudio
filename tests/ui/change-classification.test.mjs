import test from "node:test";
import assert from "node:assert/strict";
import { classifyUiChanges, normalizeChangedPath } from "../../scripts/ui/change-classification.mjs";

test("schema-bounded configuration and generated output are routine candidates", () => {
  const result = classifyUiChanges([
    "static/ui-config/navigation.json",
    "static/ui-config/generated/ui-config.runtime.js",
    "static/gradstudio-learn-demo.html"
  ]);
  assert.equal(result.classification, "routine");
  assert.equal(result.routineCandidate, true);
  assert.equal(result.productionDeploymentAuthorized, false);
  assert.match(result.productionApproval, /initial-cutover/);
});

test("direct UI source and registry changes are structural", () => {
  const result = classifyUiChanges(["static/index.html", "static/ui-config/registry.json"]);
  assert.equal(result.classification, "structural");
  assert.equal(result.routineCandidate, false);
  assert.ok(result.requiredGates.includes("component-inventory-review"));
});

test("authentication, Worker, workflow, and deployment paths are high risk", () => {
  for (const file of ["static/login.html", "worker/src/index.js", ".github/workflows/ui-ci.yml", "deploy-prod.sh"]) {
    const result = classifyUiChanges([file]);
    assert.equal(result.classification, "high-risk", file);
    assert.equal(result.productionApproval, "explicit-founder-production-approval-required", file);
  }
});

test("mixed changes take the highest risk without becoming auto-deployable", () => {
  const result = classifyUiChanges(["static/ui-config/home.json", "scripts/run_sync.js"]);
  assert.equal(result.classification, "high-risk");
  assert.equal(result.routineCandidate, false);
  assert.ok(result.files.every((file) => file.automaticProductionCandidate === (file.classification === "routine")));
});

test("unknown repository paths fail closed as high risk", () => {
  const result = classifyUiChanges(["unregistered/new-surface.txt"]);
  assert.equal(result.classification, "high-risk");
  assert.match(result.files[0].reason, /outside the registered UI administration boundary/);
});

test("paths are normalized, deduplicated, sorted, and cannot escape the repository", () => {
  const result = classifyUiChanges(["static\\ui-config\\theme.json", "./static/ui-config/home.json", "static/ui-config/theme.json"]);
  assert.deepEqual(result.files.map((file) => file.path), ["static/ui-config/home.json", "static/ui-config/theme.json"]);
  assert.equal(normalizeChangedPath("static\\fonts\\inter.woff2"), "static/fonts/inter.woff2");
  assert.throws(() => normalizeChangedPath("../secret.txt"), /escapes repository/);
});
