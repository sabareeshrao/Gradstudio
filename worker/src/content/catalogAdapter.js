const CONTRACT = 'gradstudio-content-catalog/v1';
const MAX_CATALOG_BYTES = 2 * 1024 * 1024;
const MAX_ENTITIES_PER_KIND = 10000;
const RELEASE_ID = /^rel-[0-9a-f]{12}-[0-9a-f]{12}$/;
const COMMIT_SHA = /^[0-9a-f]{40}$/;
const DIGEST = /^[0-9a-f]{64}$/;
const SAFE_RELEASE_PATH = /^releases\/rel-[0-9a-f]{12}-[0-9a-f]{12}\/content\/[a-z0-9._/-]+$/;

export class ContentCatalogError extends Error {
  constructor(state, code) {
    super(code);
    this.name = 'ContentCatalogError';
    this.state = state;
    this.code = code;
  }
}

function incompatible(code) {
  throw new ContentCatalogError('incompatible', code);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function requireObject(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) incompatible(code);
  return value;
}

function requireEntity(entity, kind, releaseId, allIds) {
  requireObject(entity, `${kind}_not_object`);
  if (typeof entity.id !== 'string' || !entity.id.startsWith(kind === 'shared_assets' ? 'asset-' : kind === 'categories' ? 'cat-' : kind === 'courses' ? 'course-' : kind === 'sections' ? 'section-' : 'sim-')) incompatible(`${kind}_invalid_id`);
  if (allIds.has(entity.id)) incompatible('duplicate_entity_id');
  allIds.add(entity.id);
  if (typeof entity.title !== 'string' || !entity.title.trim() || !Number.isSafeInteger(entity.order) || entity.order < 0) incompatible(`${kind}_invalid_metadata`);
  if (entity.status !== 'published') incompatible(`${kind}_not_published`);
  if (kind === 'simulations') {
    if (typeof entity.release_path !== 'string' || !SAFE_RELEASE_PATH.test(entity.release_path) || !entity.release_path.startsWith(`releases/${releaseId}/content/simulations/${entity.id}/`)) incompatible('simulation_invalid_release_path');
    requireObject(entity.access, 'simulation_invalid_access');
    if (!['open', 'locked'].includes(entity.access.display)) incompatible('simulation_invalid_access');
  }
}

function validateRelationships(catalog) {
  const categories = new Set(catalog.categories.map(item => item.id));
  const courses = new Map(catalog.courses.map(item => [item.id, item]));
  const sections = new Map(catalog.sections.map(item => [item.id, item]));
  const shared = new Set(catalog.shared_assets.map(item => item.id));
  for (const category of catalog.categories) if (category.parent_id && !categories.has(category.parent_id)) incompatible('category_parent_missing');
  for (const course of catalog.courses) {
    if (!categories.has(course.category_id)) incompatible('course_category_missing');
    if (course.parent_course_id && !courses.has(course.parent_course_id)) incompatible('course_parent_missing');
  }
  for (const section of catalog.sections) if (!courses.has(section.course_id)) incompatible('section_course_missing');
  for (const simulation of catalog.simulations) {
    const section = sections.get(simulation.section_id);
    if (!courses.has(simulation.course_id)) incompatible('simulation_course_missing');
    if (!section || section.course_id !== simulation.course_id) incompatible('simulation_section_mismatch');
    for (const assetId of simulation.shared_asset_ids || []) if (!shared.has(assetId)) incompatible('simulation_shared_asset_missing');
  }
}

export async function validateCatalog(raw) {
  const catalog = requireObject(raw, 'catalog_not_object');
  if (catalog.contract !== CONTRACT || catalog.schema_version !== 1) incompatible('unsupported_contract');
  if (!RELEASE_ID.test(catalog.release_id || '')) incompatible('invalid_release_id');
  if (catalog.source?.repository !== 'sabareeshrao/Gradstudio-2.0' || !COMMIT_SHA.test(catalog.source?.commit || '')) incompatible('invalid_source');
  if (!DIGEST.test(catalog.catalog_sha256 || '')) incompatible('invalid_catalog_digest');

  let base;
  try { base = new URL(catalog.content_base_url); } catch { incompatible('invalid_content_base_url'); }
  if (base.protocol !== 'https:' || base.href !== `${base.origin}/releases/${catalog.release_id}/`) incompatible('invalid_content_base_url');

  const kinds = ['shared_assets', 'categories', 'courses', 'sections', 'simulations'];
  const allIds = new Set();
  for (const kind of kinds) {
    if (!Array.isArray(catalog[kind]) || catalog[kind].length > MAX_ENTITIES_PER_KIND) incompatible(`${kind}_invalid_collection`);
    for (const entity of catalog[kind]) requireEntity(entity, kind, catalog.release_id, allIds);
  }
  validateRelationships(catalog);

  const { catalog_sha256: expected, ...payload } = catalog;
  if (await sha256(canonicalJson(payload)) !== expected) incompatible('catalog_digest_mismatch');
  return catalog;
}

function contentRequest(env) {
  const path = '/catalog/v1/active.json';
  const signal = AbortSignal.timeout(5000);
  if (env?.CONTENT && typeof env.CONTENT.fetch === 'function') {
    return { fetcher: env.CONTENT, request: new Request(`https://content.internal${path}`, { headers: { Accept: 'application/json' }, signal }) };
  }
  if (!env?.CONTENT_ORIGIN) throw new ContentCatalogError('unconfigured', 'content_source_unconfigured');
  let origin;
  try { origin = new URL(env.CONTENT_ORIGIN); } catch { throw new ContentCatalogError('unconfigured', 'content_origin_invalid'); }
  if (origin.protocol !== 'https:' || origin.origin !== env.CONTENT_ORIGIN) throw new ContentCatalogError('unconfigured', 'content_origin_invalid');
  return { fetcher: { fetch }, request: new Request(`${origin.origin}${path}`, { headers: { Accept: 'application/json' }, redirect: 'error', signal }) };
}

async function readLimitedBody(response) {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_CATALOG_BYTES) {
        await reader.cancel('catalog_too_large');
        incompatible('catalog_too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

export async function loadContentCatalog(env) {
  const { fetcher, request } = contentRequest(env);
  let response;
  try {
    response = await fetcher.fetch(request);
  } catch {
    throw new ContentCatalogError('unavailable', 'content_fetch_failed');
  }
  if (!response?.ok) throw new ContentCatalogError('unavailable', 'content_upstream_unavailable');
  if (!/^application\/json(?:;|$)/i.test(response.headers.get('Content-Type') || '')) incompatible('content_type_invalid');
  const declaredLength = Number(response.headers.get('Content-Length') || '0');
  if (declaredLength > MAX_CATALOG_BYTES) incompatible('catalog_too_large');
  const bytes = await readLimitedBody(response);
  let raw;
  try { raw = JSON.parse(new TextDecoder().decode(bytes)); } catch { incompatible('catalog_json_invalid'); }
  return validateCatalog(raw);
}

export async function handleContentCatalogRequest(env, corsHeaders = {}) {
  try {
    const catalog = await loadContentCatalog(env);
    return new Response(JSON.stringify({ state: 'ready', catalog }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=30, must-revalidate', ...corsHeaders }
    });
  } catch (error) {
    const known = error instanceof ContentCatalogError ? error : new ContentCatalogError('unavailable', 'content_adapter_failed');
    const status = known.state === 'incompatible' ? 502 : 503;
    return new Response(JSON.stringify({ state: known.state, error: { code: known.code } }), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders }
    });
  }
}
