#!/usr/bin/env node

import fs from 'node:fs/promises';

const SOURCE_URL = 'https://sbti.unun.dev/';
const OUTPUT_PATH = 'site.html';

async function main() {
  const response = await fetch(SOURCE_URL, {
    headers: {
      'user-agent': 'open-sbti-test research fetcher'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  await fs.writeFile(OUTPUT_PATH, html, 'utf8');
  console.log(`Saved ${SOURCE_URL} -> ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
