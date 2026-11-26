import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { classifyGit } from './staging-ui-lane.mjs';

const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const run = event.workflow_run;
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const apiBase = process.env.GITHUB_API_URL || 'https://api.github.com';

if (!run || run.name !== 'Application UI validation' || run.conclusion !== 'success') process.exit(0);
if (!token || !repository) throw new Error('Trusted GitHub automation context is unavailable');
const eventPr = run.pull_requests?.[0];
if (!eventPr) process.exit(0);

async function api(path, options = {}) {
  const response = await fetch(`${apiBase}/repos/${repository}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers
    }
  });
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

function runMatchesPullRequest(candidate, number, headSha) {
  return candidate.event === 'pull_request' && candidate.conclusion === 'success' &&
    candidate.pull_requests?.some(pr => pr.number === number && pr.head?.sha === headSha);
}

async function waitForWorkflow(file, number, headSha) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = await api(`/actions/workflows/${encodeURIComponent(file)}/runs?event=pull_request&per_page=30`);
    const match = result.workflow_runs.find(candidate => runMatchesPullRequest(candidate, number, headSha));
    if (match) return match;
    await new Promise(resolve => setTimeout(resolve, 10_000));
  }
  throw new Error(`${file} did not complete successfully for the current pull-request head`);
}

const pr = await api(`/pulls/${eventPr.number}`);
if (pr.state !== 'open' || pr.draft || pr.base.ref !== 'main') process.exit(0);
if (pr.head.repo?.full_name !== repository || pr.head.sha !== eventPr.head.sha) process.exit(0);

execFileSync('git', ['fetch', '--no-tags', 'origin', pr.base.sha, pr.head.sha], { stdio: 'inherit' });
if (classifyGit(pr.base.sha, pr.head.sha, undefined, { requireCheckout: false }) !== 'copy') {
  console.log('Not eligible: the trusted classifier did not select the routine copy lane.');
  process.exit(0);
}

const reviews = await api(`/pulls/${pr.number}/reviews?per_page=100`);
const latestByUser = new Map(reviews.map(review => [review.user.login, review.state]));
if ([...latestByUser.values()].includes('CHANGES_REQUESTED')) {
  console.log('Not eligible: a current review requests changes.');
  process.exit(0);
}

await waitForWorkflow('security-ci.yml', pr.number, pr.head.sha);
const merged = await api(`/pulls/${pr.number}/merge`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sha: pr.head.sha,
    merge_method: 'squash',
    commit_title: `${pr.title} (#${pr.number})`
  })
});
if (!merged.merged) throw new Error(`GitHub refused the routine merge: ${merged.message}`);

await api('/actions/workflows/application-staging.yml/dispatches', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ref: 'main' })
});
console.log(`Merged routine UI PR #${pr.number} at ${merged.sha} and dispatched isolated staging deployment.`);
