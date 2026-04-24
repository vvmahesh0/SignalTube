# Contributing to SignalTube

Thanks for your interest in improving SignalTube.

## Before you start

- keep changes focused and easy to review
- avoid unrelated cleanup in the same pull request
- preserve the current product direction unless you are intentionally proposing a change

## Local setup

Follow the setup steps in [README.md](./README.md).

At a high level:

1. clone the repo
2. run `npm install`
3. install and sign in to one supported local provider CLI
4. run the app with `npm run desktop` after `npm run build`

## Development notes

- SignalTube is local-first
- personal demo data should not be committed
- prompts live in the project root and are part of the product behavior
- the desktop app wraps the existing Next.js app through Electron

## Pull request guidance

When opening a pull request:

- explain what changed
- explain why it changed
- include brief verification steps
- keep screenshots for visible UI changes when helpful

## Good contribution areas

- prompt quality
- presentation rendering
- local provider support
- onboarding and documentation
- library usability
- packaging and desktop distribution

## Please avoid

- committing personal local data
- adding secrets or tokens
- large unrelated refactors without explanation

## Questions

If you are unsure whether a change fits the project, open an issue or a draft pull request first.
