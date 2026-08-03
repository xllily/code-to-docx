const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');

const versionFilePath = path.resolve(__dirname, '../src/version.mjs');
const versionDir = path.dirname(versionFilePath);

if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true });
}

fs.writeFileSync(versionFilePath, `export const version = '${packageJson.version}';\n`);
console.error(`Generated version file at ${versionFilePath}`);
