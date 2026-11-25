import { AuthError } from '../utils/constants.js';

/**
 * Check if origin is allowed
 * @param {string} origin 
 * @param {Object} env 
 * @returns {boolean}
 */
export function isAllowedOrigin(origin, env) {
    if (!origin) return false;

    if (origin === 'null') return false;

    // Development: Allow localhost
    if (env.ENVIRONMENT === 'development' || env.ENVIRONMENT === 'dev' || env.ENVIRONMENT === 'test') {
        try {
            const parsed = new URL(origin);
            if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) return true;
        } catch (_) {
            return false;
        }
    }

    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
    return allowed.includes(origin);
}

/**
 * Handle CORS for a request
 * @param {Request} request 
 * @param {Object} env 
 * @returns {Response|null} Response if preflight or error, null to proceed
 */
export function handleCors(request, env) {
    const origin = request.headers.get('Origin');

    // If no origin (server-to-server or same-origin), pass through
    if (!origin) return null;

    const allowed = isAllowedOrigin(origin, env);

    if (request.method === 'OPTIONS') {
        // Handle Preflight
        if (!allowed) {
            return new Response(null, { status: 403 });
        }

        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': origin,
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma, X-Request-ID',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Max-Age': '3600',
                'Vary': 'Origin'
            }
        });
    }

    // Normal Request
    if (!allowed) {
        return new Response(JSON.stringify({
            success: false,
            error: {
                code: AuthError.ORIGIN_NOT_ALLOWED,
                message: 'Request origin is not permitted'
            }
        }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Allowed origin - proceed
    return null;
}

/**
 * Get CORS headers for a valid request
 * @param {Request} request 
 * @param {Object} env 
 * @returns {Object} Headers object or empty if not allowed
 */
export function getCorsHeaders(request, env) {
    const origin = request.headers.get('Origin');

    // Same-origin requests (no Origin header) - allow
    if (!origin) {
        return {
            'Vary': 'Origin'
        };
    }

    if (!isAllowedOrigin(origin, env)) return {};

    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma, X-Request-ID',
        'Access-Control-Expose-Headers': 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After',
        'Vary': 'Origin'
    };
}
