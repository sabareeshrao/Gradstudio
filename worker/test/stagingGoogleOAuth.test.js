import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { verifyStagingGoogleAccessToken } from '../src/utils/stagingGoogleOAuth.js';

const clientId = 'synthetic-client.apps.googleusercontent.com';
const valid = () => ({ aud: clientId, azp: clientId, exp: String(Math.floor(Date.now()/1000)+600), sub: 'test-subject', email: 'TEST@example.com', email_verified: 'true' });
const mock = claims => async () => new Response(JSON.stringify(claims), { status: 200 });
test('staging Google token accepts only a verified matching client and identity', async () => {
  const result = await verifyStagingGoogleAccessToken('synthetic-token', clientId, async (url, options) => {
    assert.equal(url.origin, 'https://oauth2.googleapis.com');
    assert.equal(url.pathname, '/tokeninfo');
    assert.equal(url.searchParams.get('access_token'), 'synthetic-token');
    assert.equal(options.redirect, 'error');
    return mock(valid())();
  });
  assert.deepEqual(result, { sub: 'test-subject', email: 'test@example.com' });
});
test('staging Google token rejects wrong audience, presenter, expiry and unverified identity', async () => {
  for (const patch of [{aud:'wrong'}, {azp:'wrong'}, {azp:undefined}, {exp:'0'}, {exp:'bad'}, {email_verified:false}, {email_verified:undefined}, {sub:''}, {email:''}]) {
    await assert.rejects(verifyStagingGoogleAccessToken('synthetic-token', clientId, mock({...valid(), ...patch})), /Google token verification failed/);
  }
});
test('staging Google token fails closed on missing configuration and provider failure', async () => {
  await assert.rejects(verifyStagingGoogleAccessToken('synthetic-token', '', async () => assert.fail('must not fetch')), /not configured/);
  await assert.rejects(verifyStagingGoogleAccessToken('synthetic-token', clientId, async () => new Response('', {status:401})), /Google token verification failed/);
  await assert.rejects(verifyStagingGoogleAccessToken('synthetic-token', clientId, async () => {throw new Error('synthetic-token')}), {message:'Google token verification failed'});
});
test('staging browser and Worker use same client; legacy browser client is unchanged', () => {
  const browser = fs.readFileSync(new URL('../../static/gradstudio-learn-demo.js', import.meta.url), 'utf8');
  const template = fs.readFileSync(new URL('../wrangler.staging.example.toml', import.meta.url), 'utf8');
  const stagingId = template.match(/^GOOGLE_OAUTH_CLIENT_ID = "([^"]+)"$/m)?.[1];
  assert.ok(stagingId);
  assert.notEqual(stagingId, '506619320686-uhlmttc48vj7osbolv8ragqkfs1v4l70.apps.googleusercontent.com');
  assert.ok(browser.includes('window.location.origin === "https://gradstudio-app-staging.gradstudio-non-production.workers.dev"\n        ? "' + stagingId + '"\n        : "506619320686-uhlmttc48vj7osbolv8ragqkfs1v4l70.apps.googleusercontent.com"'));
});
