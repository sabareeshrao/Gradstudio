import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";

const accessibilityBaseline = JSON.parse(fs.readFileSync(new URL("../accessibility-baseline.json", import.meta.url), "utf8"));

test.beforeEach(async ({ page }) => {
  await page.route("https://accounts.google.com/**", (route) => route.abort());
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await page.route("https://api.gradstudio.org/**", (route) => route.fulfill({ status: 503, body: "offline preview" }));
  await page.route("https://learning-platform-api-dev.sabareeshrao.workers.dev/**", (route) => route.fulfill({ status: 503, body: "offline preview" }));
});

test("home, catalog, information and authentication routes remain usable", async ({ page }) => {
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) runtimeErrors.push(`console: ${message.text()}`);
  });
  await page.goto("/?demoFallback=1");
  await expect(page.locator("[data-component-id='site.shell']")).toBeVisible();
  await expect(page.locator("[data-component-id='home.hero']")).toBeVisible();
  await expect(page.locator("[data-component-id='catalog.course-card']").first()).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-feature-pinned-learning", "true");
  await expect.poll(() => page.evaluate(() => window.__GRADSTUDIO_UI_CONFIG_APPLIED__)).toBe(1);

  await page.getByRole("link", { name: "About" }).first().click();
  await expect(page.locator("#infoPage")).toBeVisible();
  await expect(page.locator("#infoPage h1")).toContainText("About");

  await page.locator("[data-auth-open='signup']").first().click();
  await expect(page.locator("#authPage")).toBeVisible();
  await expect(page.locator("#authPage form")).toBeVisible();

  await page.locator("[data-nav-home]").first().click();
  await expect(page.locator("#home")).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("course detail and player expose deterministic component hooks", async ({ page }) => {
  await page.goto("/?demoFallback=1");
  const card = page.locator("[data-component-id='catalog.course-card']").first();
  await card.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-component-id='course.detail']")).toBeVisible();
  await expect(page.locator("[data-component-id='course.detail-section']").first()).toBeVisible();
  await page.locator("[data-start-learning]").click();
  await expect(page.locator("[data-component-id='course.player']")).toBeVisible();
  await expect(page.locator("[data-component-id='course.player-section']").first()).toBeVisible();
  await expect(page.locator("[data-component-id='course.simulation-frame']")).toBeVisible();
});

test("signed-in account, pinned learning and footer interactions remain reachable", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("lp_auth_token", "synthetic-browser-test-token");
    localStorage.setItem("gradstudio_user", JSON.stringify({ display_name: "Test Learner", email: "learner@example.test" }));
  });
  await page.goto("/?demoFallback=1");
  const trigger = page.locator("[data-account-menu-trigger]");
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.locator("[data-component-id='account.menu'] [data-account-menu]")).toBeVisible();
  await page.getByRole("menuitem", { name: /My learning/ }).click();
  await expect(page.locator("[data-component-id='account.pinned-view']")).toBeVisible();
  await expect(page.locator("[data-component-id='site.footer']")).toBeVisible();
  await page.locator("[data-component-id='site.footer'] [data-nav-contact]").click();
  await expect(page.locator("#infoPage h1")).toContainText("Questions, feedback, or support");
});

test("canonical home adds no serious accessibility violations beyond the recorded baseline", async ({ page }) => {
  await page.goto("/?demoFallback=1");
  await expect(page.locator("[data-component-id='catalog.course-grid']")).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
  const observed = new Set(serious.flatMap((violation) => violation.nodes.map((node) => {
    const target = String(node.target[0]).replace(/article\[data-component-instance="[^"]+"\]/g, 'article[data-component-id="catalog.course-card"]');
    return `${violation.id}::${target}`;
  })));
  const allowed = new Set(accessibilityBaseline.allowedSeriousTargets);
  const regressions = [...observed].filter((key) => !allowed.has(key));
  expect(regressions, `New serious/critical axe targets:\n${regressions.join("\n")}`).toEqual([]);
});

test("canonical home visual baseline", async ({ page }) => {
  await page.goto("/?demoFallback=1");
  await expect(page.locator("[data-component-id='catalog.course-card']").first()).toBeVisible();
  await expect(page).toHaveScreenshot("canonical-home.png", { fullPage: true });
});

test("canonical route component baselines", async ({ page }) => {
  await page.goto("/?demoFallback=1");

  await page.getByRole("link", { name: "About" }).first().click();
  await expect(page.locator("#infoPage")).toHaveScreenshot("info-about.png");

  await page.locator("[data-auth-open='signup']").first().click();
  await expect(page.locator("#authPage")).toHaveScreenshot("auth-signup.png");

  await page.locator("[data-nav-home]").first().click();
  await page.locator("[data-component-id='catalog.course-card']").first().click();
  await expect(page.locator("[data-component-id='course.detail']")).toHaveScreenshot("course-detail.png");

  await page.locator("[data-start-learning]").click();
  await expect(page.locator("[data-component-id='course.player']")).toHaveScreenshot("course-player.png");
});
