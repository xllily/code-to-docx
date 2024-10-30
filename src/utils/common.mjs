import fs from 'fs';
import path from 'path';
/**
* @returns {string} 版本号
*/
export function getVersion() {
    const packagePath = path.resolve(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    return packageJson.version;
}