# OPEN_SBTI_TEST

[![中文](https://img.shields.io/badge/README-%E4%B8%AD%E6%96%87-cb6d51?style=for-the-badge)](./README.md)

A tribute reverse-engineering study of `https://sbti.unun.dev/`, built for learning and research.

## Project Overview

This repository turns the public `SBTI 人格测试` page into a reproducible research project rather than pretending to be the original source repository. It focuses on:

- extracting the questionnaire structure and hidden branches
- reproducing the personality classification algorithm locally
- verifying parity against the upstream `computeResult()` logic
- shipping a deployable GitHub Pages rebuild

The default repository landing page is now Chinese. Use the button above to switch back to the Chinese homepage at any time.

## How the Test Works

This learning-oriented rebuild does not try to restate a vague personality theory. It documents the actual classification flow used by the public page:

- The main questionnaire contains 30 regular questions mapped to 15 dimensions, with 2 questions per dimension.
- Each answer pushes one dimension in a specific direction; after the pair is combined, that dimension collapses into one of `L / M / H`.
- Once all dimensions are resolved, the page builds a 15-dimensional personality vector.
- That vector is compared against 25 built-in personality templates, and the closest match becomes the normal result.
- The runtime also contains special branch rules. For example, the drinking-related branch can reveal hidden questions and may override the normal result with a special type.
- If the final vector is not close enough to any template, the flow falls back to a low-similarity default result.

In practice, this is a “discrete multi-dimension scoring + nearest-template matching + special-rule override” classifier.

## Feature Highlights

- Personality vector analysis: the test page includes a live vector monitor. When you scroll to a question, it locks onto the affected dimension; when you hover or choose an answer, it previews the vector change immediately.
- Result reproduction and explanation: the rebuilt result view shows the final type, top-3 nearby matches, the final dimension vector, and a short explanation of the match.
- Parity verification: the local scoring model can be checked against the upstream `computeResult()` implementation instead of relying on guesswork.
- Mobile adaptation: the questionnaire, progress area, vector panel, and result layout were adjusted for narrow screens so the experience remains usable on phones.
- GitHub Pages deployment: the site is a fully static frontend and can be published directly for demos and research.

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
