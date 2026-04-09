#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { loadSiteData } from './lib/site-data.mjs';
import {
  LEVEL_NUM,
  NUM_LEVEL,
  LEVEL_TO_PAIR_VALUES,
  computeFromLevelVector,
  parsePattern
} from './lib/scoring.mjs';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'output');

function main() {
  const command = process.argv[2] ?? 'report';
  const data = loadSiteData();

  if (command === 'report') {
    const analysis = enumerateLevelSpace(data);
    const samples = buildTypeSamples(data, analysis);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'summary.json'), JSON.stringify(buildSummary(data, analysis), null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'type-samples.json'), JSON.stringify(samples, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'report.md'), buildReport(data, analysis, samples));
    printSummary(analysis);
    console.log(`\nWrote ${path.relative(ROOT, path.join(OUTPUT_DIR, 'summary.json'))}`);
    console.log(`Wrote ${path.relative(ROOT, path.join(OUTPUT_DIR, 'type-samples.json'))}`);
    console.log(`Wrote ${path.relative(ROOT, path.join(OUTPUT_DIR, 'report.md'))}`);
    return;
  }

  if (command === 'summary') {
    const analysis = enumerateLevelSpace(data);
    printSummary(analysis);
    return;
  }

  if (command === 'sample') {
    const code = process.argv[3];
    if (!code) {
      usage('Missing type code. Example: node scripts/reverse-sbti.mjs sample CTRL');
    }
    const analysis = enumerateLevelSpace(data);
    const samples = buildTypeSamples(data, analysis);
    const sample = samples[code];
    if (!sample) {
      usage(`Unknown type code: ${code}`);
    }
    console.log(JSON.stringify(sample, null, 2));
    return;
  }

  usage(`Unknown command: ${command}`);
}

function usage(message) {
  if (message) {
    console.error(message);
  }
  console.error('Usage: node scripts/reverse-sbti.mjs [report|summary|sample <TYPE_CODE>]');
  process.exit(1);
}

function enumerateLevelSpace(data) {
  const start = Date.now();
  const counts = new Map();
  const firstLevels = new Map();
  const regularAssignmentsPerLevelVector = 3 ** data.dimensionOrder.length;
  const levelChoices = [1, 2, 3];
  const typeCount = data.typeVectors.length;
  const distances = new Uint8Array(typeCount);
  const exacts = new Uint8Array(typeCount);
  const currentLevels = new Uint8Array(data.dimensionOrder.length);

  const distInc = data.dimensionOrder.map((_, dimIndex) =>
    levelChoices.map((value) => data.typeVectors.map((type) => Math.abs(value - type.vector[dimIndex])))
  );
  const exactInc = data.dimensionOrder.map((_, dimIndex) =>
    levelChoices.map((value) => data.typeVectors.map((type) => (value === type.vector[dimIndex] ? 1 : 0)))
  );

  function visitLeaf() {
    let bestIndex = 0;
    let bestDistance = distances[0];
    let bestExact = exacts[0];

    for (let typeIndex = 1; typeIndex < typeCount; typeIndex += 1) {
      const distance = distances[typeIndex];
      const exact = exacts[typeIndex];
      if (distance < bestDistance || (distance === bestDistance && exact > bestExact)) {
        bestIndex = typeIndex;
        bestDistance = distance;
        bestExact = exact;
      }
    }

    const finalCode = bestDistance >= 13 ? 'HHHH' : data.typeVectors[bestIndex].code;
    counts.set(finalCode, (counts.get(finalCode) ?? 0) + 1);
    if (!firstLevels.has(finalCode)) {
      firstLevels.set(finalCode, Array.from(currentLevels, (value) => NUM_LEVEL[value]));
    }
  }

  function walk(dimIndex) {
    if (dimIndex === data.dimensionOrder.length) {
      visitLeaf();
      return;
    }

    for (let choiceIndex = 0; choiceIndex < levelChoices.length; choiceIndex += 1) {
      const levelValue = levelChoices[choiceIndex];
      currentLevels[dimIndex] = levelValue;

      const distRow = distInc[dimIndex][choiceIndex];
      const exactRow = exactInc[dimIndex][choiceIndex];
      for (let typeIndex = 0; typeIndex < typeCount; typeIndex += 1) {
        distances[typeIndex] += distRow[typeIndex];
        exacts[typeIndex] += exactRow[typeIndex];
      }

      walk(dimIndex + 1);

      for (let typeIndex = 0; typeIndex < typeCount; typeIndex += 1) {
        distances[typeIndex] -= distRow[typeIndex];
        exacts[typeIndex] -= exactRow[typeIndex];
      }
    }
  }

  walk(0);

  const distinctLevelVectors = 3 ** data.dimensionOrder.length;
  const normalSpecialVariants = 4;
  const drunkSpecialVariants = 1;

  const resultRows = Array.from(counts.entries()).map(([code, levelVectorCount]) => {
    const isDrunk = code === 'DRUNK';
    const rawAnswerCombinations = levelVectorCount * regularAssignmentsPerLevelVector * (isDrunk ? drunkSpecialVariants : normalSpecialVariants);
    return {
      code,
      cn: data.typeLibrary[code].cn,
      levelVectorCount,
      rawAnswerCombinations,
      sampleLevels: firstLevels.get(code)
    };
  }).sort((left, right) => right.rawAnswerCombinations - left.rawAnswerCombinations || left.code.localeCompare(right.code));

  const normalRows = resultRows.filter((row) => row.code !== 'DRUNK');
  const drunkRow = {
    code: 'DRUNK',
    cn: data.typeLibrary.DRUNK.cn,
    levelVectorCount: distinctLevelVectors,
    rawAnswerCombinations: distinctLevelVectors * regularAssignmentsPerLevelVector,
    sampleLevels: firstLevels.get('DRUNK') ?? Array.from({ length: data.dimensionOrder.length }, () => 'H')
  };

  return {
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - start,
    counts: new Map(normalRows.map((row) => [row.code, row])),
    rows: [...normalRows, drunkRow],
    samplesByCode: new Map([...firstLevels.entries(), ['DRUNK', drunkRow.sampleLevels]]),
    regularAssignmentsPerLevelVector,
    distinctLevelVectors,
    normalSpecialVariants,
    drunkSpecialVariants
  };
}

