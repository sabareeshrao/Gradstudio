import { loadApplicationCatalog } from './modules/content-catalog-v1.mjs';

const byId = id => document.getElementById(id);
const stateElement = byId('catalogState');

function apiBase() {
  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) return '';
  if (window.location.hostname.endsWith('.workers.dev')) return window.location.origin;
  return 'https://api.gradstudio.org';
}

function authToken() {
  return localStorage.getItem('lp_auth_token') || '';
}

function loginUrl() {
  return `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
}

async function requireAdministrator() {
  const token = authToken();
  if (!token) { window.location.assign(loginUrl()); return false; }
  let response;
  try {
    response = await fetch(`${apiBase()}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  } catch {
    setState('unavailable', 'Administrator verification is unavailable.');
    return false;
  }
  if (!response.ok) { window.location.assign(loginUrl()); return false; }
  const payload = await response.json().catch(() => null);
  if (payload?.user?.role !== 'admin') {
    setState('incompatible', 'Administrator access is required.');
    return false;
  }
  return true;
}

function setState(state, message) {
  stateElement.dataset.state = state;
  stateElement.querySelector('strong').textContent = message;
}

function resetEvidence() {
  byId('sourceCommit').textContent = '—';
  byId('sourceCommit').removeAttribute('href');
  byId('activeRelease').textContent = '—';
  byId('catalogDigest').textContent = '—';
  byId('deploymentStatus').textContent = 'Not active';
  byId('catalogCounts').textContent = 'No catalog loaded';
  byId('catalogTree').replaceChildren(emptyMessage('No published Git-derived catalog is available.'));
}

function emptyMessage(message) {
  const element = document.createElement('div');
  element.className = 'empty';
  element.textContent = message;
  return element;
}

function renderCatalog(model) {
  const commitLink = byId('sourceCommit');
  commitLink.textContent = model.release.sourceCommit;
  commitLink.href = `https://github.com/sabareeshrao/Gradstudio-2.0/commit/${model.release.sourceCommit}`;
  commitLink.target = '_blank';
  commitLink.rel = 'noopener noreferrer';
  byId('activeRelease').textContent = model.release.id;
  byId('catalogDigest').textContent = model.release.catalogDigest;
  byId('deploymentStatus').textContent = 'Active catalog verified';

  const sections = model.courses.flatMap(course => course.sections);
  const simulations = sections.flatMap(section => section.simulations);
  byId('catalogCounts').textContent = `${model.categories.length} categories · ${model.courses.length} courses · ${sections.length} sections · ${simulations.length} simulations`;
  const tree = byId('catalogTree');
  tree.replaceChildren();
  if (!model.courses.length) { tree.append(emptyMessage('The fresh content library is valid and currently empty.')); return; }

  for (const category of model.categories) {
    const categoryNode = document.createElement('article');
    categoryNode.className = 'category';
    categoryNode.dataset.categoryId = category.id;
    const heading = document.createElement('h2');
    heading.textContent = category.title;
    categoryNode.append(heading);
    const courses = model.courses.filter(course => course.category_id === category.id);
    for (const course of courses) {
      const courseNode = document.createElement('section');
      courseNode.className = 'course';
      courseNode.dataset.courseId = course.id;
      const courseHeading = document.createElement('h3');
      courseHeading.textContent = course.title;
      courseNode.append(courseHeading);
      for (const section of course.sections) {
        const sectionNode = document.createElement('section');
        sectionNode.className = 'section';
        sectionNode.dataset.sectionId = section.id;
        const sectionHeading = document.createElement('h4');
        sectionHeading.textContent = section.title;
        sectionNode.append(sectionHeading);
        const list = document.createElement('ul');
        list.className = 'simulation-list';
        for (const simulation of section.simulations) {
          const item = document.createElement('li');
          item.dataset.simulationId = simulation.id;
          item.append(document.createTextNode(simulation.title));
          const status = document.createElement('span');
          status.className = 'pill';
          status.textContent = simulation.status;
          item.append(status);
          list.append(item);
        }
        sectionNode.append(list);
        courseNode.append(sectionNode);
      }
      categoryNode.append(courseNode);
    }
    tree.append(categoryNode);
  }
}

async function refresh() {
  setState('loading', 'Loading the Git-derived catalog…');
  resetEvidence();
  const model = await loadApplicationCatalog(apiBase());
  if (model.state !== 'ready') {
    const messages = {
      unconfigured: 'The independent content source is not configured.',
      unavailable: 'The content deployment is temporarily unavailable.',
      incompatible: 'The content release failed compatibility or integrity validation.'
    };
    setState(model.state, messages[model.state] || 'The content catalog is unavailable.');
    byId('deploymentStatus').textContent = model.state;
    return;
  }
  renderCatalog(model);
  setState('ready', model.courses.length ? 'Git-derived content release is ready.' : 'Git-derived content release is ready; the fresh library is empty.');
}

byId('refreshStatus').addEventListener('click', refresh);
if (await requireAdministrator()) await refresh();
