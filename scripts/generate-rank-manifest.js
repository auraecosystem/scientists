// scripts/generate-rank-manifest.js
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

function getFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex').substring(0, 8);
}

const rankPath = path.join(__dirname, '../node_modules/js-tiktoken/ranks/cl100k_base.json');
if (fs.existsSync(rankPath)) {
  const hash = getFileHash(rankPath);
  const manifestContent = `
export const CURRENT_RANK_MANIFEST = {
  cl100k_base: {
    id: 'cl100k_base',
    version: '${hash}',
    model: 'cl100k_base',
  }
};`;
  fs.writeFileSync(path.join(__dirname, '../src/rankManifest.ts'), manifestContent);
  console.log(`[Build Automation] Generated rank manifest with hash: ${hash}`);
}
