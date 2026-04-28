import { randomUUID } from 'node:crypto';
import type { CandidateSpec, GeneratedPostData, GenerationStep, RunState } from '../types';
import { callAnthropic, callCrustdata, callGrok } from './clients';
import { extractJsonObject } from './json';
import { renderPostSvg } from './image';
import {
  readMarkdown,
  readRun,
  writeRun,
  writeRunArtifact,
} from './storage';

function now() {
  return new Date().toISOString();
}

function defaultSteps(): GenerationStep[] {
  return [
    {
      id: 'fetching_data',
      title: 'Fetching data',
      description: 'Querying Crustdata for the numbers behind the headline.',
      status: 'pending',
    },
    {
      id: 'finalizing_data',
      title: 'Finalizing data',
      description: 'Shaping the response into a chart-ready format.',
      status: 'pending',
    },
    {
      id: 'generating_image',
      title: 'Generating image',
      description: 'Rendering the post in your visual style.',
      status: 'pending',
    },
  ];
}

async function appendLog(run: RunState, message: string) {
  return writeRun({
    ...run,
    logs: [...run.logs, { at: now(), message }],
  });
}

async function failRun(run: RunState, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return writeRun({
    ...run,
    status: 'failed',
    error: message,
    logs: [...run.logs, { at: now(), message }],
    generation_steps: run.generation_steps.map((step) =>
      step.status === 'running' ? { ...step, status: 'error', microStatus: message } : step
    ),
  });
}

async function noMatches(run: RunState, message: string) {
  return writeRun({
    ...run,
    status: 'no_matches',
    error: undefined,
    candidates: [],
    logs: [...run.logs, { at: now(), message }],
  });
}

function requireRun(run: RunState | null): RunState {
  if (!run) {
    throw new Error('Run not found.');
  }

  return run;
}

export async function createRun() {
  const timestamp = now();
  const run: RunState = {
    run_id: randomUUID(),
    created_at: timestamp,
    updated_at: timestamp,
    status: 'created',
    logs: [{ at: timestamp, message: 'Run created.' }],
    candidates: [],
    generation_steps: defaultSteps(),
  };

  return writeRun(run);
}

export async function discoverCandidates(runId: string) {
  let run = requireRun(await readRun(runId));

  try {
    run = await writeRun({ ...run, status: 'discovering', error: undefined });
    run = await appendLog(run, 'Reading editorial base and visual design spec.');

    const [base, design] = await Promise.all([readMarkdown('base'), readMarkdown('design')]);
    if (!base.trim()) {
      throw new Error('base/base.md is empty. Add the editorial DNA before running discovery.');
    }
    if (!design.trim()) {
      throw new Error('design/design.md is empty. Add the visual spec before running discovery.');
    }

    run = await appendLog(run, 'Asking Claude to construct a Grok trend discovery query.');
    const grokQuery = await callAnthropic(`You are building Newsroom for Crustdata.

Editorial base:
${base}

Visual design spec:
${design}

Write one concise Grok/X live-search prompt to find current tech/startup conversations that can become Crustdata data posts. Return plain text only.`);

    run = await appendLog(run, 'Querying Grok for candidate trends.');
    const grokResponse = await callGrok(`Use this search intent to identify 8 current tech/startup trend candidates suitable for Crustdata data posts:

${grokQuery}

Return JSON with this exact shape:
{
  "candidates": [
    {
      "id": "c_01",
      "text": "trend text",
      "source_url": "https://...",
      "engagement": { "likes": 0, "reposts": 0, "replies": 0 },
      "entities": ["company or topic"]
    }
  ]
}`);

    const rawCandidates = extractJsonObject<{ candidates?: unknown[] }>(grokResponse);
    const rawCandidateList = Array.isArray(rawCandidates.candidates) ? rawCandidates.candidates : [];
    run = await appendLog(run, `Grok returned ${rawCandidateList.length} candidate trends.`);

    if (rawCandidateList.length === 0) {
      return noMatches(run, 'No current trends matched the editorial base. Try finding new ideas again.');
    }

    const judgedResponse = await callAnthropic(`You are Stage 2 of Newsroom: judge and reframe trends into Crustdata API-backed post ideas.

Editorial base:
${base}

Visual design spec:
${design}

Candidate trends:
${JSON.stringify({ candidates: rawCandidateList }, null, 2)}

Score candidates for api_feasibility, recency, archetype_fit, visual_potential, engagement_likelihood, and total. Return only the best three ideas as JSON:
{
  "top_3": [
    {
      "candidate_id": "c_01",
      "headline": "headline",
      "subhead": "subhead",
      "source": "short trend source text",
      "source_url": "https://...",
      "scores": { "api_feasibility": 0, "recency": 0, "archetype_fit": 0, "visual_potential": 0, "engagement_likelihood": 0, "total": 0 },
      "matched_archetype": "name",
      "matched_angle": "name",
      "matched_visual": "chart type",
      "rationale": "one sentence",
      "crustdata_query": { "endpoint": "/company/enrich", "params": {} },
      "visual_template": "diverging_bar",
      "expected_data_shape": "rows of label/value"
    }
  ]
}`);

    const judged = extractJsonObject<{ top_3?: CandidateSpec[] }>(judgedResponse);
    const topCandidates = (Array.isArray(judged.top_3) ? judged.top_3 : []).filter(
      (candidate) =>
        candidate?.candidate_id &&
        candidate?.headline &&
        candidate?.subhead &&
        candidate?.crustdata_query?.endpoint
    );

    if (!topCandidates.length) {
      return noMatches(run, 'No candidates passed the Crustdata feasibility filter. Try finding new ideas again.');
    }

    return writeRun({
      ...run,
      status: 'awaiting_selection',
      candidates: topCandidates.slice(0, 3),
      logs: [...run.logs, { at: now(), message: 'Candidate judging complete. Awaiting selection.' }],
    });
  } catch (error) {
    return failRun(run, error);
  }
}

