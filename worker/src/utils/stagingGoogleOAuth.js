import { createRemoteJWKSet, jwtVerify } from 'jose';

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export async function verifyStagingGoogleIdToken(token, clientId, keySet = googleKeys) {
  if (!clientId || !token) throw new Error('Google staging authentication is not configured');
  try {
    const { payload } = await jwtVerify(token, keySet, {
      algorithms: ['RS256'],
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
      requiredClaims: ['exp', 'iat', 'sub', 'email', 'email_verified'],
      maxTokenAge: '1h',
      clockTolerance: 5
    });
    if (payload.aud !== clientId || (payload.azp !== undefined && payload.azp !== clientId) ||
        payload.email_verified !== true || typeof payload.sub !== 'string' || !payload.sub.trim() ||
        typeof payload.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      throw new Error('Invalid identity claims');
    }
    const email = payload.email.trim().toLowerCase();
    return { sub: payload.sub, email, displayName: String(payload.name || payload.given_name || email.split('@')[0]).trim().slice(0, 100) };
  } catch {
    throw new Error('Google ID token verification failed');
  }
}
