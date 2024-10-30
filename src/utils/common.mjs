import fs from 'fs';
import path from 'path';
/**
* @returns {string} 版本号
*/

export function getVersion() {
    const packagePath = findRootPackageJson(process.cwd());
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    return packageJson.version;
}
function findRootPackageJson(dir) {
    const packagePath = path.join(dir, 'package.json');
    if (fs.existsSync(packagePath)) {
        return packagePath;
    }
    const parentDir = path.dirname(dir);
    if (parentDir === dir) {
        throw new Error('package.json not found in any parent directory');
    }
    return findRootPackageJson(parentDir);
}