export async function selectCandidate(runId: string, candidateId: string) {
  const run = requireRun(await readRun(runId));
  const selected = run.candidates.find((candidate) => candidate.candidate_id === candidateId);

  if (!selected) {
    throw new Error('Selected candidate was not found on this run.');
  }

  return writeRun({
    ...run,
    status: 'generating',
    selected_candidate_id: candidateId,
    selected_candidate: selected,
    generation_steps: defaultSteps(),
    logs: [...run.logs, { at: now(), message: `Selected candidate: ${selected.headline}` }],
  });
}

function updateStep(run: RunState, id: GenerationStep['id'], status: GenerationStep['status'], microStatus?: string) {
  return {
    ...run,
    generation_steps: run.generation_steps.map((step) =>
      step.id === id ? { ...step, status, microStatus } : step
    ),
  };
}

export async function generatePost(runId: string) {
  let run = requireRun(await readRun(runId));

  try {
    if (!run.selected_candidate) {
      throw new Error('No selected candidate to generate from.');
    }
    const selectedCandidate = run.selected_candidate;

    run = await writeRun({ ...run, status: 'generating', error: undefined });
    run = await writeRun(updateStep(run, 'fetching_data', 'running', 'Calling Crustdata API.'));

    const rawData = await callCrustdata(
      selectedCandidate.crustdata_query.endpoint,
      selectedCandidate.crustdata_query.params
    );

    await writeRunArtifact(runId, 'crustdata-response.json', JSON.stringify(rawData, null, 2));
    run = await writeRun(updateStep(run, 'fetching_data', 'done'));
    run = await writeRun(updateStep(run, 'finalizing_data', 'running', 'Asking Claude to normalize chart data.'));

    const [base, design] = await Promise.all([readMarkdown('base'), readMarkdown('design')]);
    const shapedResponse = await callAnthropic(`Normalize this Crustdata response into chart-ready post data and caption.

Editorial base:
${base}

Design spec:
${design}

Selected candidate:
${JSON.stringify(selectedCandidate, null, 2)}

Raw Crustdata response:
${JSON.stringify(rawData, null, 2)}

Return JSON:
{
  "data": {
    "title": "post title",
    "subtitle": "post subtitle",
    "rows": [{ "label": "label", "value": 0, "color": "#111111" }],
    "footer": "Data from: Crustdata",
    "source_metadata": { "endpoint": "endpoint hit", "fetched_at": "ISO timestamp" }
  },
  "caption": "2-3 sentence caption"
}`);

    const shaped = extractJsonObject<{ data: GeneratedPostData; caption: string }>(shapedResponse);
    if (!shaped.data?.rows?.length) {
      throw new Error('Finalized data did not include chart rows.');
    }

    await writeRunArtifact(runId, 'data.json', JSON.stringify(shaped.data, null, 2));
    run = await writeRun({ ...updateStep(run, 'finalizing_data', 'done'), data: shaped.data, caption: shaped.caption });
    run = await writeRun(updateStep(run, 'generating_image', 'running', 'Rendering a brand-safe SVG image.'));

    const svg = renderPostSvg(shaped.data, selectedCandidate.visual_template || selectedCandidate.matched_visual || '');
    const imagePath = await writeRunArtifact(runId, 'post.svg', svg);

    return writeRun({
      ...updateStep(run, 'generating_image', 'done'),
      status: 'ready',
      image_path: imagePath,
      logs: [...run.logs, { at: now(), message: 'Generated post is ready for review.' }],
    });
  } catch (error) {
    return failRun(run, error);
  }
}

export async function regeneratePost(runId: string, editPrompt: string) {
  let run = requireRun(await readRun(runId));

  try {
    if (!run.data) {
      throw new Error('No generated data exists to regenerate from.');
    }

    run = await appendLog(run, 'Regenerating post with edit prompt.');
    const revisedResponse = await callAnthropic(`Revise this chart-ready post data using the user's edit prompt.

Current data:
${JSON.stringify(run.data, null, 2)}

User edit prompt:
${editPrompt}

Return JSON:
{
  "data": {
    "title": "post title",
    "subtitle": "post subtitle",
    "rows": [{ "label": "label", "value": 0, "color": "#111111" }],
    "footer": "Data from: Crustdata",
    "source_metadata": {}
  },
  "caption": "2-3 sentence caption"
}`);

    const revised = extractJsonObject<{ data: GeneratedPostData; caption: string }>(revisedResponse);
    const svg = renderPostSvg(
      revised.data,
      run.selected_candidate?.visual_template || run.selected_candidate?.matched_visual || ''
    );
    const imagePath = await writeRunArtifact(runId, 'post.svg', svg);

    return writeRun({
      ...run,
      status: 'ready',
      data: revised.data,
      caption: revised.caption,
      image_path: imagePath,
      error: undefined,
      logs: [...run.logs, { at: now(), message: 'Regenerated post is ready.' }],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return writeRun({
      ...run,
      status: 'ready',
      error: message,
      logs: [...run.logs, { at: now(), message: `Regeneration failed: ${message}` }],
    });
  }
}

export async function saveRun(runId: string) {
  const run = requireRun(await readRun(runId));

  if (run.status !== 'ready' && run.status !== 'saved') {
    throw new Error('Only ready runs can be saved.');
  }

  return writeRun({
    ...run,
    status: 'saved',
    saved_at: now(),
    error: undefined,
    logs: [...run.logs, { at: now(), message: 'Run saved.' }],
  });
}
