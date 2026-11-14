const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const zipFile = path.join(rootDir, 'familywatchtogether.zip');

if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

// Collect items to zip
const entries = fs.readdirSync(rootDir);
const toZip = entries.filter((name) => {
  return ![
    'node_modules',
    '.git',
    'familywatchtogether.zip',
    'transcoded',
    'uploads',
    '.gemini',
  ].includes(name);
});

console.log('Items to zip:', toZip);

// Run powershell Compress-Archive
const pathsArg = toZip.map(n => `'${path.join(rootDir, n)}'`).join(',');
const psCmd = `powershell -ExecutionPolicy Bypass -Command "Compress-Archive -Path ${pathsArg} -DestinationPath '${zipFile}' -Force"`;

execSync(psCmd, { stdio: 'inherit' });

const stats = fs.statSync(zipFile);
console.log(`Successfully created ${zipFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

