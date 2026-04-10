# OPEN_SBTI_TEST

[![中文](https://img.shields.io/badge/README-%E4%B8%AD%E6%96%87-cb6d51?style=for-the-badge)](./README.md)

A simple open-source learning version of the `SBTI` test, inspired by the public page at `https://sbti.unun.dev/`.

## Project Overview

This project keeps the goal simple: make an interesting personality test easy to run, easy to read, and easy to keep exploring.

- you can take the test directly
- you can watch the personality vector change while answering
- you can read the code and understand how the result is decided
- you can deploy it as a static site on GitHub Pages

The default repository landing page is now Chinese. Use the button above to switch back to the Chinese homepage at any time.

## How the Test Works

You can think of this test as a process that keeps adding up your tendencies while you answer:

- The main flow has 30 regular questions across 15 traits.
- Each answer pushes one trait a little in one direction.
- Two related questions are combined into the final state of that trait.
- All traits together become your personality vector for this run.
- The system compares that vector with built-in personality patterns and picks the closest one.
- Some hidden branches can insert special questions or even override the final result.

So the result is not magic. It is a process you can inspect and follow.

## Feature Highlights

- Personality vector view: when you scroll to a question, the page locks onto the trait it affects; once you choose an answer, you can see the vector move right away.
- Clearer results: the result page shows not only your final type, but also nearby matches.
- Better on phones: the layout was adjusted for mobile so reading, answering, and checking results feels easier on a small screen.
- Easy to keep exploring: the code and the site are open, so it is straightforward to study, redesign, or extend.
- Easy to deploy: it is a static site and works well with GitHub Pages.

## Tribute

This repository is dedicated to the public `SBTI 人格测试` page hosted at `sbti.unun.dev`.

- Upstream site: `https://sbti.unun.dev/`
- Original author shown on the site: `B站 @蛆肉儿串儿`
- Repository status: unofficial, independent, research-only

Please read [ATTRIBUTION.md](./ATTRIBUTION.md) before reusing anything from this repository.

## What This Repo Contains

- Local tooling to fetch the public site snapshot on demand
- Static-analysis helpers to extract questions, hidden branches, and type patterns
- A parity checker that compares the local model against the original in-page `computeResult()` logic
- A report generator that enumerates the reachable result space
- A deployable static tribute site under `site/`, intended for GitHub Pages

## What This Repo Does Not Bundle

- The upstream HTML snapshot by default
- The upstream image assets
- Reverse-engineering output files under `output/`

Those files are intentionally gitignored. Fetch them locally when you need them.

Note: the deployed site under `site/` does include upstream-derived questionnaire text and result copy so the rebuild can function. That content remains attributed to the upstream project and is not relicensed under MIT.

## Quick Start

Requirements:

- Node.js 20+

Fetch the current public page locally:

```bash
npm run fetch
```

Verify that the local reimplementation matches the upstream runtime logic:

```bash
npm run verify
```

Generate summary and sample outputs locally:

```bash
npm run report
npm run summary
node scripts/reverse-sbti.mjs sample CTRL
```

Regenerate the browser data payload used by the deployable site:

```bash
npm run export:site-data
```

## Repository Layout

- `scripts/fetch-site.mjs`: fetches `https://sbti.unun.dev/` into a local `site.html`
- `scripts/verify-parity.mjs`: checks local scoring against the upstream `computeResult()`
- `scripts/reverse-sbti.mjs`: enumerates the result space and writes local reports
- `scripts/lib/site-data.mjs`: extracts constants and runtime objects from the fetched page
- `scripts/lib/scoring.mjs`: local scoring model used for analysis
- `site/`: deployable static tribute rebuild for GitHub Pages
- `ATTRIBUTION.md`: upstream attribution and scope boundaries

## Current Findings

Based on the analyzed public page snapshot:

- There are 30 regular questions mapped onto 15 dimensions, 2 questions per dimension.
- The visible test shows 31 questions by default because one special gate question is inserted at runtime.
- Choosing `饮酒` reveals an extra question, so that branch has 32 visible questions.
- Normal typing is a nearest-neighbor match against 25 hard-coded patterns.
- A hidden `DRUNK` override can bypass the normal result.
- A low-similarity fallback can force the `HHHH` result.

## Legal and Scope Notes

- This repository is not the original project and should not be presented as such.
- The MIT license in this repository applies to the code and documentation written here, not to upstream site content or upstream-derived copy bundled inside `site/data.js`.
- Rights to the original site content remain with the upstream author/site owner.
- Use this repository for learning, research, and reverse-engineering practice.

## Verification

The included parity checker currently validates:

- all 25 normal exact-pattern hits
- a forced `HHHH` fallback case
- a forced `DRUNK` override case
- 200 random answer sets

If `npm run verify` returns `"status": "ok"`, the local model matches the fetched upstream page for those checks.