function buildSummary(data, analysis) {
  return {
    sourceUrl: data.sourceUrl,
    regularQuestionCount: data.questions.length,
    specialQuestionCount: data.specialQuestions.length,
    visibleQuestionCountWithoutDrinkBranch: data.questions.length + 1,
    visibleQuestionCountWithDrinkBranch: data.questions.length + 2,
    normalTypeCount: data.normalTypes.length,
    finalTypeCount: analysis.rows.length,
    distinctLevelVectors: analysis.distinctLevelVectors,
    regularAssignmentsPerLevelVector: analysis.regularAssignmentsPerLevelVector,
    normalSpecialVariants: analysis.normalSpecialVariants,
    drunkSpecialVariants: analysis.drunkSpecialVariants,
    generationDurationMs: analysis.durationMs,
    results: analysis.rows
  };
}

function buildTypeSamples(data, analysis) {
  const samples = {};

  for (const type of data.normalTypes) {
    const levelVector = parsePattern(type.pattern);
    samples[type.code] = buildSampleForLevels(data, levelVector, {
      finalCode: type.code,
      drinkGateValue: 1
    });
  }

  const hhhhLevels = analysis.samplesByCode.get('HHHH');
  if (hhhhLevels) {
    samples.HHHH = buildSampleForLevels(data, hhhhLevels, {
      finalCode: 'HHHH',
      drinkGateValue: 1
    });
  }

  const drunkBaseLevels = parsePattern(data.normalTypes[0].pattern);
  samples.DRUNK = buildSampleForLevels(data, drunkBaseLevels, {
    finalCode: 'DRUNK',
    drinkGateValue: 3,
    drinkTriggerValue: 2
  });

  return samples;
}

function buildSampleForLevels(data, levelVector, options) {
  const answers = [];
  answers.push(answerRecord(data.questionById.get('drink_gate_q1'), options.drinkGateValue));

  if (options.drinkGateValue === 3) {
    answers.push(answerRecord(data.questionById.get('drink_gate_q2'), options.drinkTriggerValue ?? 1));
  }

  const levelVectorNums = levelVector.map((level) => LEVEL_NUM[level]);

  for (let dimIndex = 0; dimIndex < data.dimensionOrder.length; dimIndex += 1) {
    const dim = data.dimensionOrder[dimIndex];
    const level = levelVector[dimIndex];
    const questions = data.questionsByDim.get(dim);
    const [firstValue, secondValue] = LEVEL_TO_PAIR_VALUES[level];
    answers.push(answerRecord(questions[0], firstValue));
    answers.push(answerRecord(questions[1], secondValue));
  }

  const computed = computeFromLevelVector(levelVectorNums, data, options.drinkGateValue === 3 && options.drinkTriggerValue === 2);

  return {
    finalCode: options.finalCode,
    finalCn: data.typeLibrary[options.finalCode].cn,
    visibleQuestionCount: options.drinkGateValue === 3 ? 32 : 31,
    underlyingNormalCode: computed.bestNormal.code,
    underlyingNormalCn: data.typeLibrary[computed.bestNormal.code].cn,
    bestNormalDistance: computed.bestNormal.distance,
    bestNormalSimilarity: computed.bestNormal.similarity,
    levelVector: Object.fromEntries(data.dimensionOrder.map((dim, index) => [dim, levelVector[index]])),
    answers
  };
}

