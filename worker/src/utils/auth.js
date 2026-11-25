import { SignJWT, jwtVerify } from 'jose';
import { AuthError } from './constants.js';

const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';
const DEFAULT_ISSUER = 'gradstudio';
const DEFAULT_AUDIENCE = 'gradstudio-api';

function requireSecret(value, name) {
    if (!value || String(value).length < 32) {
        throw new Error(`${name}_NOT_CONFIGURED`);
    }
    return new TextEncoder().encode(value);
}

function tokenSettings(env) {
    return {
        issuer: env.JWT_ISSUER || DEFAULT_ISSUER,
        audience: env.JWT_AUDIENCE || DEFAULT_AUDIENCE
    };
}

export async function generateTokens(user, env) {
    const secret = requireSecret(env.JWT_SECRET, 'JWT_SECRET');
    const refreshSecret = requireSecret(env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
    const { issuer, audience } = tokenSettings(env);

    const jti = crypto.randomUUID();

    const accessToken = await new SignJWT({
        userId: user.id,
        email: user.email,
        role: user.role || 'user',
        token_type: 'access'
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer(issuer)
        .setAudience(audience)
        .setJti(crypto.randomUUID())
        .setIssuedAt()
        .setExpirationTime(ACCESS_EXPIRY)
        .sign(secret);

    const refreshToken = await new SignJWT({
        userId: user.id,
        token_type: 'refresh'
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer(issuer)
        .setAudience(audience)
        .setJti(jti)
        .setIssuedAt()
        .setExpirationTime(REFRESH_EXPIRY)
        .sign(refreshSecret);

    return { accessToken, refreshToken, jti };
}

export async function verifyAccessToken(token, env) {
    try {
        const secret = requireSecret(env.JWT_SECRET, 'JWT_SECRET');
        const { issuer, audience } = tokenSettings(env);
        const { payload } = await jwtVerify(token, secret, {
            algorithms: ['HS256'],
            issuer,
            audience
        });
        if (payload.token_type !== 'access' || !payload.userId) {
            throw new Error(AuthError.TOKEN_INVALID);
        }
        return payload;
    } catch (err) {
        if (err.code === 'ERR_JWT_EXPIRED') throw new Error(AuthError.TOKEN_EXPIRED);
        if (err.message === 'JWT_SECRET_NOT_CONFIGURED') throw err;
        throw new Error(AuthError.TOKEN_INVALID);
    }
}

export async function verifyRefreshToken(token, env) {
    try {
        const secret = requireSecret(env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
        const { issuer, audience } = tokenSettings(env);
        const { payload } = await jwtVerify(token, secret, {
            algorithms: ['HS256'],
            issuer,
            audience
        });
        if (payload.token_type !== 'refresh' || !payload.userId || !payload.jti) {
            throw new Error(AuthError.REFRESH_TOKEN_INVALID);
        }
        return payload;
    } catch (err) {
        if (err.code === 'ERR_JWT_EXPIRED') throw new Error(AuthError.REFRESH_TOKEN_EXPIRED);
        if (err.message === 'JWT_REFRESH_SECRET_NOT_CONFIGURED') throw err;
        throw new Error(AuthError.REFRESH_TOKEN_INVALID);
    }
}

export function createRefreshCookie(token) {
    // 7 days in seconds
    const maxAge = 7 * 24 * 60 * 60;
    return `refresh_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=${maxAge}`;
}

export function clearRefreshCookie() {
    return 'refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=0';
}
