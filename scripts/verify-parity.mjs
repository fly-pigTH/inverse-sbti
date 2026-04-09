#!/usr/bin/env node

import { computeFromAnswers, parsePattern } from './lib/scoring.mjs';
import { loadSiteData, loadSiteRuntime } from './lib/site-data.mjs';

const RANDOM_CASES = 200;

function main() {
  const data = loadSiteData();
  const runtime = loadSiteRuntime();
  const cases = buildCases(runtime);

  let mismatch = null;
  for (const testCase of cases) {
    const site = computeViaSiteRuntime(runtime, testCase.answers);
    const local = computeViaLocalModel(data, testCase.answers);

    if (JSON.stringify(site) !== JSON.stringify(local)) {
      mismatch = {
        name: testCase.name,
        site,
        local
      };
      break;
    }
  }

  console.log(JSON.stringify({
    checkedCases: cases.length,
    mismatch,
    status: mismatch ? 'mismatch' : 'ok'
  }, null, 2));

  process.exitCode = mismatch ? 1 : 0;
}

function buildCases(runtime) {
  const cases = [];

  for (const type of runtime.NORMAL_TYPES) {
    const answers = buildAnswersFromPattern(runtime, parsePattern(type.pattern), {
      drink_gate_q1: 1
    });
    cases.push({ name: `pattern:${type.code}`, answers });
  }

  cases.push({
    name: 'fallback:HHHH',
    answers: buildAnswersFromPattern(runtime, ['L', 'L', 'L', 'L', 'L', 'L', 'M', 'L', 'L', 'H', 'H', 'H', 'H', 'M', 'L'], {
      drink_gate_q1: 1
    })
  });

  cases.push({
    name: 'override:DRUNK',
    answers: buildAnswersFromPattern(runtime, parsePattern(runtime.NORMAL_TYPES.find((type) => type.code === 'CTRL').pattern), {
      drink_gate_q1: 3,
      drink_gate_q2: 2
    })
  });

  for (let index = 0; index < RANDOM_CASES; index += 1) {
    const answers = { drink_gate_q1: 1 + Math.floor(Math.random() * 4) };
    if (answers.drink_gate_q1 === 3) {
      answers.drink_gate_q2 = 1 + Math.floor(Math.random() * 2);
    }

    for (const question of runtime.questions) {
      answers[question.id] = 1 + Math.floor(Math.random() * 3);
    }

    cases.push({ name: `random:${index}`, answers });
  }

  return cases;
}

function buildAnswersFromPattern(runtime, levels, seed) {
  const answers = { ...seed };

  levels.forEach((level, index) => {
    const values = level === 'L' ? [1, 1] : level === 'M' ? [2, 2] : [3, 3];
    const first = runtime.questions[index * 2];
    const second = runtime.questions[index * 2 + 1];
    answers[first.id] = values[0];
    answers[second.id] = values[1];
  });

  return answers;
}

function computeViaSiteRuntime(runtime, answers) {
  runtime.app.answers = { ...answers };
  const result = runtime.computeResult();
  return {
    finalCode: result.finalType.code,
    bestNormalCode: result.bestNormal.code,
    similarity: result.bestNormal.similarity,
    distance: result.bestNormal.distance,
    levels: result.levels
  };
}

function computeViaLocalModel(data, answers) {
  const result = computeFromAnswers(data, answers);
  return {
    finalCode: result.finalCode,
    bestNormalCode: result.bestNormal.code,
    similarity: result.bestNormal.similarity,
    distance: result.bestNormal.distance,
    levels: result.levels
  };
}

main();