function answerRecord(question, value) {
  const option = question.options.find((item) => item.value === value);
  return {
    id: question.id,
    dim: question.dim ?? null,
    text: question.text,
    value,
    label: option?.label ?? null
  };
}

function buildReport(data, analysis, samples) {
  const lines = [];
  lines.push('# SBTI Reverse Engineering Report');
  lines.push('');
  lines.push(`Source: ${data.sourceUrl}`);
  lines.push('');
  lines.push('## Core Findings');
  lines.push('');
  lines.push(`- The app is a single static HTML page with all questions, type definitions, and scoring logic embedded inline in \`site.html\`.`);
  lines.push(`- There are ${data.questions.length} regular questions. They map to ${data.dimensionOrder.length} dimensions, with exactly 2 questions per dimension.`);
  lines.push(`- The UI inserts one special gate question every run, so the visible test shows ${data.questions.length + 1} questions by default. Picking "饮酒" reveals one more hidden question, so that branch has ${data.questions.length + 2} visible questions.`);
  lines.push('- Regular question order is randomized on every run, so stable inversion must use question IDs or texts, not display order.');
  lines.push('- Each dimension score is the sum of its two answers. Scores `2-3 => L`, `4 => M`, `5-6 => H`.');
  lines.push('- Normal typing uses nearest-neighbor matching against 25 hard-coded patterns over a 15-dimensional ternary vector (`L/M/H -> 1/2/3`) with Manhattan distance.');
  lines.push('- Tie-breaker order is: smaller distance, then more exact dimension matches.');
  lines.push('- `HHHH` is the fallback when the best normal distance is at least `13`, which corresponds to similarity `< 60%` in the site code.');
  lines.push('- `DRUNK` ignores the normal match entirely when `drink_gate_q1 = 3` and `drink_gate_q2 = 2`.');
  lines.push('');
  lines.push('## Reachable Result Counts');
  lines.push('');
  lines.push('| Code | Name | Level Vectors | Raw Answer Combinations |');
  lines.push('| --- | --- | ---: | ---: |');
  for (const row of analysis.rows) {
    lines.push(`| ${row.code} | ${row.cn} | ${formatNumber(row.levelVectorCount)} | ${formatNumber(row.rawAnswerCombinations)} |`);
  }
  lines.push('');
  lines.push('## Sample Inverse Answer Sheets');
  lines.push('');
  lines.push('Exact-hit samples are written to `output/type-samples.json`. The normal-type samples use the exact target pattern. The `DRUNK` sample uses the same base levels as `CTRL`, then forces the drink override.');
  lines.push('');
  lines.push('## Regeneration');
  lines.push('');
  lines.push('```bash');
  lines.push('node scripts/reverse-sbti.mjs report');
  lines.push('node scripts/reverse-sbti.mjs summary');
  lines.push('node scripts/reverse-sbti.mjs sample CTRL');
  lines.push('```');
  lines.push('');
  lines.push('## Template Patterns');
  lines.push('');
  lines.push('| Code | Pattern |');
  lines.push('| --- | --- |');
  for (const type of data.normalTypes) {
    lines.push(`| ${type.code} | ${type.pattern} |`);
  }
  lines.push('');
  lines.push('## Generated Samples');
  lines.push('');
  for (const code of Object.keys(samples).sort()) {
    const sample = samples[code];
    lines.push(`### ${sample.finalCode} (${sample.finalCn})`);
    lines.push('');
    lines.push(`- Underlying normal result: ${sample.underlyingNormalCode} (${sample.underlyingNormalCn})`);
    lines.push(`- Best normal distance: ${sample.bestNormalDistance}`);
    lines.push(`- Best normal similarity: ${sample.bestNormalSimilarity}%`);
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(sample.levelVector, null, 2));
    lines.push('```');
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function printSummary(analysis) {
  console.log('Final type coverage:');
  for (const row of analysis.rows) {
    console.log(
      `${row.code.padEnd(6)} ${String(row.levelVectorCount).padStart(8)} level-vectors  ${String(row.rawAnswerCombinations).padStart(15)} raw-answer-combos`
    );
  }
  console.log(`\nEnumerated ${analysis.distinctLevelVectors} level vectors in ${analysis.durationMs} ms.`);
}

function formatNumber(value) {
  return value.toLocaleString('en-US');
}

main();
