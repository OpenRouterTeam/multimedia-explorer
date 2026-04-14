# Multimedia Explorer

An open-source example app from [OpenRouter](https://openrouter.ai) that shows how to build a multi-model media generation tool where you can use text, image, and video models together. Get access to dozens of media models just by signing in with an OpenRouter account. Try out a hosted version at https://multimedia-explorer.openrouter.ai/

## What it does

**Image and video generation** from a unified prompt interface. Pick a model, type a prompt, and get results — images return instantly, videos run as async jobs with status polling.

**Dynamic model discovery.** The app calls `client.models.list()` with `output_modalities=image|video|text` to fetch available models at runtime. Nothing is hardcoded — when OpenRouter adds a new model, it shows up automatically. Video model configs (supported durations, resolutions, audio) come from the `/api/v1/videos/models` endpoint.

**Brand moodboards.** Paste a website URL or describe a mood, and the app uses a text model to extract a brand identity — colors, personality traits, visual style, tone — that gets injected into every subsequent generation as system context.

**Reference images.** Upload or paste image URLs to send as multimodal input alongside your text prompt.

**Generation history.** A visual timeline stores your last 50 generations with hover previews. Click any entry to restore the full context — prompt, model, references, settings — so you can iterate on past work.

## How it uses the OpenRouter API

The entire app runs through the [`@openrouter/sdk`](https://www.npmjs.com/package/@openrouter/sdk):

```typescript
import OpenRouter from "@openrouter/sdk";

const client = new OpenRouter({ apiKey });
```

### Model discovery

```
GET /api/v1/models?output_modalities=image   → image models
GET /api/v1/models?output_modalities=video   → video models
GET /api/v1/models?output_modalities=text    → text models (for moodboard analysis)
GET /api/v1/videos/models                    → video model capabilities (durations, resolutions, audio)
```

### Image generation

A single `POST` to the chat completions endpoint with multipart messages — text prompt, optional base64 reference images, and optional brand context as a system message.

### Video generation

Video is async and job-based:

1. **Submit** — `POST /api/v1/videos/generations` with prompt, model, duration, resolution, and aspect ratio. Returns a job ID.
2. **Poll** — `GET /api/v1/videos/generations/{jobId}` every 5 seconds until status is `completed` or terminal (`failed`, `cancelled`, `expired`).
3. **Download** — `GET /api/v1/videos/generations/{jobId}/content` returns the MP4.

### Authentication

Users sign in with their OpenRouter account via OAuth. See [`sign-in-with-openrouter`](https://github.com/OpenRouterTeam/sign-in-with-openrouter) for details on the auth flow.

## API routes

| Route | Purpose |
|---|---|
| `GET /api/models` | Fetch image, video, and text models + video model configs |
| `POST /api/generate` | Generate an image from prompt, references, and brand context |
| `POST /api/moodboard` | Analyze a URL or description to extract brand identity |
| `POST /api/improve-prompt` | Rewrite a prompt to be more detailed and effective |
| `POST /api/video/submit` | Submit an async video generation job |
| `GET /api/video/[jobId]` | Poll video job status |
| `GET /api/video/[jobId]/content` | Download completed video |

## Architecture

```
app/
├── api/
│   ├── models/          # Dynamic model discovery
│   ├── generate/        # Image generation
│   ├── moodboard/       # Brand identity extraction
│   ├── improve-prompt/  # Prompt enhancement
│   └── video/           # Video submit, poll, download
├── page.tsx             # State management and layout
└── components/          # UI (form, moodboard, cards, timeline)

hooks/
├── use-models.ts             # Fetch and cache models
├── use-openrouter-auth.ts    # OAuth context
└── use-video-generation.ts   # Video job state machine

lib/
├── openrouter.ts        # SDK client factory
├── openrouter-auth.ts   # OAuth 2.0 PKCE flow
├── history-db.ts        # IndexedDB for image/video storage
└── types.ts             # Shared types
```

All user data is client-side: metadata in `localStorage`, image blobs in `IndexedDB`.

## Getting started

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your OpenRouter account.

Optionally, copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_OPENROUTER_API_KEY` to skip OAuth during development.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router)
- [React](https://react.dev) 19
- [OpenRouter SDK](https://www.npmjs.com/package/@openrouter/sdk)
- [Tailwind CSS](https://tailwindcss.com) v4
- TypeScript 5

## License

MIT
