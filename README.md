# SignalTube

SignalTube turns long-form content into role-aware articles and presentations that help you understand what matters faster.

Instead of giving every reader the same bland summary, it adapts the output to a chosen role or perspective so the same source can feel more useful to a designer, developer, researcher, student, or team lead.

![SignalTube Homepage](./SignalTube%20Screenshots/Homepage.png)

## Why SignalTube exists

Good videos and articles often contain real signal, but the useful parts are buried under time, repetition, and jargon.

SignalTube is built for people who want:

- faster understanding without flattening the source into generic summary sludge
- outputs shaped by their role, goals, or perspective
- reusable knowledge artifacts instead of one-off chat answers
- a local-first workflow that works with AI tools already installed on their Mac

## What makes it different from generic summarizers

SignalTube is not just a one-shot summary generator. It is built around:

- role-aware interpretation
- multiple output modes for different reading needs
- local-first memo storage
- on-demand counterpart generation
- a reading-first interface instead of a chat dump

## Supported inputs

Paste a public link from:

- YouTube
- Medium
- Substack

## Supported outputs

- `Article · Short Dive`  
  A concise memo for quick understanding with summary, key ideas, key concepts, and professional relevance.

- `Article · Deep Dive`  
  A richer editorial memo with stronger structure, more depth, and long-form readability.

- `Presentation`  
  A slide-based quick-read format for scanning, reviewing, and sharing ideas.

## Supported providers

SignalTube currently works with local CLI-based providers already installed on the user’s machine:

- Claude CLI
- Codex CLI
- Gemini CLI

These run through background local CLI invocation rather than a visible in-app chat thread.

## Role-aware output

SignalTube supports:

- predefined roles such as `HAI Designer`, `UX Designer`, `Developer`, and `I’m a kid`
- custom roles with saved context

Custom roles can describe:

- what the person does day to day
- what outcomes matter most in their work
- what lens the content should be interpreted through
- any extra context that makes the output more useful

## Example use cases

- turn a long AI talk into a quick role-aware memo before a meeting
- generate a deeper editorial write-up from a video worth studying carefully
- create a presentation-style digest for sharing with a team
- reinterpret the same source differently for design, product, engineering, or learning

## Local-first behavior

SignalTube is designed to preserve a local-first workflow:

- generated memos are stored locally
- the library is searchable and sortable
- future users get a fresh app state by default
- personal demo data should stay local and out of Git

## Screenshots

### Library

![SignalTube Library](./SignalTube%20Screenshots/Library.png)

### Article view

![SignalTube Article view](./SignalTube%20Screenshots/Article%20view.png)

### Key Ideas

![SignalTube Key Ideas](./SignalTube%20Screenshots/Key%20Ideas.png)

### Presentation

![SignalTube Presentation](./SignalTube%20Screenshots/Presentation%20view.png)

## Project structure

Key places to inspect:

- [`app/`](./app) - routes and API endpoints
- [`components/`](./components) - UI screens and shared components
- [`lib/`](./lib) - ingestion, storage, providers, prompt loading, and parsing
- [`Article Short Dive Prompt.md`](./Article%20Short%20Dive%20Prompt.md)
- [`Article Deep Dive Prompt.md`](./Article%20Deep%20Dive%20Prompt.md)
- [`Presentation Prompt.md`](./Presentation%20Prompt.md)
- [`docs/engineering-note.md`](./docs/engineering-note.md) - architecture and implementation notes

## Open source notes

This repo is being prepared as an open-source local-first AI product experiment.

Areas that may continue evolving:

- prompt quality
- provider support
- presentation rendering
- packaging and distribution
- richer library intelligence

## Setup

### What you need

- macOS
- Node.js 20 or newer
- npm
- one supported local provider CLI installed and signed in:
  - Claude CLI
  - Codex CLI
  - Gemini CLI

### 1. Clone the repo

```bash
git clone https://github.com/vvmahesh0/SignalTube.git
cd SignalTube
```

### 2. Install dependencies

```bash
npm install
```

### 3. Install one AI provider

Choose one of these:

#### Claude CLI

```bash
npm install -g @anthropic-ai/claude-code
claude
```

#### Codex CLI

```bash
npm install -g @openai/codex
codex
```

#### Gemini CLI

```bash
npm install -g @google/gemini-cli
gemini
```

Complete the provider sign-in flow in your terminal before using SignalTube.

### 4. Run SignalTube

For the desktop app:

```bash
npm run build
npm run desktop
```

For web development only:

```bash
npm run dev
```

### 5. What to expect

- a fresh local app state on first run
- an empty library by default
- generated memos saved locally on your machine
- no server-side API key required by the app itself

### Local data

SignalTube is local-first.

- desktop app data is stored in macOS Application Support
- repo clones do not include someone else’s memo library
- your own generated memos stay local unless you export them yourself

### Verification

After setup:

1. open the app
2. paste a public YouTube, Medium, or Substack link
3. choose a role and output mode
4. generate a memo or presentation
5. confirm it appears in the local library

### Troubleshooting

- If generation fails immediately, make sure your chosen provider CLI is installed and signed in.
- If the desktop app does not open, run `npm run build` first and then try `npm run desktop` again.
- If you only want to test the UI in a browser, use `npm run dev`.

## Contributing

Contributions are welcome.

If you want to improve SignalTube:

1. fork the repo
2. create a branch for your change
3. keep changes focused and easy to review
4. include a short note on what changed and how it was tested

For a little more detail, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
