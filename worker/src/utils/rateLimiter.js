/**
 * Rate Limiter Utility using Cloudflare KV
 */

/**
 * Check if a request should be rate limited
 * @param {Object} env - Worker environment bindings
 * @param {string} key - Unique identifier for the requester (e.g., IP or UserID)
 * @param {number} limit - Maximum requests allowed in the window
 * @param {number} windowSeconds - Time window in seconds
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
 */
export async function checkRateLimit(env, key, limit, windowSeconds) {
    if (!env.RATE_LIMITS) {
        const production = env.ENVIRONMENT === 'production';
        console.error('RATE_LIMITS KV is not bound.');
        return { allowed: !production, unavailable: production, remaining: production ? 0 : limit, resetAt: Date.now() + (windowSeconds * 1000) };
    }

    // Use fixed windows (buckets) based on current time
    // This is an approximation but sufficient for high-scale/low-cost
    const now = Date.now();
    const bucket = Math.floor(now / (windowSeconds * 1000));
    const kvKey = `ratelimit:${key}:${bucket}`;

    // Increment counter for this bucket
    let count = 0;
    try {
        // If key doesn't exist, this returns 1. If it exists, increments and returns new value.
        // KV atomic operations aren't fully supported in all environments, but we can use metadata/read-modify-write as backup
        // For simple rate limiting, we can try to read and put, accepting race conditions as "good enough" for soft limits.
        // OR we can use the "text" value as the counter.

        // Efficient strategy for Workers KV (no atomic increment):
        // Just read. If null, put 1. If exists, parse and increment.
        // Race condition: Multiple requests might see same count and increment to same value.
        // Result: Under-counting. This is acceptable for DDoS protection (soft limits).

        const currentVal = await env.RATE_LIMITS.get(kvKey);
        count = currentVal ? parseInt(currentVal) + 1 : 1;

        // Write back with expiration
        // We only write if we are under the limit or just crossed it (to save writes? no, we need to track count)
        // To save writes, maybe we only update every X requests? No, let's keep it simple first.
        // Optimization: Use expirationTtl logic
        await env.RATE_LIMITS.put(kvKey, count.toString(), { expirationTtl: windowSeconds * 2 }); // Keep a bit longer for safety

    } catch (e) {
        console.error('Rate limit KV error:', e);
        const production = env.ENVIRONMENT === 'production';
        return { allowed: !production, unavailable: production, remaining: production ? 0 : 1, resetAt: now + 1000 };
    }

    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const resetAt = (bucket + 1) * windowSeconds * 1000;

    return { allowed, remaining, resetAt };
}

/**
 * Track failed login attempts and check for account lockouts
 * @param {Object} env - Worker environment
 * @param {string} ip - Client IP
 * @param {string} email - Target email
 * @returns {Promise<{allowed: boolean, error?: string, remainingAttempts?: number}>}
 */
export async function trackFailedLogin(env, ip, email) {
    if (!env.RATE_LIMITS) {
        return env.ENVIRONMENT === 'production'
            ? { allowed: false, error: 'Authentication protection is unavailable' }
            : { allowed: true };
    }

    const keys = await getLoginRateLimitKeys(ip, email);
    const [accountLocked, emailCount, ipCount] = await Promise.all([
        env.RATE_LIMITS.get(keys.accountLock),
        env.RATE_LIMITS.get(keys.emailFailures),
        env.RATE_LIMITS.get(keys.ipFailures)
    ]);

    const blocked = Boolean(accountLocked) || Number(emailCount || 0) >= 5 || Number(ipCount || 0) >= 20;
    return blocked
        ? { allowed: false, error: 'Too many sign-in attempts. Try again later.' }
        : { allowed: true, remainingAttempts: Math.max(0, 5 - Number(emailCount || 0)) };
}

/**
 * Record a failed login attempt
 * @param {Object} env 
 * @param {string} ip 
 * @param {string} email 
 */
export async function recordLoginFailure(env, ip, email) {
    if (!env.RATE_LIMITS) return { locked: env.ENVIRONMENT === 'production' };

    const keys = await getLoginRateLimitKeys(ip, email);
    const [emailValue, ipValue] = await Promise.all([
        env.RATE_LIMITS.get(keys.emailFailures),
        env.RATE_LIMITS.get(keys.ipFailures)
    ]);
    const emailCount = Number(emailValue || 0) + 1;
    const ipCount = Number(ipValue || 0) + 1;

    await Promise.all([
        env.RATE_LIMITS.put(keys.emailFailures, String(emailCount), { expirationTtl: 900 }),
        env.RATE_LIMITS.put(keys.ipFailures, String(ipCount), { expirationTtl: 900 })
    ]);

    const locked = emailCount >= 5;
    if (locked) {
        await env.RATE_LIMITS.put(keys.accountLock, '1', { expirationTtl: 900 });
    }
    return { locked, emailCount, ipCount };
}

/**
 * Reset failed login counters on success
 * @param {Object} env 
 * @param {string} ip 
 * @param {string} email 
 */
export async function resetLoginFailures(env, ip, email) {
    if (!env.RATE_LIMITS) return;
    const keys = await getLoginRateLimitKeys(ip, email);
    await Promise.all([
        env.RATE_LIMITS.delete(keys.emailFailures),
        env.RATE_LIMITS.delete(keys.accountLock)
    ]);
}

async function sha256(value) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value).toLowerCase().trim()));
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function getLoginRateLimitKeys(ip, email) {
    const emailHash = await sha256(email || 'unknown');
    const ipHash = await sha256(ip || 'unknown');
    return {
        emailFailures: `failed_login:email:${emailHash}`,
        ipFailures: `failed_login:ip:${ipHash}`,
        accountLock: `account_locked:${emailHash}`
    };
}
