import { readdir } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';

async function findTestFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findTestFiles(fullPath));
    } else if (entry.name.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

const testFiles = await findTestFiles('tests');

if (testFiles.length === 0) {
  console.error('No test files found');
  process.exit(1);
}

const args = [
  '--import', 'tsx',
  '--test',
  ...testFiles
];

if (process.argv.includes('--coverage')) {
  args.splice(2, 0, '--experimental-test-coverage');
}

const child = spawn('node', args, {
  stdio: 'inherit'
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
