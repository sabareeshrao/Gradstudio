import path from "node:path";

const RANK = Object.freeze({ "no-change": -1, routine: 0, structural: 1, "high-risk": 2 });

const ROUTINE_CONFIG = new Set([
  "static/ui-config/footer.json",
  "static/ui-config/home.json",
  "static/ui-config/navigation.json",
  "static/ui-config/site.json",
  "static/ui-config/theme.json"
]);

const HIGH_RISK_STATIC = [
  /^static\/Admin\.html$/i,
  /^static\/admin-(?:edit|security)\.html$/i,
  /^static\/gradstudio-learn-admin\.(?:html|js)$/i,
  /^static\/login\.html$/i
];

export function classifyUiChanges(changedPaths) {
  if (!Array.isArray(changedPaths)) throw new TypeError("changedPaths must be an array");

  const files = [...new Set(changedPaths.map(normalizeChangedPath).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
    .map((file) => ({ path: file, ...classifyPath(file) }));

  const classification = files.reduce(
    (highest, file) => RANK[file.classification] > RANK[highest] ? file.classification : highest,
    "no-change"
  );
  const routineCandidate = classification === "routine" && files.length > 0;

  return {
    schemaVersion: 1,
    classification,
    routineCandidate,
    productionDeploymentAuthorized: false,
    productionApproval: classification === "high-risk"
      ? "explicit-founder-production-approval-required"
      : classification === "structural"
        ? "structural-release-policy-required"
        : routineCandidate
          ? "eligible-only-after-initial-cutover-and-protected-policy-enable"
          : "not-applicable",
    requiredGates: gatesFor(classification),
    files
  };
}

export function normalizeChangedPath(value) {
  if (typeof value !== "string") throw new TypeError("changed path must be a string");
  const normalized = value.trim().replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized) return "";
  if (path.posix.isAbsolute(normalized) || normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error(`Changed path escapes repository: ${value}`);
  }
  return normalized;
}

function classifyPath(file) {
  if (file.startsWith("worker/")) return highRisk("application Worker, binding, schema, API, or security boundary");
  if (file.startsWith(".github/")) return highRisk("workflow or repository automation policy");
  if (/^deploy-(?:dev|prod)\.(?:ps1|sh)$/i.test(file)) return highRisk("deployment helper");
  if (file.startsWith("scripts/") && !file.startsWith("scripts/ui/")) return highRisk("operational or data-mutation utility");
  if (HIGH_RISK_STATIC.some((pattern) => pattern.test(file))) return highRisk("authentication or administration surface");

  if (ROUTINE_CONFIG.has(file)) return routine("schema-bounded prompt configuration");
  if (file === "static/ui-config/generated/ui-config.runtime.js") return routine("deterministic generated configuration");
  if (file === "static/gradstudio-learn-demo.html") return routine("deterministic generated compatibility preview");
  if (file.startsWith("static/fonts/")) return routine("bundled public font asset and license");
  if (file.startsWith("static/") && /\.(?:avif|gif|ico|jpe?g|png|svg|webp|woff2?)$/i.test(file)) {
    return routine("public UI asset");
  }

  if (file === "static/ui-config/registry.json" || file.startsWith("static/ui-config/schemas/")) {
    return structural("registry or configuration contract");
  }
  if (file.startsWith("static/ui-config/") || file.startsWith("static/")) return structural("application UI source");
  if (file.startsWith("docs/ui/") || file.startsWith("scripts/ui/") || file.startsWith("tests/ui/")) {
    return structural("UI ownership, validation, or test infrastructure");
  }
  if ([".gitignore", "AGENTS.md", "README.md", "package.json", "package-lock.json", "playwright.config.mjs"].includes(file)) {
    return structural("application instructions or locked UI toolchain");
  }

  return highRisk("path is outside the registered UI administration boundary");
}

function routine(reason) {
  return { classification: "routine", reason, automaticProductionCandidate: true };
}

function structural(reason) {
  return { classification: "structural", reason, automaticProductionCandidate: false };
}

function highRisk(reason) {
  return { classification: "high-risk", reason, automaticProductionCandidate: false };
}

function gatesFor(classification) {
  if (classification === "routine") return [
    "ui-validation",
    "desktop-tablet-mobile-browser-tests",
    "visual-regression",
    "protected-routine-deployment-policy-after-initial-cutover"
  ];
  if (classification === "structural") return [
    "ui-validation",
    "desktop-tablet-mobile-browser-tests",
    "visual-regression",
    "component-inventory-review",
    "structural-release-policy"
  ];
  if (classification === "high-risk") return [
    "full-security-validation",
    "ui-validation-when-applicable",
    "explicit-founder-production-approval"
  ];
  return [];
}
