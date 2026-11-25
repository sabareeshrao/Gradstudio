import { verifyAccessToken } from '../utils/auth.js';
import { AuthError } from '../utils/constants.js';

const authenticationCache = new WeakMap();

async function loadActiveUser(payload, env) {
    if (!env.DB) throw new Error(AuthError.SERVICE_UNAVAILABLE);

    const user = await env.DB.prepare(
        'SELECT id, email, role, is_active FROM users WHERE id = ?'
    ).bind(payload.userId).first();

    if (!user || Number(user.is_active) !== 1) {
        throw new Error(AuthError.UNAUTHORIZED);
    }

    return {
        ...payload,
        userId: user.id,
        email: user.email,
        role: user.role || 'user',
        isActive: true
    };
}

export async function authenticateToken(request, env) {
    if (authenticationCache.has(request)) return authenticationCache.get(request);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !/^Bearer\s+\S+$/i.test(authHeader)) {
        throw new Error(AuthError.TOKEN_MISSING);
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const payload = await verifyAccessToken(token, env);
    const user = await loadActiveUser(payload, env);
    authenticationCache.set(request, user);
    return user;
}

export async function getUserFromRequest(request, env) {
    try {
        const user = await authenticateToken(request, env);
        return { user, error: null };
    } catch (err) {
        return { user: null, error: err.message };
    }
}
