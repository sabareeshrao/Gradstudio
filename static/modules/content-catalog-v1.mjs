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

export function applicationModelToUiCatalog(model) {
  if (model?.state !== READY) {
    return {
      state: model?.state || 'unavailable',
      error: model?.error || { code: 'application_catalog_unavailable' },
      topics: ['All'],
      courses: [],
      allCourses: []
    };
  }

  const categoryById = new Map(model.categories.map(category => [category.id, category]));
  const courses = model.courses.map((course, courseIndex) => {
    const category = categoryById.get(course.category_id);
    const topic = category?.title || 'Course';
    const lessons = [];
    const sections = course.sections.map((section, sectionIndex) => {
      const lessonIndexes = [];
      for (const simulation of section.simulations) {
        lessonIndexes.push(lessons.length);
        lessons.push({
          id: simulation.id,
          simulation_id: simulation.id,
          stableProgressKey: simulation.stableProgressKey,
          title: simulation.title,
          description: simulation.description || '',
          type: 'lab',
          src: simulation.source,
          section_id: section.id,
          access: simulation.access || { display: 'open' }
        });
      }
      return {
        id: section.id,
        section_id: section.id,
        title: section.title || `Section ${sectionIndex + 1}`,
        lessonIndexes
      };
    });
    const mark = String(course.title || course.id || 'GS')
      .split(/\s+/)
      .map(word => word.replace(/[^a-z0-9]/gi, '').charAt(0))
      .join('')
      .slice(0, 4)
      .toUpperCase() || 'GS';

    return {
      id: course.id,
      title: course.title,
      description: course.description || '',
      tags: [topic],
      topicFolder: topic,
      fromApi: true,
      fromGitContent: true,
      stableProgressKey: course.stableProgressKey,
      displayOrder: course.order ?? courseIndex,
      level: displayAccess(course.access),
      labs: `${lessons.length} module${lessons.length === 1 ? '' : 's'}`,
      lessons,
      sections,
      _contentHydrated: true,
      _apiLessons: lessons,
      _apiSections: sections,
      thumbnail: {
        type: 'html',
        html: `<div class="html-thumb thumb-stack"><div class="stack-tiles" aria-hidden="true"><span></span><span></span><span></span></div><span class="sr-only">${mark}</span></div>`
      }
    };
  });

  return {
    state: READY,
    release: model.release,
    topics: ['All', ...model.categories.map(category => category.title)],
    courses,
    allCourses: courses
  };
}

function displayAccess(access) {
  const value = String(access?.display || 'open');
  return value.charAt(0).toUpperCase() + value.slice(1);
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
