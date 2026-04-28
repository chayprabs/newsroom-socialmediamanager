# Newsroom

Newsroom is a Next.js app for generating Crustdata-style data posts from live trend signals.

## Local Setup

Install dependencies:

```bash
npm install
```

Create local environment variables:

```bash
cp .env.example .env.local
```

Then fill in:

```bash
NEWSROOM_USERNAME=
NEWSROOM_PASSWORD=
NEWSROOM_SESSION_SECRET=
ANTHROPIC_API_KEY=
GROK_API_KEY=
CRUSTDATA_API_KEY=
CRUSTDATA_API_VERSION=
OPENAI_API_KEY=
OPENAI_IMAGE_MODEL=gpt-image-2
```

Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Required Local Files

The pipeline reads these markdown files:

```text
base/base.md
design/design.md
```

You can create or edit both files from the app through **Manage base** and **Manage design**.

For seed extraction, place source corpus files under:

```text
base/source/
```

Supported source file types are `.md`, `.mdx`, `.txt`, and `.json`.

## App Flow

1. Sign in with the hardcoded demo credentials from `.env.local`.
2. Open the dashboard and start a new run.
3. Newsroom asks Claude to build a Grok trend query.
4. Grok returns trend candidates from X.
5. Claude scores and reframes the best three ideas.
6. Pick one idea.
7. Newsroom calls Crustdata, normalizes chart data, generates the image with OpenAI GPT Image 2, and writes a caption.
8. Review, download, edit/regenerate, or save the run.

## API Notes

Crustdata responses are cached for local development under:

```text
research/api_responses/cache/
```

The cache is ignored by git. By default it lives for 24 hours. You can change that with:

```bash
NEWSROOM_CACHE_TTL_HOURS=24
NEWSROOM_DISABLE_API_CACHE=0
NEWSROOM_COOKIE_SECURE=0
OPENAI_IMAGE_SIZE=1024x1536
OPENAI_IMAGE_QUALITY=high
OPENAI_IMAGE_FORMAT=png
```

## Auth

Auth is enforced by Next middleware with a signed HttpOnly cookie. Protected routes cannot be opened directly unless the cookie is valid.

## Vercel Notes

Set the same environment variables in Vercel. Local filesystem storage is fine for development, but Vercel filesystem writes are temporary. For durable saved runs in production, move run storage to Vercel Blob/KV or a database.
