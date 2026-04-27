# SignalTube

SignalTube turns long-form content into role-aware articles and presentations that help you understand what matters faster.

[![Watch the SignalTube demo](https://img.youtube.com/vi/wXW_3n7azpU/maxresdefault.jpg)](https://youtu.be/wXW_3n7azpU)

[Watch the SignalTube demo](https://youtu.be/wXW_3n7azpU)

## Download

The easiest way to try SignalTube is to download the macOS app from the latest GitHub release:

[Download SignalTube for macOS](https://github.com/vvmahesh0/SignalTube/releases/latest/download/SignalTube-0.1.0-arm64.dmg)

Current build:

- macOS Apple Silicon
- local-first desktop app
- works with local Claude, Codex, or Gemini CLI sessions

Note: the current DMG is an early public build. If macOS shows a security warning, open it using right-click > Open. A fully signed and notarized build is planned.

## Why I built it

I have a constantly growing Watch Later list on YouTube. A lot of it is podcasts, interviews, AI announcements, technical videos, and research discussions. I also save articles from Medium and Substack.

The problem was not only that there was too much to watch or read. The bigger problem was that even when I tried to consume it, the useful signal was often hard to understand, especially when the topic was technical or outside my direct field.

Generic AI summaries helped a little, but not enough. If the original topic is complex, a generic summary can still leave you wondering: "What does this actually mean for me?"

SignalTube is built around that exact gap.

## What SignalTube does

Paste a YouTube, Medium, or Substack link, choose a role or perspective, and choose the output you want.

SignalTube then turns the source into:

- `Article · Short Dive` for quick understanding
- `Article · Deep Dive` for a richer long-form read
- `Presentation` for a slide-style version you can scan or share

The core idea is simple: SignalTube does not just summarize content. It interprets long-form content based on who is reading it.

## What makes it different

Most summarizers compress the same source in the same way for everyone.

SignalTube is built for role-aware understanding:

- a design manager can extract what an AI research discussion means for team direction
- a founder can use the same source to understand where the market or industry is heading
- a UX designer can focus on product implications, user behavior, and interface tradeoffs
- a developer can look for implementation signals, architecture ideas, and tooling direction
- a manager can turn dense material into something easier to share with a team

That makes the output more usable, not just shorter.

## Supported inputs

- YouTube
- Medium
- Substack

## Supported outputs

- `Article · Short Dive`  
  A concise role-aware memo with summary, key ideas, key concepts, and relevance.

- `Article · Deep Dive`  
  A richer editorial version for when you want nuance and deeper context.

- `Presentation`  
  A slide-style quick-read output for reviewing or sharing.

## Local AI providers

SignalTube works with AI tools already installed on your machine:

- Claude CLI
- Codex CLI
- Gemini CLI

The app invokes these tools in the background through local CLI calls. It does not create a visible saved chat thread in those tools.

## Role-aware output

SignalTube supports predefined roles such as:

- `HAI Designer`
- `UX Designer`
- `Developer`
- `I'm a kid`

It also supports custom roles. You can define your own role by describing:

- what you do day to day
- what decisions or outcomes matter most
- what perspective SignalTube should use when interpreting content
- any extra context that would make the output more useful

## Screenshots

### Homepage view

![SignalTube homepage](./SignalTube%20Screenshots/Homepage.png)

### Article view

![SignalTube article view](./SignalTube%20Screenshots/Article%20view.png)

### Key Ideas

![SignalTube key ideas](./SignalTube%20Screenshots/Key%20Ideas.png)

### Presentation

![SignalTube presentation view](./SignalTube%20Screenshots/Presentation%20view.png)

### Library

![SignalTube library](./SignalTube%20Screenshots/Library.png)

## Open source notes

This repository includes simple generic prompts so the app remains usable and understandable as an open-source project.

Private distribution builds may use more specialized prompt variants. The public prompts are intentionally simpler, but they still demonstrate the product flow and produce usable outputs.

## Setup from source

### Requirements

- macOS
- Node.js 20 or newer
- npm
- one supported local provider CLI installed and signed in:
  - Claude CLI
  - Codex CLI
  - Gemini CLI

### Install

```bash
git clone https://github.com/vvmahesh0/SignalTube.git
cd SignalTube
npm install
```

### Run the desktop app

```bash
npm run build
npm run desktop
```

### Run web development mode

```bash
npm run dev
```

## Local-first behavior

- generated memos are saved locally on your machine
- repo clones do not include anyone else's library or history
- new users start with a fresh empty library
- no server-side API key is required by the app itself

## Project structure

- [`app/`](./app) - routes and API endpoints
- [`components/`](./components) - UI screens and shared components
- [`lib/`](./lib) - ingestion, storage, providers, prompt loading, and parsing
- [`Article Short Dive Prompt.md`](./Article%20Short%20Dive%20Prompt.md)
- [`Article Deep Dive Prompt.md`](./Article%20Deep%20Dive%20Prompt.md)
- [`Presentation Prompt.md`](./Presentation%20Prompt.md)

## License

MIT
