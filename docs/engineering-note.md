# SignalTube Engineering Note

## Architecture decision

SignalTube V1 started as a web-first local app. The current phase makes it desktop-first through an Electron macOS shell around the existing Next.js app.

Why:
- The PRD explicitly recommends a responsive local-first web app.
- The supplied Claude-exported design is already a web/React prototype, so web preserves fidelity with the least translation risk.
- Local persistence and no-auth V1 behavior fit a lightweight web architecture very well.
- This keeps the frontend portable if we later wrap it in a desktop shell, while also preserving a clean path to a public web product.
- Electron is the practical desktop path because it preserves the existing UI and keeps Node access for local Codex/Claude/Gemini-style CLI workflows. A SwiftUI rewrite would add risk without improving the current product.

Desktop entry points:
- `npm run desktop` launches the Electron desktop shell.
- `npm run desktop:pack` builds an unsigned local macOS `.app` in `dist/mac-arm64/SignalTube.app`.
- `./script/build_and_run.sh` is the Build macOS Apps plugin-style build/run entrypoint.

## Source ingestion

SignalTube now separates source ingestion from output generation.

Supported source types:
- `youtube`: fetches transcript with `youtube-transcript-plus`, plus title/channel/thumbnail metadata from YouTube oEmbed.
- `medium`: fetches the public page HTML, extracts title/site metadata and readable article/body text.
- `substack`: fetches the public page HTML, extracts title/publication metadata and readable article/body text.

Why:
- YouTube transcripts and article-like sources share the same normalized `sourceText` contract.
- The generation layer no longer assumes every source is a YouTube video.
- Medium/Substack extraction is intentionally lightweight and public-page-only; paywalled/private pages are expected to fail gracefully.

## Chosen analysis approach

V1 now uses a local-first analysis provider with a prompt-driven desktop CLI path.

Primary path:
- Provider abstraction supports `auto`, `codex`, `claude`, `gemini`, and `heuristic`.
- `auto` now prefers Claude CLI when available, then Codex CLI.
- `codex exec` and `claude --print` run locally and generate the memo using the markdown prompt files in the project root.
- This uses the user's existing ChatGPT/Codex access on their machine instead of a server-side API key.

Fallback path:
- By default, failed CLI analysis now surfaces as a user-facing error instead of silently saving a weak memo.
- The internal deterministic memo generator is still available for development/emergency use by setting `SIGNALTUBE_ANALYZER=heuristic` or `SIGNALTUBE_ALLOW_HEURISTIC_FALLBACK=true`.

Why:
- It avoids forcing you or your users to manage server API keys.
- It keeps costs off the app server.
- It preserves a clean provider seam for future Claude CLI, Gemini CLI, or officially supported web auth-based providers.

## Prompt routing and role lens

Prompt files:
- `Article Short Dive Prompt.md` is used when output mode is `short`.
- `Article Deep Dive Prompt.md` is used when output mode is `deep`.
- `Presentation Prompt.md` is used when output mode is `presentation`.

Prompt loading:
- `lib/article-prompt.ts` reads those prompt files directly from the project root and injects runtime context such as source type, selected role, custom role details, and output mode.

The selected role lens is passed into the runtime prompt as `role_lens`:
- HAI Designer
- UX Designer
- Developer
- I’m a kid

Custom roles:
- the homepage role dropdown now supports `Other`
- custom roles are saved in browser/Electron renderer `localStorage`
- the last selected role becomes the default on the next app open
- generated memos persist `roleName` and `roleDetails`
- article and presentation generation both pass the custom role name/details into the runtime prompt
- the custom role modal now requests role-aware placeholder examples on role-name blur through the active local provider when available
- placeholder generation falls back to generic examples if the provider is unavailable, slow, or returns weak output

The prompt builder also adapts the source wording so Medium/Substack body text is treated as source text even when a prompt file mentions "transcript."

Presentation generation returns normal memo fields plus a structured `presentationSlides` array. The app is responsible for rendering those slides inside the SignalTube presentation frame.

## Provider session behavior

SignalTube does not create or save a visible chat thread in its own UI when it uses Claude, Codex, or Gemini.

Current execution path:
- `lib/article-provider-claude.ts` shells out to the Claude CLI with `claude --print --output-format json ...`
- `lib/article-provider-codex.ts` shells out to Codex CLI with `codex exec ...`
- `lib/article-provider-gemini.ts` shells out to Gemini CLI with `gemini -p ...`

What that means in practice:
- the app sends one generated prompt to the local CLI
- it reads back structured output from stdout or a temp file
- it does not persist a chat/session id or build a visible conversation history layer

Important limitation:
- whether a given CLI tool keeps its own local history outside the app is provider-specific and not controlled by SignalTube
- based on the current code, SignalTube itself is using background CLI invocation rather than creating the kind of visible saved chat/session a user would normally browse

## Repos/packages reused

Used now:
- `youtube-transcript-plus`: transcript retrieval in the TypeScript stack

Used as references:
- `youtube-transcript-api`: reliability benchmark and fallback/reference for future Python or service-based transcript handling
- `youtube-to-text`: inspiration for transcript-to-readable-output shaping, not for architecture

## Intentionally not reused

