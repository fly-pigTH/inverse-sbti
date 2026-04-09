# inverse-sbti

A tribute reverse-engineering study of `https://sbti.unun.dev/`, built for learning and research.

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

## What This Repo Does Not Bundle

- The upstream HTML snapshot by default
- The upstream image assets
- Generated output files that contain upstream-derived content

Those files are intentionally gitignored. Fetch them locally when you need them.

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

## Repository Layout

- `scripts/fetch-site.mjs`: fetches `https://sbti.unun.dev/` into a local `site.html`
- `scripts/verify-parity.mjs`: checks local scoring against the upstream `computeResult()`
- `scripts/reverse-sbti.mjs`: enumerates the result space and writes local reports
- `scripts/lib/site-data.mjs`: extracts constants and runtime objects from the fetched page
- `scripts/lib/scoring.mjs`: local scoring model used for analysis
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
- The MIT license in this repository applies to the code and documentation written here, not to upstream site content.
- Rights to the original site content remain with the upstream author/site owner.
- Use this repository for learning, research, and reverse-engineering practice.

## Verification

The included parity checker currently validates:

- all 25 normal exact-pattern hits
- a forced `HHHH` fallback case
- a forced `DRUNK` override case
- 200 random answer sets

If `npm run verify` returns `"status": "ok"`, the local model matches the fetched upstream page for those checks.
