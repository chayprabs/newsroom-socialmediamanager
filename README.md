<div align="center">

# Newsroom

### An editorial AI pipeline that turns live X trends into Crustdata‑style data posts.

**Grok finds the story. Claude judges and reframes it. Crustdata proves it. GPT‑Image‑2 renders it.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Anthropic](https://img.shields.io/badge/Anthropic-Claude%20Sonnet-cc785c)](https://www.anthropic.com)
[![xAI](https://img.shields.io/badge/xAI-Grok-000000)](https://x.ai)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--Image--2-412991?logo=openai&logoColor=white)](https://openai.com)
[![Crustdata](https://img.shields.io/badge/Crustdata-API%202025--11--01-2563eb)](https://crustdata.com)
[![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)

</div>

> **A note on what this is.** I built Newsroom independently as a portfolio project. It is **not affiliated with, endorsed by, or maintained by Crustdata.** It is a faithful re‑implementation of the editorial pipeline behind their data posts, built to demonstrate how I'd ship the kind of system their team works on every day — multi‑provider AI orchestration, audited API integrations, prompt caching, JSON‑constrained agents, and image generation with hard guardrails. If you're on the Crustdata team and you're reading this: hi, I'd love to talk.

---

## Table of Contents

- [Why I built this](#why-i-built-this)
- [What it does](#what-it-does)
- [Live pipeline](#live-pipeline)
- [Why the engineering choices matter](#why-the-engineering-choices-matter)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Required local files](#required-local-files)
- [Scripts](#scripts)
- [App flow](#app-flow)
- [API reference](#api-reference)
- [Editorial DNA: `base.md` and `design.md`](#editorial-dna-basemd-and-designmd)
- [The audited Crustdata endpoint registry](#the-audited-crustdata-endpoint-registry)
- [Query validation](#query-validation)
- [Anthropic prompt caching strategy](#anthropic-prompt-caching-strategy)
- [Image generation quality](#image-generation-quality)
- [Per‑run artifacts and observability](#perrun-artifacts-and-observability)
- [Authentication and middleware](#authentication-and-middleware)
- [Storage model](#storage-model)
- [Testing](#testing)
- [Deployment](#deployment)
- [Roadmap and known limitations](#roadmap-and-known-limitations)
- [Acknowledgements](#acknowledgements)
- [License](#license)

---

## Why I built this

If you spend any time in startup/AI Twitter, you've seen Crustdata's data posts. They're deceptively simple: one chart, one headline, one number that lands. Behind each one is an opinionated process — a topic worth posting, a clean Crustdata query that actually returns what the headline implies, a chart shape that matches their visual identity, and a caption that sounds like Crustdata.

That process is a real systems problem. The interesting parts aren't "call an LLM" — they are:

- **Discipline.** Most candidate ideas can't be answered by Crustdata's API. The pipeline must reject them early instead of hallucinating data.
- **Editorial fit.** Even feasible ideas have to fit Crustdata's voice and visual templates, not generic chart styles.
- **Cost.** Multi‑stage agentic pipelines are expensive if every Sonnet call re‑sends the entire knowledge base. Prompt caching is non‑optional.
- **Determinism.** Image generation has to produce the same chart twice if you re‑run it.
- **Observability.** When a run goes wrong, you need to be able to reproduce exactly what each model saw and returned.

Newsroom is my attempt at that system end‑to‑end. The pipeline is real, the validators are real, and every model call is logged with token usage so you can audit costs and prompt‑cache hit rates per run.

---

## What it does

You sign in, click **New run**, and Newsroom does the rest:

1. Asks Claude Sonnet to write a Grok query scoped to Crustdata's editorial topics.
2. Sends it to Grok and gets back trend candidates from X.
3. Sends those candidates to Sonnet for a two‑pass **score → reframe** evaluation, mapping each one onto the audited Crustdata endpoint registry.
4. Shows you the top three candidates that survived feasibility checks. You pick one.
5. Calls the chosen Crustdata endpoint, validates the response, and asks Sonnet to normalize it into chart‑ready rows.
6. Has Sonnet build a focused GPT‑Image‑2 prompt from `design.md`, then renders the post image.
7. Has Sonnet draft a caption in Crustdata's voice.
8. Drops you on a **Review** screen where you can edit, regenerate, download, or save the run.

Every step streams progress over Server‑Sent Events, and every artifact (prompts, raw responses, rendered image, usage stats) is persisted under `runs/<id>/` for later inspection.

---

## Live pipeline

```
   Stage 1            Stage 2                    Stage 3            Stage 4              Stage 5
   ─────────          ────────                   ─────────          ─────────            ─────────

   Sonnet builds      Sonnet scores all          Crustdata          Sonnet builds        Sonnet writes
   a scoped Grok ──►  candidates (Pass 1)   ──►  endpoint     ──►   GPT‑Image‑2     ──►  caption in
   query                     │                   call + JSON         prompt              Crustdata voice
        │                    ▼                   normalisation        │
        ▼              Sonnet reframes           into chart‑ready     ▼
   Grok returns       feasible top 3             rows                GPT‑Image‑2
   candidates         (Pass 2) and picks                             renders the
   from X             a Crustdata endpoint                           post image
                      from the audited registry
```

Each stage corresponds to a small, single‑purpose function in `src/lib/server/pipeline.ts`. The stages are independently testable, each Sonnet call writes a usage record, and Pass 1 vs Pass 2 of Stage 2 are split deliberately so the cheap "scoring" prompt doesn't carry the heavier reframer schema.

---

## Why the engineering choices matter

This is the section I'd most want a reviewer to read. The interesting work isn't the orchestration — it's everything that prevents the orchestration from going off the rails.

| Concern | What I built |
| --- | --- |
| **Hallucinated endpoints** | An audited [`endpoint_capabilities.ts`](src/lib/server/clients/crustdata/endpoint_capabilities.ts) registry pinned to Crustdata API version `2025-11-01`. Every Sonnet stage receives this registry; the reframer is told to use exactly one usable endpoint family per candidate. |
| **Hallucinated params** | A query validator (`src/lib/server/pipeline.ts`) that walks every reframed query, rejects unknown params, validates `required_params`, validates `required_one_of` mutual exclusion, and walks the entire `filters` tree to verify operators and field paths. |
| **Too‑narrow queries** | A "data richness" validator that flags `/company/search`, `/person/search`, and `/job/search` queries with more than 5 filter conditions or fewer than 5 expected rows, so Stage 2 can't pick queries that will return empty charts. |
| **Out‑of‑scope topics** | Hardcoded `UNSUPPORTED_QUESTION_PATTERNS` (sentiment, HN comments, comment sentiment) that fail candidates fast before they hit Crustdata. |
| **Cost** | Anthropic prompt caching with `cache_control: ephemeral` on `base.md` and `design.md`. The static project preamble is the same text, byte‑for‑byte, across every Sonnet call so the prefix actually caches. |
| **Determinism** | Tool‑use forced output for the image prompt builder — Sonnet must call `submit_image_prompt(prompt, template_used, character_count)`, so we never have to parse free‑form text. |
| **Hard caps** | The image prompt has a 25,000‑char hard cap, well under GPT‑Image‑2's 32,000 limit, and a `stage_4_prompt_cap_violation` event is logged if Sonnet ever produces a prompt over the cap. |
| **Observability** | Per‑run `pipeline.log` with structured JSON entries and a derived `usage_summary.json` that aggregates input/output tokens, cache reads, and cache writes per stage and per run. |
| **Reproducibility** | Every stage writes its prompts and raw model responses into `runs/<id>/debug/`, served back through `GET /api/runs/[id]/debug`. |

---

## Tech stack

| Layer | Tools |
| --- | --- |
| **Framework** | Next.js 15 (App Router), React 18, TypeScript 5.9 |
| **UI** | Tailwind CSS 4, shadcn/ui (Radix primitives), Lucide icons, Sonner toasts, Motion |
| **State** | React Hook Form, custom `useRunState` hook, SSE streaming for pipeline progress |
| **AI providers** | Anthropic Claude Sonnet (`claude-sonnet-4-6`), xAI Grok (`grok-4.20-reasoning`), OpenAI GPT‑Image‑2 |
| **Data** | Crustdata API, version `2025-11-01`, audited endpoint registry |
| **Auth** | `jose`‑signed JWT in an HttpOnly cookie, enforced via Next middleware |
| **Persistence** | Filesystem (`runs/`, `base/`, `design/`) with `NEWSROOM_DATA_DIR` override |
| **Tests** | Vitest |
| **Deployment** | Vercel‑ready (with caveats; see [Deployment](#deployment)) |

---

## Project structure

```
.
├── base/                       # Editorial DNA loaded into every Sonnet prompt
│   ├── base.md                 # Topic scope, voice, archetypes, source priority
│   └── source/                 # Optional seed corpus for base.md extraction
├── design/                     # Visual spec loaded into the image prompt builder
│   └── design.md               # Templates, palette, typography, layout rules
├── runs/                       # Per‑run artifacts (gitignored)
│   └── <run_id>/
│       ├── run.json            # The full RunState
│       ├── pipeline.log        # JSONL log of every Sonnet call + custom events
│       ├── usage_summary.json  # Aggregated token + cache usage by stage
│       ├── debug/              # Raw prompts and model responses per stage
│       ├── post_raw.png        # Pre-footer raw image from Stage 4b
│       └── post.png            # Final Stage 4c composited post image
├── public/                     # Static assets (favicon, manifest, OG image)
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # Auth, base, design, runs, streaming, debug
│   │   ├── components/         # Page‑level + shadcn UI components
│   │   ├── dashboard/          # Run list
│   │   ├── generating/         # Live pipeline progress (SSE)
│   │   ├── pick-idea/          # Choose 1 of 3 reframed candidates
│   │   ├── review/             # Edit, regenerate, save
│   │   ├── manage-base/        # Edit base.md in‑app
│   │   ├── manage-design/      # Edit design.md in‑app
│   │   └── runs/[id]/          # Run detail + Usage section
│   ├── lib/
│   │   ├── pipeline/           # Pure stage logic, JSON parsing, token logger
│   │   │   ├── scoreCandidates.ts
│   │   │   ├── reframeCandidates.ts
│   │   │   ├── imagePromptBuilder.ts
│   │   │   ├── jsonDiagnostics.ts
│   │   │   ├── parseSonnetJson.ts
│   │   │   └── tokenLogger.ts
│   │   ├── server/             # API clients, storage, image rendering
│   │   │   ├── clients.ts
│   │   │   ├── clients/crustdata/endpoint_capabilities.ts
│   │   │   ├── pipeline.ts     # The orchestrator
│   │   │   ├── storage.ts
│   │   │   ├── image.ts
│   │   │   ├── cache.ts        # Local Crustdata response cache
│   │   │   └── json.ts
│   │   ├── session.ts          # Signed cookie helpers (jose)
│   │   └── types.ts            # RunState, CandidateSpec, UsageSummary, etc.
│   ├── middleware.ts           # Auth gate
│   └── styles/                 # Tailwind, fonts, theme
├── .env.example
├── next.config.mjs
├── package.json
└── README.md
```

---

## Getting started

### Prerequisites

- **Node.js 20+** (Next.js 15 requires it)
- **npm** (a `package-lock.json` is committed)
- API keys for **Anthropic**, **xAI Grok**, **Crustdata**, and **OpenAI**

### 1. Clone and install

```bash
git clone <your-repo-url>
cd newsroom
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in the values from [Environment variables](#environment-variables).

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the demo credentials you set in `.env.local`.

---

## Environment variables

### Required

| Variable | Purpose |
| --- | --- |
| `NEWSROOM_USERNAME` | Demo login username |
| `NEWSROOM_PASSWORD` | Demo login password |
| `NEWSROOM_SESSION_SECRET` | 32‑byte secret used to sign session cookies |
| `ANTHROPIC_API_KEY` | Claude Sonnet (judge, reframer, prompt builder, caption writer) |
| `ANTHROPIC_MODEL` | Defaults to `claude-sonnet-4-6` |
| `GROK_API_KEY` | xAI Grok (X trend discovery) |
| `GROK_MODEL` | Defaults to `grok-4.20-reasoning` |
| `CRUSTDATA_API_KEY` | Crustdata data fetches |
| `CRUSTDATA_API_VERSION` | API version, currently `2025-11-01` |
| `OPENAI_API_KEY` | GPT‑Image‑2 |

### Image generation (OpenAI)

| Variable | Default |
| --- | --- |
| `OPENAI_IMAGE_MODEL` | `gpt-image-2` |
| `OPENAI_IMAGE_SIZE` | `1024x1536` |
| `OPENAI_IMAGE_QUALITY` | `high` |
| `OPENAI_IMAGE_FORMAT` | `png` |
| `OPENAI_IMAGE_BACKGROUND` | `opaque` |
| `OPENAI_IMAGE_EXPORT_SIZE` | `1080x1350` |
| `OPENAI_IMAGE_SAFE_AREA` | `1024x1280` |

### Optional / local‑only

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Used for OG metadata |
| `NEWSROOM_DATA_DIR` | `process.cwd()` | Override where `runs/`, `base/`, `design/` live |
| `NEWSROOM_CACHE_TTL_HOURS` | `24` | Crustdata response cache lifetime |
| `NEWSROOM_DISABLE_API_CACHE` | `0` | Set `1` to bypass the local API cache |
| `NEWSROOM_COOKIE_SECURE` | `0` | Set `1` to force secure cookies in dev |

---

## Required local files

The pipeline reads two markdown files at runtime. Both can be edited from the app via **Manage base** and **Manage design**.

```text
base/base.md      # Editorial DNA: topic scope, voice, archetypes, source priority
design/design.md  # Visual spec: templates, palette, layout, typography
```

For seed extraction (Stage 0 helper that re‑generates `base.md` from a corpus of source posts), drop files under:

```text
base/source/      # Supports .md, .mdx, .txt, .json
```

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run test` | Run Vitest in CI mode |

---

## App flow

1. **Sign in** with the demo credentials from `.env.local`.
2. Open the **Dashboard** and start a new run.
3. Newsroom asks Claude Sonnet to build a Grok trend query scoped to Crustdata's editorial topics.
4. Grok returns trend candidates from X.
5. Sonnet does a two‑pass evaluation: **score** every candidate against the audited endpoint registry, then **reframe** only the feasible top three into post‑ready specs.
6. **Pick one idea.**
7. Newsroom calls Crustdata, validates and normalizes the response into chart‑ready rows, builds a focused image prompt from `design.md`, renders the image with GPT‑Image‑2, and writes a caption.
8. **Review.** Download, edit, regenerate, or save the run.

---

## API reference

All routes live under `src/app/api/` and are protected by middleware (except `/api/auth/*`).

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Issue a signed session cookie |
| `POST` | `/api/auth/logout` | Clear the session cookie |
| `GET` | `/api/runs` | List run summaries |
| `POST` | `/api/runs` | Create a new run |
| `GET` | `/api/runs/[id]` | Fetch a single run's full state |
| `GET` | `/api/runs/[id]/stream` | Server‑Sent Events for live pipeline progress |
| `POST` | `/api/runs/[id]/discover` | Run Stage 1 + 2 (Grok discovery + Sonnet score/reframe) |
| `POST` | `/api/runs/[id]/select` | Select one candidate to generate |
| `POST` | `/api/runs/[id]/generate` | Run Stage 3–5 (Crustdata + image + caption) |
| `POST` | `/api/runs/[id]/regenerate` | Regenerate the image and/or caption |
| `POST` | `/api/runs/[id]/save` | Mark the run as saved |
| `GET` | `/api/runs/[id]/image` | Stream the rendered post image |
| `GET` | `/api/runs/[id]/debug` | List debug artifacts for a run |
| `GET` | `/api/runs/[id]/debug/[file]` | Download a specific debug artifact |
| `GET`/`PUT` | `/api/base` | Read or update `base/base.md` |
| `POST` | `/api/base/reset` | Restore `base.md` from `base/default.md` |
| `POST` | `/api/base/extract` | Extract a fresh `base.md` from `base/source/` |
| `GET`/`PUT` | `/api/design` | Read or update `design/design.md` |
| `POST` | `/api/design/reset` | Restore `design.md` from `design/default.md` |

---

## Editorial DNA: `base.md` and `design.md`

`base/base.md` is the editorial source of truth — topic scope, voice, archetypes, allowed/excluded subject matter, source‑priority policy, and confidence thresholds. `design/design.md` is its visual counterpart — templates, canvas dimensions, palette, typography, and layout rules.

Both files are designed to be **stable runtime prefixes**. They're loaded into the system message of every Sonnet call that needs them, in the same order, byte‑for‑byte, so Anthropic's prompt cache can actually take effect (see [Anthropic prompt caching strategy](#anthropic-prompt-caching-strategy)).

You can edit them in‑app, reset them to a checked‑in default, or — for `base.md` only — re‑extract them from a seed corpus under `base/source/`.

---

## The audited Crustdata endpoint registry

`src/lib/server/clients/crustdata/endpoint_capabilities.ts` is the most important file in this repo. It's the single source of truth for which Crustdata endpoints Newsroom is allowed to use.

Each entry declares:

```ts
{
  endpoint: string;
  method: 'POST';
  api_version: '2025-11-01';
  availability: 'usable' | 'unavailable';
  unavailable_reason?: string;
  can_answer: readonly string[];
  supported_intents: readonly string[];
  required_params: readonly string[];
  required_one_of?: readonly string[];
  optional_params: readonly string[];
  returns_shape: string;
  known_limitations: readonly string[];
  example_question: string;
  example_query: Record<string, unknown>;
  docs_url: string;
  valid_filter_fields?: readonly string[];
  valid_sort_fields?: readonly string[];
  valid_aggregation_columns?: readonly string[];
  valid_field_groups?: readonly string[];
  valid_return_fields?: readonly string[];
  valid_operators?: readonly string[];
  limit?: { min: number; max: number };
}
```

The registry is intentionally **hand‑maintained**. Every Sonnet stage that has to pick an endpoint receives a formatted dump of this registry in its prompt. The reframer is told, in plain English, that it must use exactly one usable endpoint family from this list and that it cannot invent params or operators.

This is the single biggest reason Newsroom doesn't hallucinate Crustdata calls.

---

## Query validation

Trusting Sonnet to follow the registry isn't enough — the orchestrator validates every reframed query before it leaves the process. The relevant code lives in `src/lib/server/pipeline.ts`.

Validation passes:

1. **`isUsableCrustdataEndpoint`** — the endpoint must exist in the registry and be marked `usable`.
2. **`validateRequiredParams`** — `required_params` must all be present; if `required_one_of` is set, exactly one of those identifiers must be present.
3. **`validateParamNames`** — every key in `params` must be either a `required_param`, a `required_one_of` key, or an `optional_param`.
4. **`validateFilterTree`** — recursive walk of the `filters` object; verifies `op` is `and`/`or`, `conditions` is non‑empty, every leaf has a `field`, and every `field` is either in `valid_filter_fields` or under a documented field group prefix.
5. **`validateDataRichness`** — for `/company/search`, `/person/search`, and `/job/search`, rejects queries with more than 5 filter conditions or with `limit < 5` and no `aggregations`, because such queries will produce empty‑looking charts.
6. **`unsupportedQuestionReason`** — text scan for sentiment / HN‑comment patterns that no Crustdata endpoint can answer.

Any violation flips the candidate's `feasible` flag to `false` with a short reason and the candidate drops out before it ever reaches the user.

---

## Anthropic prompt caching strategy

Multi‑stage Sonnet pipelines are expensive when every call re‑sends the entire knowledge base. Newsroom is built around Anthropic's [prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching).

The strategy is simple but disciplined:

- The system message for every Sonnet call is built from a fixed sequence of `AnthropicTextBlock`s.
- The first block is `STATIC_PROJECT_CONTEXT` — a constant string defined in `pipeline.ts` and `imagePromptBuilder.ts`. **Same string, byte‑for‑byte, in every call.**
- The next block is usually `base.md`, marked with `cache_control: { type: 'ephemeral' }`, for editorial stages that need topic scope and voice.
- Stages that need visual guidance receive `design.md`, also marked `ephemeral`. Stage 4a intentionally reads `design.md` only — it does not load `base.md`.
- Dynamic per‑run data — candidates, scored results, chart rows — lives in the **user message**, never the cached prefix.

The result: the first Sonnet call in a run pays for `cache_creation_input_tokens`; every subsequent call that reuses the same prefix shows `cache_read_input_tokens` and charges a fraction of the uncached price.

To verify it's working, open `runs/<runId>/usage_summary.json` or the **Usage** section on the run detail page:

```jsonc
{
  "total_input_tokens": 14233,
  "total_output_tokens": 2104,
  "total_cache_reads": 38942,    // should grow across stages
  "total_cache_writes": 9847,    // should mostly happen on the first call
  "total_sonnet_calls": 5,
  "stage_2_total": { ... },
  "stage_4_total": { ... },
  "by_stage": [ ... ]
}
```

If `total_cache_reads` stays at zero across later calls, the prefix is not being reused byte‑for‑byte — that's the bug to chase.

---

## Image generation quality

Stage 4 is split into three sub‑steps:

1. **Stage 4a — prompt builder.** Sonnet reads `design/design.md`, fills the matching worked-example skeleton, and returns a structured `submit_image_prompt` tool call with `prompt`, `template_used`, `character_count`, and `hex_colors_used`.
2. **Stage 4b — image call.** The validated prompt is sent to GPT‑Image‑2 and saved as `runs/<runId>/post_raw.png`.
3. **Stage 4c — footer overlay.** `src/lib/pipeline/footerOverlay.ts` resizes the raw image to the export size and composites `public/assets/brand/crustdata-footer.png` onto the bottom, producing the canonical `runs/<runId>/post.png`.

`src/lib/pipeline/imagePromptValidator.ts` runs between 4a and 4b. It blocks prompts that are missing required visual elements: the lavender background hex `#E8E6F5`, `full bleed`/`full-bleed`, `EMPTY FOOTER ZONE`, the exact instruction `Do NOT render "Data from:"`, a bottom 12%/bottom 184px footer-zone instruction, a do-not-crop headline instruction, portrait layout language, and at least three literal hex colors. It also logs warnings for footer/brand rendering language, vague style phrases like `in the Crustdata style`, rainbow/varied color language, and suspicious rounded-bar wording.

Canvas dimensions come from env at module load:

| Variable | Default | Used for |
| --- | --- | --- |
| `OPENAI_IMAGE_SIZE` | `1024x1536` | GPT‑Image‑2 API generation canvas; prompts describe this as portrait rather than a visible frame |
| `OPENAI_IMAGE_SAFE_AREA` | `1024x1280` | legacy debug/env value only; no longer used as a crop box |
| `OPENAI_IMAGE_EXPORT_SIZE` | `1080x1350` | final dashboard/download export; Stage 4c resizes with `cover`/`top` before applying the footer |
| `OPENAI_IMAGE_BACKGROUND` | `opaque` | OpenAI API background mode; prompt still pins lavender `#E8E6F5` |

The builder substitutes the relevant env values into `design.md` placeholders and into the Stage 4a system prompt before calling Sonnet. The OpenAI API still receives an exact generation size; the generated post reserves the bottom 12% as empty lavender and Stage 4c owns the final export resize plus footer composite.

When an image fails to match expectations, inspect `runs/<runId>/debug/` or use the **View debug bundle** section in the UI. The most useful files are `stage_4_image_prompt.txt`, `stage_4_image_prompt_meta.json`, `stage_4a_validation_result.json`, `stage_4a_env_snapshot.json`, `stage_4a_attempt_*.txt`, `stage_4c_footer_overlay.json`, and root-level `post_raw.png`. Validation failures also preserve `stage_4a_validation_failure_*.json`.

`design/design.md` is the source of truth for visual specs. To change the chart look — background, typography, chart skeletons, color rules, or portrait layout language — edit `design.md`, not the pipeline code. To change the footer appearance, replace `public/assets/brand/crustdata-footer.png`.

### Why is the footer pixel-perfect?

Generative image models cannot reliably reproduce vector logo assets or render small text consistently. To guarantee brand consistency, Newsroom uses a hybrid pipeline: GPT-image-2 generates the chart, headline, and background, while a deterministic Node-based compositing step (Stage 4c) overlays a real Crustdata footer asset onto every image. This means:

- The footer is identical across every generated post.
- The Crustdata logo is the real vector mark, not an AI approximation.
- Updating the footer is a one-file replacement (`public/assets/brand/crustdata-footer.png`), no code change required.

---

## Per‑run artifacts and observability

Every run leaves a complete audit trail under `runs/<run_id>/`:

```
runs/<run_id>/
├── run.json                 # Full RunState (status, candidates, steps, usage_summary)
├── pipeline.log             # JSONL log of every Sonnet call + custom events
├── usage_summary.json       # Aggregated tokens, cache reads, cache writes per stage
├── debug/
│   ├── stage_1_grok_query.txt
│   ├── stage_1_grok_response.json
│   ├── stage_2_score_prompt.txt
│   ├── stage_2_score_response.json
│   ├── stage_2_reframe_prompt.txt
│   ├── stage_2_reframe_response.json
│   ├── stage_3_crustdata_query.json
│   ├── stage_3_crustdata_response.json
│   ├── stage_3_normalised_data.json
│   ├── stage_4a_env_snapshot.json
│   ├── stage_4a_attempt_1.txt
│   ├── stage_4a_validation_result.json
│   ├── stage_4_image_prompt.txt
│   ├── stage_4_image_prompt_meta.json
│   ├── stage_4c_footer_overlay.json
│   ├── stage_5_caption_prompt.txt
│   └── stage_5_caption_response.json
├── post_raw.png             # Pre-footer raw image
└── post.png                 # Final Stage 4c composited post image
```

The `pipeline.log` is JSONL of structured events:

```jsonc
{ "event": "sonnet_usage", "stage": "stage_2_score", "run_id": "...", "input_tokens": 4123, "output_tokens": 412, "cache_creation_input_tokens": 9847, "cache_read_input_tokens": 0, ... }
{ "event": "sonnet_usage", "stage": "stage_2_reframe", "run_id": "...", "input_tokens": 1023, "output_tokens": 1843, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 9847, ... }
{ "event": "stage_4_prompt_cap_violation", "run_id": "...", "promptLength": 25431, "cap": 25000, "templateUsed": "ranked_horizontal_bar", "firstChars": "...", "lastChars": "..." }
{ "event": "stage_usage", "stage": "stage_4c_footer_overlay", "runId": "...", "durationMs": 42, "footerSource": "asset", "success": true, ... }
```

`usage_summary.json` is rebuilt automatically every time `logSonnetUsage` is called, so the run detail page always shows live numbers — no separate background job, no manual flush.

---

## Authentication and middleware

Auth is enforced by Next middleware at `src/middleware.ts`, using a signed JWT in an HttpOnly cookie issued by `src/lib/session.ts` (built on `jose`).

- Static assets (`/_next/*`), `/api/auth/*`, and `/favicon.ico` bypass the gate.
- Authenticated users hitting `/` are redirected to `/dashboard`.
- Unauthenticated requests to API routes get `401 Unauthorized`.
- Unauthenticated requests to page routes get redirected to `/`.

The login flow is intentionally minimal — a single hardcoded demo user from `.env.local`. Replace it with a real auth provider before exposing this anywhere public.

---

## Storage model

By default everything lives on the local filesystem under the project root:

```text
base/             # Editorial knowledge files
design/           # Visual spec files
runs/             # Per‑run artifacts (state.json, image.png, prompts, logs, usage)
research/         # API response cache (gitignored)
```

Override the root with `NEWSROOM_DATA_DIR`. On Vercel, storage automatically falls back to `/tmp/newsroom`, which is **ephemeral** — so for durable production storage you'd swap `src/lib/server/storage.ts` to use Vercel Blob, KV, or your database of choice (see [Deployment](#deployment)).

Crustdata responses are also cached locally for development under:

```text
research/api_responses/cache/    # gitignored, 24h TTL by default
```

Tune with `NEWSROOM_CACHE_TTL_HOURS` and `NEWSROOM_DISABLE_API_CACHE`.

---

## Testing

Unit and integration tests run via Vitest:

```bash
npm run test
```

Notable test suites:

| Suite | What it covers |
| --- | --- |
| `src/lib/pipeline/parseSonnetJson.test.ts` | Robust JSON extraction from Sonnet output (markdown fences, stray prose, trailing commas) |
| `src/lib/pipeline/imagePromptBuilder.test.ts` | Image prompt assembly + tool‑use parsing + cap enforcement |
| `src/lib/server/pipeline.test.ts` | End‑to‑end orchestration with mocked clients across all five stages |
| `src/lib/server/image.test.ts` | Image normalization and SVG fallback rendering |
| `src/lib/server/clients.test.ts` | Anthropic / Grok / Crustdata / OpenAI client wrappers |

---

## Deployment

Newsroom runs cleanly on **Vercel**:

1. Set every variable from [Environment variables](#environment-variables) in the Vercel project.
2. Deploy.

> **Important:** Vercel's filesystem is read‑only outside of `/tmp`, and `/tmp` is wiped between invocations. Local filesystem storage is fine for development, but for **durable saved runs** in production you should swap `src/lib/server/storage.ts` to use Vercel Blob, KV, or your database of choice.

`base/base.md` and `design/design.md` are bundled with the deploy and are read‑only on Vercel unless you wire up the same external storage.

---

## Roadmap and known limitations

Honest list of what I'd do next:

- **Durable production storage.** Swap filesystem `storage.ts` for a Blob/KV adapter so saved runs survive on Vercel.
- **Auth provider.** Replace the demo username/password with a proper provider (NextAuth, Clerk, etc.) before exposing this publicly.
- **Multi‑user runs.** Right now there's a single demo user; multi‑tenant storage would scope `runs/` per user.
- **Background regeneration.** Caption regeneration is synchronous; for image regeneration with retries it should move to a queue.
- **More chart templates.** `design.md` covers the most common Crustdata templates but not the long tail.
- **Endpoint registry sync.** The registry is hand‑audited; a periodic diff against Crustdata's docs would catch drift.
- **Cost dashboard.** The per‑run usage numbers exist; rolling them up into a cross‑run dashboard would be one screen of work.

---

## Acknowledgements

- **Crustdata** for the editorial style this pipeline imitates and for shipping the API that makes data‑backed posts possible.
- **Anthropic, xAI, OpenAI** for the underlying models.
- **Radix UI**, **shadcn/ui**, **Tailwind**, and **Lucide** for letting me skip past the boring parts of UI work.

---

## License

MIT. Use it, fork it, learn from it. If you're at Crustdata and any of this is useful, that's the whole point.

<div align="center">

Built independently as a portfolio project. Not affiliated with Crustdata.

</div>