- No repo was copied wholesale into the app.
- No Python microservice was introduced for V1.
- No auth system or cloud database was added.
- No playlist/watch-later automation was added.

## Storage

Processed memos are saved locally as JSON files.

Web/dev path:
- `data/memos/`

Desktop path:
- Electron sets `SIGNALTUBE_DATA_DIR` to the app's macOS Application Support folder, then the same storage layer writes memo JSON there.

Why:
- matches the PRD local-first requirement
- easy to inspect and back up
- easy to swap later for SQLite, Postgres, or cloud sync

## Design implementation notes

The implementation preserves the core editorial system from the supplied HTML:
- DM Sans + Lora typography pairing
- restrained accent color
- low-chrome reading layout
- calm loading state
- exact-ish standalone-style nav, processing screen, and grouped library rows

The HTML export was treated as the UI north star, then refactored into maintainable Next.js components.

## Future-ready seams

The code is structured so these can be added without rewriting the product:
- alternate transcript providers
- model-backed analysis providers
- selectable interpretation lenses
- richer metadata extraction
- database-backed persistence
- search and cross-video analysis
- desktop shell packaging

## Library, tags, and memo state

Library behavior is client-side over the local memo index:
- newest/oldest sorting uses `processedAt`
- search matches title, channel, tags, summary, transcript text, key ideas, concepts, relevance, and deep-dive content
- memo rows support subtle channel badges and generated tags

Tags:
- LLM providers can return tags directly in the structured JSON output
- if tags are missing, `lib/tags.ts` infers a small set from memo content

Delete:
- delete API support remains in place, but visible delete UI is currently hidden
- deletion can be re-enabled later without changing storage

## Presentation mode

Presentation view lives at `/memos/[id]/slides`.

If output mode is `presentation`, the provider prompt asks for structured slides:
- title/orientation
- snapshot summary
- core ideas
- key concepts
- role-aware relevance
- optional closing takeaway

The homepage output selector stores the desired mode during processing and routes to Short Dive, Deep Dive, or Presentation after generation. The detail routes are cross-accessible: Short Dive pages can create/view Deep Dive and Presentation, Deep Dive pages can create/view Short Dive and Presentation, and Presentation pages can create/view both article modes.

The slides UI adapts the local `frontend-slides-main` skill principles into React:
- viewport-fit cards with no internal scroll
- density limits per slide
- editorial Notebook Tabs / Paper & Ink style influence
- subtle reveal motion and reduced-motion compatibility
- subtle Lucide outline icons are used as slide markers for title, summary, ideas, concepts, quotes, and relevance slides

## Desktop feasibility/status layer

`/api/provider-status` reports:
- selected provider
- Codex CLI availability
- Claude CLI availability
- Gemini CLI availability
- local fallback availability

The homepage shows this as a subtle "Working with ..." provider line. If multiple providers are available, the provider name opens a small dropdown. This is intentionally product-like rather than a developer control panel.

## Assets and feedback

Static assets are served from `public/assets` and included in the Electron package via `public/**/*`:
- Claude, Codex, and Gemini SVG provider logos from `AI Tools Logos`
- SignalTube logo
- Mahesh profile photo
- completion notification WAV

The Electron main process explicitly serves `/assets/*` from the packaged app path before handing requests to Next. This avoids desktop-only 404s for public assets inside `app.asar`.

The processing screen plays the notification sound once when generation completes successfully. If the OS/Electron audio context blocks playback, the app catches the error and still completes navigation normally.

## Latest design fidelity pass

The latest `SignalTube.html` was rechecked and the app was brought closer to that source of truth:
- homepage: replaced the older transformation mockup with the source → Signal → article/slides mockup, removed the outdated helper sentence, tightened hero spacing, improved selected dropdown/checkmark styling, and raised dropdown/provider menus above nearby surfaces
- processing: replaced the generic large loader treatment with the compact source card plus editorial progress card, six calm milestone rows, status labels, provider state, and source/output/role chips
- article detail: Short Dive and Deep Dive are separate views instead of tabs, with consistent headers, capped tags, source action, and create/view actions for missing modes
- presentation detail: capped tags at three, added View Article action, fixed header/divider rhythm, and added the same Read next memo footer pattern
- library: updated the search/sort utility row to the latest boxed search input and fixed sort dropdown layering
- onboarding: added a first-run welcome modal with provider-detected and no-provider setup-helper states, provider choice cards, setup tabs, terminal command blocks, copy affordance, and a soft subscription/access note

## Current limitations

- Duration is not reliably available from the current transcript package path, so missing durations are hidden rather than displayed as `Unknown length`.
- The desktop CLI path works locally, but a generic public Vercel deployment still cannot rely on visitors' ChatGPT/Claude consumer subscriptions unless those vendors expose an officially supported web auth flow for third-party sites.
- Claude CLI, Codex CLI, and Gemini CLI are wired as generation providers. Gemini uses the common `gemini -p` non-interactive path and will surface a normal provider error if the installed Gemini CLI exposes a different interface.
- Short transcripts produce shallow memos by design because the source material is thin.
- Local unsigned `.app` builds are supported. Distribution-ready signing/notarization remains a future packaging step.
