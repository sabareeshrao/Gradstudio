// Staging-only interim access-token validation. For production, migrate to
// Google Sign-In ID tokens with local signature and audience verification.
export async function verifyStagingGoogleAccessToken(accessToken, clientId, fetcher = fetch) {
  if (!clientId || !accessToken) throw new Error('Google staging authentication is not configured');
  const url = new URL('https://oauth2.googleapis.com/tokeninfo');
  url.searchParams.set('access_token', accessToken);
  let claims;
  try {
    const response = await fetcher(url, { redirect: 'error', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Rejected');
    claims = await response.json();
  } catch {
    // Do not expose errors containing a Google access token or request URL.
    throw new Error('Google token verification failed');
  }
  if (!claims || claims.aud !== clientId || claims.azp !== clientId ||
      !Number.isFinite(Number(claims.exp)) || Number(claims.exp) <= Date.now() / 1000 ||
      (claims.email_verified !== true && claims.email_verified !== 'true') ||
      typeof claims.sub !== 'string' || !claims.sub.trim() ||
      typeof claims.email !== 'string' || !claims.email.trim()) {
    throw new Error('Google token verification failed');
  }
  return { sub: claims.sub, email: claims.email.trim().toLowerCase() };
}
