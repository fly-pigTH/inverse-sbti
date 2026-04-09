#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { loadSiteData } from './lib/site-data.mjs';

const ROOT = process.cwd();
const OUTPUT_PATH = path.join(ROOT, 'site', 'data.js');

function main() {
  const data = loadSiteData();
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  const payload = {
    sourceUrl: data.sourceUrl,
    dimensionMeta: data.dimensionMeta,
    questions: data.questions,
    specialQuestions: data.specialQuestions,
    typeLibrary: data.typeLibrary,
    normalTypes: data.normalTypes,
    dimExplanations: data.dimExplanations,
    dimensionOrder: data.dimensionOrder,
    drunkTriggerQuestionId: data.drunkTriggerQuestionId
  };

  const file = `export const sbtiData = ${JSON.stringify(payload, null, 2)};\n`;
  fs.writeFileSync(OUTPUT_PATH, file, 'utf8');
  console.log(`Wrote ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main();
