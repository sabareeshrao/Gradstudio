import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
const home = JSON.parse(fs.readFileSync(new URL("../../../static/ui-config/home.json", import.meta.url),"utf8"));
const footer = JSON.parse(fs.readFileSync(new URL("../../../static/ui-config/footer.json", import.meta.url),"utf8"));
const baseline=JSON.parse(fs.readFileSync(new URL("../accessibility-baseline.json", import.meta.url),"utf8"));

test("actual routine copy renders without layout or accessibility regressions",async ({page},testInfo)=>{
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/*",route=>{
    const url=new URL(route.request().url());
    return url.origin==="http://127.0.0.1:4173" && !url.pathname.startsWith("/api/") ? route.continue() : route.abort();
  });
  await page.goto("/?demoFallback=1");
  await expect.poll(()=>page.evaluate(()=>window.__GRADSTUDIO_UI_CONFIG_APPLIED__)).toBe(1);
  await expect(page.locator("[data-component-id='catalog.course-card']").first()).toBeVisible();
  for(const [selector,value] of [
    ["#heroTitle",home.hero.title],[".hero-heading",home.hero.heading],[".hero-subheading",home.hero.subheading],
    [".hero-actions .primary-action",home.hero.primaryAction.label],[".hero-actions .secondary-action",home.hero.secondaryAction.label],
    ["[data-ui-footer-description]",footer.description],["[data-ui-footer-copyright]",footer.copyright]
  ]){
    const el=page.locator(selector);
    await expect(el).toHaveText(value);
    await expect(el).toBeVisible();
    expect(await el.evaluate(n=>n.scrollWidth<=n.clientWidth+2),selector+" horizontal overflow").toBe(true);
  }
  await expect(page.locator("[data-component-id='home.hero-feature']")).toHaveAttribute("aria-label",home.hero.featureAlt);
  await expect(page.locator(".hero-actions .primary-action")).toHaveAttribute("href",home.hero.primaryAction.href);
  await expect(page.locator(".hero-actions .secondary-action")).toHaveAttribute("href",home.hero.secondaryAction.href);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBe(true);
  const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa"]).analyze();
  const observed=result.violations.filter(v=>["serious","critical"].includes(v.impact)).flatMap(v=>v.nodes.map(n=>v.id+"::"+String(n.target[0]).replace(/article\[data-component-instance="[^"]+"\]/g,'article[data-component-id="catalog.course-card"]')));
  expect(observed.filter(x=>!baseline.allowedSeriousTargets.includes(x))).toEqual([]);
  await page.screenshot({path:testInfo.outputPath("routine-copy.png"),fullPage:true,animations:"disabled"});
  await page.locator("[data-nav-about]").first().click();
  await expect(page.locator("#infoPage h1")).toContainText("About");
  await page.locator("[data-auth-open='signup']").first().click();
  await expect(page.locator("#authPage form")).toBeVisible();
  expect(errors).toEqual([]);
});
