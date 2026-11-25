import { requireAdmin } from './authorize.js';
import { authenticateToken } from './auth.js';
import { AuthError } from '../utils/constants.js';
import { jsonResponse } from '../utils/responseHelpers.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const DISABLED_RUNTIME_PATTERNS = [
    /^\/debug(?:\/|$)/,
    /^\/api\/admin\/(?:migrate|setup)(?:[-/]|$)/,
    /^\/api\/admin\/sync-content$/,
    /^\/api\/admin\/.+\/permanent$/
];

function isUserRoute(path, method) {
    if (/^\/api\/auth\/(?:me|logout-all)$/.test(path)) return true;
    if (/^\/api\/bookmarks(?:\/|$)/.test(path)) return true;
    if (path === '/api/user-pins') return true;
    if (/^\/api\/comments\/[0-9]+\/upvote$/.test(path)) return true;
    if (method === 'POST' && /^\/api\/comments\/[a-zA-Z0-9-]+$/.test(path)) return true;
    if (method === 'POST' && /^\/api\/reports\/[a-zA-Z0-9-]+$/.test(path)) return true;
    if (method === 'POST' && /^\/api\/content\/[a-zA-Z0-9-]+\/(?:share|report)$/.test(path)) return true;
    return false;
}

const REQUIRED_BINDINGS = ['DB', 'KV', 'REFRESH_TOKENS', 'RATE_LIMITS', 'R2'];

export function validateRuntimeEnvironment(env) {
    if (env.ENVIRONMENT_ISOLATED !== 'true') {
        return 'Environment isolation has not been confirmed';
    }

    const missingBinding = REQUIRED_BINDINGS.find(binding => !env[binding]);
    if (missingBinding) return `Required binding is unavailable: ${missingBinding}`;

    const accessSecret = String(env.JWT_SECRET || '');
    const refreshSecret = String(env.JWT_REFRESH_SECRET || '');
    if (accessSecret.length < 32 || refreshSecret.length < 32) {
        return 'Authentication secrets are not configured';
    }
    if (accessSecret === refreshSecret) {
        return 'Access and refresh token secrets must be distinct';
    }

    return null;
}

export function isRuntimeRouteDisabled(path) {
    return DISABLED_RUNTIME_PATTERNS.some(pattern => pattern.test(path));
}

export function getRoutePolicy(path, method) {
    if (isRuntimeRouteDisabled(path)) {
        return { access: 'disabled', bodyLimit: 0, rateClass: 'blocked' };
    }

    if (path.startsWith('/api/admin/')) {
        return {
            access: 'admin',
            bodyLimit: path.includes('upload') || path.includes('replace-simulation') ? 25 * 1024 * 1024 : 1024 * 1024,
            rateClass: 'admin'
        };
    }

    if (isUserRoute(path, method)) {
        return { access: 'user', bodyLimit: 256 * 1024, rateClass: 'user' };
    }

    if (path.startsWith('/api/auth/')) {
        return { access: 'public', bodyLimit: 64 * 1024, rateClass: 'auth' };
    }

    return {
        access: 'public',
        bodyLimit: UNSAFE_METHODS.has(method) ? 256 * 1024 : 0,
        rateClass: method === 'GET' ? 'public-read' : 'public-write'
    };
}

function contentLength(request) {
    const raw = request.headers.get('Content-Length');
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

async function exceedsBodyLimit(request, limit) {
    const declared = contentLength(request);
    if (declared !== null) return declared > limit;
    if (!request.body) return false;

    // HTTP/2 and streamed requests may omit Content-Length. Measure a cloned
    // stream and stop as soon as it crosses the route limit so an attacker
    // cannot bypass the policy by switching transfer framing.
    let reader;
    try {
        reader = request.clone().body.getReader();
        let received = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) return false;
            received += value?.byteLength || 0;
            if (received > limit) {
                reader.cancel('request body limit exceeded').catch(() => {});
                return true;
            }
        }
    } catch (error) {
        console.error('Request body size validation failed:', error);
        try { reader?.cancel('request body validation failed').catch(() => {}); } catch (_) {}
        return true;
    }
}

export async function enforceRequestPolicy(request, env, corsHeaders = {}) {
    const { pathname } = new URL(request.url);
    const policy = getRoutePolicy(pathname, request.method);

    if (policy.access === 'disabled') {
        return jsonResponse({ error: { code: AuthError.NOT_FOUND, message: 'Not found' } }, 404, corsHeaders);
    }

    if (UNSAFE_METHODS.has(request.method) && policy.bodyLimit > 0) {
        if (await exceedsBodyLimit(request, policy.bodyLimit)) {
            return jsonResponse({ error: { code: AuthError.PAYLOAD_TOO_LARGE, message: 'Request body is too large' } }, 413, corsHeaders);
        }
    }

    if (policy.access === 'admin') {
        try {
            request.user = await requireAdmin(request, env);
        } catch (error) {
            const known = Object.values(AuthError).includes(error.message);
            const code = known ? error.message : AuthError.SERVICE_UNAVAILABLE;
            const status = code === AuthError.INSUFFICIENT_PERMISSIONS ? 403 : code === AuthError.SERVICE_UNAVAILABLE ? 503 : 401;
            return jsonResponse({ error: { code, message: status === 403 ? 'Access denied' : status === 503 ? 'Authentication service unavailable' : 'Authentication required' } }, status, corsHeaders);
        }
    }

    if (policy.access === 'user') {
        try {
            request.user = await authenticateToken(request, env);
        } catch (error) {
            const known = Object.values(AuthError).includes(error.message);
            const code = known ? error.message : AuthError.SERVICE_UNAVAILABLE;
            return jsonResponse({ error: { code, message: code === AuthError.SERVICE_UNAVAILABLE ? 'Authentication service unavailable' : 'Authentication required' } }, code === AuthError.SERVICE_UNAVAILABLE ? 503 : 401, corsHeaders);
        }
    }

    return null;
}

export function getIpRateLimitRule(path, method) {
    const policy = getRoutePolicy(path, method);
    switch (policy.rateClass) {
        case 'auth': return { limit: path.endsWith('/login') ? 10 : 30, window: 900, bucket: 'auth' };
        case 'admin': return { limit: 60, window: 60, bucket: 'admin' };
        case 'public-read': return { limit: 120, window: 60, bucket: 'read' };
        case 'blocked': return { limit: 10, window: 60, bucket: 'blocked' };
        default: return { limit: 100, window: 60, bucket: 'write' };
    }
}

export function getUserRateLimitRule(path, method) {
    const policy = getRoutePolicy(path, method);
    if (policy.rateClass === 'admin') return { limit: 120, window: 60, bucket: 'admin' };
    if (policy.rateClass === 'user' && UNSAFE_METHODS.has(method)) return { limit: 60, window: 60, bucket: 'mutation' };
    return null;
}
