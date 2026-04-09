#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { buildTypeVectors } from './scoring.mjs';

const DEFAULT_HTML_PATH = path.join(process.cwd(), 'site.html');

export function ensureSiteHtmlExists(htmlPath = DEFAULT_HTML_PATH) {
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Missing ${path.basename(htmlPath)}. Run "node scripts/fetch-site.mjs" first.`);
  }
}

export function readSiteHtml(htmlPath = DEFAULT_HTML_PATH) {
  ensureSiteHtmlExists(htmlPath);
  return fs.readFileSync(htmlPath, 'utf8');
}

export function extractMainScript(html) {
  const scriptMatches = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  const main = scriptMatches.find(
    (match) => match[1].includes('const questions =') && match[1].includes('function computeResult()')
  );

  if (!main) {
    throw new Error('Could not locate the inline application script.');
  }

  return main[1];
}

export function extractConst(script, name) {
  const marker = `const ${name} = `;
  const start = script.indexOf(marker);
  if (start === -1) {
    throw new Error(`Could not locate constant ${name}`);
  }

  let index = start + marker.length;
  while (/\s/.test(script[index])) {
    index += 1;
  }

  const end = findExpressionEnd(script, index);
  const expression = script.slice(index, end).trim();
  return vm.runInNewContext(`(${expression})`);
}

function findExpressionEnd(source, startIndex) {
  const stack = [];
  let quote = null;
  let escaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      quote = char;
      continue;
    }

    if (char === '{' || char === '[' || char === '(') {
      stack.push(char);
      continue;
    }

    if (char === '}' || char === ']' || char === ')') {
      stack.pop();
      continue;
    }

    if (char === ';' && stack.length === 0) {
      return index;
    }
  }

  throw new Error(`Could not find the end of expression starting at index ${startIndex}`);
}

export function loadSiteData(htmlPath = DEFAULT_HTML_PATH) {
  const html = readSiteHtml(htmlPath);
  const script = extractMainScript(html);

  const questions = extractConst(script, 'questions');
  const specialQuestions = extractConst(script, 'specialQuestions');
  const typeLibrary = extractConst(script, 'TYPE_LIBRARY');
  const normalTypes = extractConst(script, 'NORMAL_TYPES');
  const dimensionOrder = extractConst(script, 'dimensionOrder');
  const drunkTriggerQuestionId = extractConst(script, 'DRUNK_TRIGGER_QUESTION_ID');

  const questionById = new Map();
  for (const question of questions) {
    questionById.set(question.id, question);
  }
  for (const question of specialQuestions) {
    questionById.set(question.id, question);
  }

  const questionsByDim = new Map();
  for (const dim of dimensionOrder) {
    questionsByDim.set(dim, questions.filter((question) => question.dim === dim));
  }

  return {
    sourceUrl: 'https://sbti.unun.dev/',
    htmlPath,
    questions,
    specialQuestions,
    typeLibrary,
    normalTypes,
    typeVectors: buildTypeVectors(normalTypes),
    dimensionOrder,
    drunkTriggerQuestionId,
    questionById,
    questionsByDim
  };
}

export function loadSiteRuntime(htmlPath = DEFAULT_HTML_PATH) {
  const html = readSiteHtml(htmlPath);
  const script = extractMainScript(html);
  const sandbox = {
    console,
    Math,
    window: { scrollTo() {} },
    document: {
      getElementById() {
        return makeElementStub();
      },
      createElement() {
        return makeElementStub();
      }
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(
    `${script}
this.__exports = { questions, specialQuestions, NORMAL_TYPES, TYPE_LIBRARY, dimensionOrder, DRUNK_TRIGGER_QUESTION_ID, computeResult, app };`,
    sandbox
  );

  return sandbox.__exports;
}

function makeElementStub() {
  return {
    classList: { toggle() {}, remove() {}, add() {} },
    style: {},
    textContent: '',
    innerHTML: '',
    src: '',
    alt: '',
    appendChild() {},
    removeAttribute() {},
    querySelectorAll() {
      return [];
    },
    addEventListener() {}
  };
}
