import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generateKeyPair, SignJWT } from 'jose';
import { verifyStagingGoogleIdToken } from '../src/utils/stagingGoogleOAuth.js';

const clientId = 'synthetic-client.apps.googleusercontent.com';
const { publicKey, privateKey } = await generateKeyPair('RS256');
const foreign = await generateKeyPair('RS256');
const now = () => Math.floor(Date.now()/1000);
const valid = () => ({ iss:'https://accounts.google.com', aud:clientId, exp:now()+600, iat:now(), sub:'test-subject', email:'TEST@example.com', email_verified:true, name:'Test User' });
const sign = (patch = {}, key = privateKey) => new SignJWT({...valid(), ...patch}).setProtectedHeader({alg:'RS256'}).sign(key);
test('accept a correctly signed Google identity with matching client', async () => {
  assert.deepEqual(await verifyStagingGoogleIdToken(await sign(), clientId, publicKey), {sub:'test-subject',email:'test@example.com',displayName:'Test User'});
});
test('reject wrong issuer, audience, presenter, expired or unverified claims and invalid signature', async () => {
  for (const patch of [{iss:'https://example.com'},{aud:'wrong'},{aud:[clientId,'wrong']},{azp:'wrong'},{exp:now()-60},{iat:now()-7200},{email_verified:false},{sub:''},{email:'invalid'}]) {
    await assert.rejects(verifyStagingGoogleIdToken(await sign(patch), clientId, publicKey), /Google ID token verification failed/);
  }
  await assert.rejects(verifyStagingGoogleIdToken(await sign({},foreign.privateKey),clientId,publicKey), /verification failed/);
  await assert.rejects(verifyStagingGoogleIdToken('synthetic-access-token',clientId,publicKey), /verification failed/);
  await assert.rejects(verifyStagingGoogleIdToken(await sign(),'',publicKey), /not configured/);
});
test('staging browser and Worker use the same client; legacy browser client is unchanged', () => {
  const browser = fs.readFileSync(new URL('../../static/gradstudio-learn-demo.js', import.meta.url), 'utf8');
  const template = fs.readFileSync(new URL('../wrangler.staging.example.toml', import.meta.url), 'utf8');
  const stagingId = template.match(/^GOOGLE_OAUTH_CLIENT_ID = "([^"]+)"$/m)?.[1];
  assert.ok(stagingId);
  assert.notEqual(stagingId,'506619320686-uhlmttc48vj7osbolv8ragqkfs1v4l70.apps.googleusercontent.com');
  const browserClientSelection = browser.match(/const GOOGLE_CLIENT_ID = window\.location\.origin === "https:\/\/gradstudio-app-staging\.gradstudio-non-production\.workers\.dev"\s*\? "([^"]+)"\s*:\s*"([^"]+)"/);
  assert.deepEqual(browserClientSelection?.slice(1), [
    stagingId,
    '506619320686-uhlmttc48vj7osbolv8ragqkfs1v4l70.apps.googleusercontent.com'
  ]);
  assert.ok(browser.includes('id_token: response.credential'));
  assert.ok(browser.includes('access_token: response.access_token'));
});
