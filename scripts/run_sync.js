import https from 'node:https';

const apiUrl = process.env.GRADSTUDIO_ADMIN_SYNC_URL;
const accessToken = process.env.GRADSTUDIO_ADMIN_ACCESS_TOKEN;

if (!apiUrl || !accessToken) {
    throw new Error('GRADSTUDIO_ADMIN_SYNC_URL and GRADSTUDIO_ADMIN_ACCESS_TOKEN are required.');
}

const parsed = new URL(apiUrl);
const productionHost = parsed.hostname === 'api.gradstudio.org' || parsed.hostname === 'gradstudio.org' || parsed.hostname === 'www.gradstudio.org';
if (productionHost && process.env.GRADSTUDIO_PRODUCTION_SYNC_AUTHORIZED !== 'true') {
    throw new Error('Direct production synchronization is disabled without explicit authorization.');
}
if (parsed.protocol !== 'https:') throw new Error('Synchronization URL must use HTTPS.');

async function runSync() {
    let cursor = null;
    let hasMore = true;
    let page = 1;

    while (hasMore) {
        const target = new URL(apiUrl);
        if (cursor) target.searchParams.set('cursor', cursor);
        const result = await postRequest(target);
        if (!result.success) throw new Error(result.error || 'Synchronization failed.');
        cursor = result.nextCursor || null;
        hasMore = Boolean(cursor);
        page += 1;
    }

    console.log(`Synchronization completed in ${page - 1} page(s).`);
}

function postRequest(url) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'User-Agent': 'GradStudio-Admin-Sync/2.0'
            },
            timeout: 30_000
        }, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const body = JSON.parse(data);
                    if ((res.statusCode || 500) >= 400) reject(new Error(`HTTP ${res.statusCode}: ${body.error || 'request failed'}`));
                    else resolve(body);
                } catch (_) {
                    reject(new Error(`Invalid JSON response (HTTP ${res.statusCode || 500}).`));
                }
            });
        });
        req.on('timeout', () => req.destroy(new Error('Synchronization request timed out.')));
        req.on('error', reject);
        req.end('{}');
    });
}

runSync().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
