import http from 'node:http';
import { test, expect } from '@playwright/test';

const APP_ORIGIN = 'http://127.0.0.1:4173';
let contentServer;
let contentOrigin;

const hostileScript = `
(async () => {
  const result = {};
  try { result.parentDom = Boolean(parent.document.body); } catch { result.parentDom = false; }
  try { result.parentStorage = parent.localStorage.getItem('gradstudio_sandbox_secret'); } catch { result.parentStorage = null; }
  try { result.parentCookie = parent.document.cookie; } catch { result.parentCookie = null; }
  try { result.parentFetch = typeof parent.fetch === 'function'; } catch { result.parentFetch = false; }
  try {
    const response = await fetch('${APP_ORIGIN}/api/health', { credentials: 'include' });
    result.privilegedApi = response.ok;
  } catch { result.privilegedApi = false; }
  parent.postMessage({ type: 'gradstudio-sandbox-probe', result }, '*');
})();
`;

test.beforeAll(async () => {
  contentServer = http.createServer((request, response) => {
    if (request.url === '/attack.js') {
      response.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(hostileScript);
      return;
    }
    if (request.url === '/hostile.html') {
      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': `sandbox allow-scripts allow-forms; default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'none'; frame-src 'none'; child-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${APP_ORIGIN}`,
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), clipboard-read=(), clipboard-write=()',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store'
      });
      response.end('<!doctype html><html lang="en"><head><title>Hostile synthetic simulation</title></head><body><main>Sandbox probe</main><script src="/attack.js"></script></body></html>');
      return;
    }
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('not found');
  });
  await new Promise((resolve, reject) => {
    contentServer.once('error', reject);
    contentServer.listen(0, '127.0.0.1', resolve);
  });
  const address = contentServer.address();
  contentOrigin = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  if (contentServer) await new Promise(resolve => contentServer.close(resolve));
});

test('hostile synthetic simulation cannot read app state or call the app API', async ({ page }) => {
  await page.goto('/?demoFallback=1');
  await page.evaluate(() => {
    localStorage.setItem('gradstudio_sandbox_secret', 'must-not-cross-origin');
    document.cookie = 'gradstudio_sandbox_cookie=must-not-cross-origin; SameSite=Lax';
    window.__gradstudioSandboxResult = null;
    window.addEventListener('message', event => {
      if (event.data?.type === 'gradstudio-sandbox-probe') window.__gradstudioSandboxResult = event.data.result;
    }, { once: true });
  });

  await page.evaluate(source => {
    const iframe = document.createElement('iframe');
    iframe.id = 'hostile-content-frame';
    iframe.title = 'Hostile synthetic simulation isolation test';
    iframe.setAttribute('sandbox', 'allow-scripts allow-forms');
    iframe.src = source;
    document.body.append(iframe);
  }, `${contentOrigin}/hostile.html`);

  await expect(page.locator('#hostile-content-frame')).toHaveAttribute('sandbox', 'allow-scripts allow-forms');
  await expect.poll(() => page.evaluate(() => window.__gradstudioSandboxResult)).not.toBeNull();
  const result = await page.evaluate(() => window.__gradstudioSandboxResult);
  expect(result).toEqual({
    parentDom: false,
    parentStorage: null,
    parentCookie: null,
    parentFetch: false,
    privilegedApi: false
  });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('gradstudio_sandbox_secret'))).toBe('must-not-cross-origin');
  expect(await page.evaluate(() => document.cookie)).toContain('gradstudio_sandbox_cookie=must-not-cross-origin');
});
