import { test, expect } from "@playwright/test";
test("lesson zoom changes only iframe viewport, preserves state and keeps controls available", async ({page}) => {
  await page.route("**/*",route=>{const url=new URL(route.request().url());return url.origin==="http://127.0.0.1:4173"&&!url.pathname.startsWith("/api/")?route.continue():route.abort();});
  await page.goto("/?demoFallback=1");
  await page.locator("[data-component-id='catalog.course-card']").first().click();
  await page.locator("[data-start-learning]").click();
  const frame=page.locator(".lesson-frame"), shell=page.locator(".player-frame-shell");
  const toolbar=page.locator(".player-toolbar"), sidebar=page.locator(".player-sidebar");
  const minus=page.getByRole("button",{name:"Zoom out lesson"}), plus=page.getByRole("button",{name:"Zoom in lesson"}), reset=page.getByRole("button",{name:"Reset lesson zoom to 100%"});
  await expect(reset).toHaveText("100%");
  const before=await frame.evaluate(n=>({width:n.offsetWidth,height:n.offsetHeight,src:n.getAttribute("src"),srcdoc:n.getAttribute("srcdoc"),sandbox:n.getAttribute("sandbox")}));
  const original=await frame.elementHandle();
  const toolbarBox=await toolbar.boundingBox(), sidebarBox=await sidebar.boundingBox(), shellBox=await shell.boundingBox();
  const headerLayout=await toolbar.evaluate(n=>{
    const back=n.querySelector(".player-back-link"), title=n.querySelector("h1"), actions=n.querySelector(".player-toolbar-actions");
    return {backHeight:back.offsetHeight,small:matchMedia("(max-width: 820px)").matches,wide:matchMedia("(min-width: 1280px)").matches,titleAlign:getComputedStyle(title).textAlign,backY:back.getBoundingClientRect().y+back.getBoundingClientRect().height/2,actionsY:actions.getBoundingClientRect().y+actions.getBoundingClientRect().height/2};
  });
  expect(headerLayout.backHeight).toBe(headerLayout.small?38:42);
  expect(headerLayout.titleAlign).toBe("center");
  if(headerLayout.wide) expect(Math.abs(headerLayout.backY-headerLayout.actionsY)).toBeLessThanOrEqual(2);
  const fullscreenBox=await page.locator("[data-fullscreen]").boundingBox();
  const zoomBox=await page.locator(".player-zoom-controls").boundingBox();
  const dimensions=await page.locator("[data-fullscreen]").evaluate(n=>({height:n.offsetHeight,width:n.offsetWidth,small:matchMedia("(max-width: 820px)").matches}));
  expect(dimensions.height).toBe(dimensions.small?38:44);
  expect(dimensions.width).toBeGreaterThanOrEqual(dimensions.small?104:132);
  const gap=zoomBox.x-(fullscreenBox.x+fullscreenBox.width);
  expect(gap).toBeGreaterThanOrEqual(0);
  expect(gap).toBeLessThanOrEqual(12);
  expect(Math.abs(zoomBox.y-fullscreenBox.y)).toBeLessThanOrEqual(2);
  await plus.click(); await expect(reset).toHaveText("110%");
  await expect.poll(()=>frame.evaluate(n=>n.offsetWidth)).toBeLessThan(before.width);
  await expect.poll(()=>frame.evaluate(n=>n.offsetHeight)).toBeLessThan(before.height);
  expect(await toolbar.boundingBox()).toEqual(toolbarBox); expect(await sidebar.boundingBox()).toEqual(sidebarBox); expect(await shell.boundingBox()).toEqual(shellBox);
  expect(await original.evaluate(n=>n===document.querySelector(".lesson-frame"))).toBe(true);
  expect(await frame.evaluate(n=>({src:n.getAttribute("src"),srcdoc:n.getAttribute("srcdoc"),sandbox:n.getAttribute("sandbox")}))).toEqual({src:before.src,srcdoc:before.srcdoc,sandbox:before.sandbox});
  for(let i=0;i<9;i++) await plus.click(); await expect(reset).toHaveText("200%"); await expect(plus).toBeDisabled();
  await reset.click(); await expect(reset).toHaveText("100%");
  for(let i=0;i<5;i++) await minus.click(); await expect(reset).toHaveText("50%"); await expect(minus).toBeDisabled();
  await reset.focus(); await page.keyboard.press("Enter"); await expect(reset).toHaveText("100%");
  await expect.poll(()=>frame.evaluate(n=>n.offsetWidth)).toBe(before.width);
  await original.dispose();
});


for (const fallback of [false, true]) {
  test("content-only fullscreen preserves the iframe and restores toolbar ("+(fallback?"viewport fallback":"native")+")", async ({page})=>{
    await page.route("**/*",route=>{const url=new URL(route.request().url());return url.origin==="http://127.0.0.1:4173"&&!url.pathname.startsWith("/api/")?route.continue():route.abort();});
    await page.goto("/?demoFallback=1");
    await page.locator("[data-component-id='catalog.course-card']").first().click();
    await page.locator("[data-start-learning]").click();
    const main=page.locator(".player-main"), toolbar=page.locator(".player-toolbar"), frame=page.locator(".lesson-frame");
    const enter=page.locator("[data-fullscreen]"), exit=page.getByRole("button",{name:"Exit fullscreen"});
    const original=await frame.elementHandle(), child=await original.contentFrame();
    await child.locator("body").waitFor();
    await child.evaluate(()=>{window.__fullscreenProof=42;});
    const sandbox=await frame.getAttribute("sandbox");
    await page.getByRole("button",{name:"Zoom in lesson"}).click();
    if(fallback) await main.evaluate(el=>{el.requestFullscreen=()=>Promise.reject(new Error("unsupported"));});
    await enter.click();
    await expect(main).toHaveClass(/is-lesson-fullscreen/);
    await expect(toolbar).toBeHidden();
    await expect(exit).toBeVisible();
    const rect=await main.boundingBox(), viewport=page.viewportSize();
    expect(Math.abs(rect.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(rect.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(rect.width-viewport.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(rect.height-viewport.height)).toBeLessThanOrEqual(2);
    expect(await original.evaluate(n=>n===document.querySelector(".lesson-frame"))).toBe(true);
    expect(await child.evaluate(()=>window.__fullscreenProof)).toBe(42);
    expect(await frame.getAttribute("sandbox")).toBe(sandbox);
    await exit.click();
    await expect(toolbar).toBeVisible();
    await expect(page.getByRole("button",{name:"Reset lesson zoom to 100%"})).toHaveText("110%");
    await expect(exit).toBeHidden();
    expect(await child.evaluate(()=>window.__fullscreenProof)).toBe(42);
    await original.dispose();
  });
}
