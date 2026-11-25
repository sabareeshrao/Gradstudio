const READY = 'ready';

export function resolveSimulationSource(catalog, simulation) {
  const base = new URL(catalog.content_base_url);
  const source = new URL(`/${simulation.release_path}`, base.origin);
  const expectedPrefix = `/releases/${catalog.release_id}/content/simulations/${simulation.id}/`;
  if (source.origin !== base.origin || !source.pathname.startsWith(expectedPrefix)) throw new Error('simulation_source_incompatible');
  return source.href;
}

export function catalogToApplicationModel(catalog) {
  const sectionsByCourse = new Map();
  for (const section of catalog.sections) {
    const items = sectionsByCourse.get(section.course_id) || [];
    items.push({ ...section, simulations: [] });
    sectionsByCourse.set(section.course_id, items);
  }
  const sectionById = new Map([...sectionsByCourse.values()].flat().map(section => [section.id, section]));
  for (const simulation of catalog.simulations) {
    const section = sectionById.get(simulation.section_id);
    if (!section) throw new Error('simulation_section_incompatible');
    section.simulations.push({
      ...simulation,
      source: resolveSimulationSource(catalog, simulation),
      stableProgressKey: `simulation:${simulation.id}`
    });
  }
  for (const sections of sectionsByCourse.values()) {
    sections.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    for (const section of sections) section.simulations.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  }
  const categories = catalog.categories.map(category => ({ ...category })).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const courses = catalog.courses.map(course => ({
    ...course,
    stableProgressKey: `course:${course.id}`,
    sections: sectionsByCourse.get(course.id) || []
  })).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return {
    state: READY,
    release: { id: catalog.release_id, sourceCommit: catalog.source.commit, catalogDigest: catalog.catalog_sha256, contentBaseUrl: catalog.content_base_url },
    categories,
    courses
  };
}

export async function loadApplicationCatalog(apiBase = '') {
  let response;
  try {
    response = await fetch(`${apiBase}/api/content/v1/catalog`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  } catch {
    return { state: 'unavailable', error: { code: 'application_catalog_fetch_failed' } };
  }
  let envelope;
  try { envelope = await response.json(); } catch { return { state: 'incompatible', error: { code: 'application_catalog_json_invalid' } }; }
  if (!response.ok || envelope?.state !== READY || !envelope.catalog) {
    return { state: envelope?.state || 'unavailable', error: envelope?.error || { code: 'application_catalog_unavailable' } };
  }
  try { return catalogToApplicationModel(envelope.catalog); } catch { return { state: 'incompatible', error: { code: 'application_catalog_mapping_failed' } }; }
}
