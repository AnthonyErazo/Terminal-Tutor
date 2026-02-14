import { test } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { executeCommand } from '../dist/engine/executor.js';
import { validateStep } from '../dist/engine/validator.js';

async function createTempDir(): Promise<string> {
  const tmpDir = os.tmpdir();
  const testDir = path.join(tmpDir, `tt-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(testDir, { recursive: true });
  return testDir;
}

async function cleanup(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

test('validator: git-initialized detects git repository', async () => {
  const testDir = await createTempDir();
  try {
    await executeCommand('git init', testDir);
    
    const result = await validateStep({ type: 'git-initialized' }, testDir);
    
    assert.strictEqual(result.passed, true);
    assert.match(result.message, /initialized|repository/i);
  } finally {
    await cleanup(testDir);
  }
});

test('validator: file-exists with exact case match', async () => {
  const testDir = await createTempDir();
  try {
    await fs.writeFile(path.join(testDir, 'README.md'), 'test content');
    
    const result = await validateStep({ type: 'file-exists', file: 'README.md' }, testDir);
    
    assert.strictEqual(result.passed, true);
    assert.match(result.message, /exists/i);
  } finally {
    await cleanup(testDir);
  }
});

test('validator: file-exists tolerates case mismatch', async () => {
  const testDir = await createTempDir();
  try {
    // Create file with lowercase name
    await fs.writeFile(path.join(testDir, 'readme.md'), 'test content');
    
    // Validate expecting uppercase
    const result = await validateStep({ type: 'file-exists', file: 'README.md' }, testDir);
    
    // Should pass and tolerate the case difference
    assert.strictEqual(result.passed, true);
  } finally {
    await cleanup(testDir);
  }
});

test('validator: file-staged with exact case match', async () => {
  const testDir = await createTempDir();
  try {
    await executeCommand('git init', testDir);
    await executeCommand('git config user.email "test@example.com"', testDir);
    await executeCommand('git config user.name "Test User"', testDir);
    await fs.writeFile(path.join(testDir, 'README.md'), 'test');
    await executeCommand('git add README.md', testDir);
    
    const result = await validateStep({ type: 'file-staged', file: 'README.md' }, testDir);
    
    assert.strictEqual(result.passed, true);
    assert.match(result.message, /staged/i);
  } finally {
    await cleanup(testDir);
  }
});

test('validator: file-staged tolerates case mismatch', async () => {
  const testDir = await createTempDir();
  try {
    await executeCommand('git init', testDir);
    await executeCommand('git config user.email "test@example.com"', testDir);
    await executeCommand('git config user.name "Test User"', testDir);
    
    // Create and stage file with lowercase name
    await fs.writeFile(path.join(testDir, 'readme.md'), 'test');
    await executeCommand('git add readme.md', testDir);
    
    // Validate expecting uppercase
    const result = await validateStep({ type: 'file-staged', file: 'README.md' }, testDir);
    
    // Should pass and tolerate the case difference
    assert.strictEqual(result.passed, true);
  } finally {
    await cleanup(testDir);
  }
});

test('validator: file-staged fails when file not staged', async () => {
  const testDir = await createTempDir();
  try {
    await executeCommand('git init', testDir);
    await fs.writeFile(path.join(testDir, 'README.md'), 'test');
    // Don't stage the file
    
    const result = await validateStep({ type: 'file-staged', file: 'README.md' }, testDir);
    
    assert.strictEqual(result.passed, false);
    assert.match(result.message, /not staged/i);
  } finally {
    await cleanup(testDir);
  }
});

test('validator: file-committed detects committed file', async () => {
  const testDir = await createTempDir();
  try {
    await executeCommand('git init', testDir);
    await executeCommand('git config user.email "test@example.com"', testDir);
    await executeCommand('git config user.name "Test User"', testDir);
    await fs.writeFile(path.join(testDir, 'README.md'), 'test');
    await executeCommand('git add README.md', testDir);
    await executeCommand('git commit -m "Initial commit"', testDir);
    
    const result = await validateStep({ type: 'file-committed', file: 'README.md' }, testDir);
    
    assert.strictEqual(result.passed, true);
    assert.match(result.message, /committed/i);
  } finally {
    await cleanup(testDir);
  }
});

test('validator: branch-exists detects created branch', async () => {
  const testDir = await createTempDir();
  try {
    await executeCommand('git init', testDir);
    await executeCommand('git config user.email "test@example.com"', testDir);
    await executeCommand('git config user.name "Test User"', testDir);
    await fs.writeFile(path.join(testDir, 'README.md'), 'test');
    await executeCommand('git add README.md', testDir);
    await executeCommand('git commit -m "Initial"', testDir);
    await executeCommand('git branch feature', testDir);
    
    const result = await validateStep({ type: 'branch-exists', branch: 'feature' }, testDir);
    
    assert.strictEqual(result.passed, true);
    assert.match(result.message, /exists/i);
  } finally {
    await cleanup(testDir);
  }
});

test('validator: branch-active detects current branch', async () => {
  const testDir = await createTempDir();
  try {
    await executeCommand('git init', testDir);
    await executeCommand('git config user.email "test@example.com"', testDir);
    await executeCommand('git config user.name "Test User"', testDir);
    await fs.writeFile(path.join(testDir, 'README.md'), 'test');
    await executeCommand('git add README.md', testDir);
    await executeCommand('git commit -m "Initial"', testDir);
    await executeCommand('git branch feature', testDir);
    await executeCommand('git checkout feature', testDir);
    
    const result = await validateStep({ type: 'branch-active', branch: 'feature' }, testDir);
    
    assert.strictEqual(result.passed, true);
    assert.match(result.message, /branch/i);
  } finally {
    await cleanup(testDir);
  }
});

test('validator: files-staged validates multiple files', async () => {
  const testDir = await createTempDir();
  try {
    await executeCommand('git init', testDir);
    await executeCommand('git config user.email "test@example.com"', testDir);
    await executeCommand('git config user.name "Test User"', testDir);
    await fs.writeFile(path.join(testDir, 'file1.txt'), 'test1');
    await fs.writeFile(path.join(testDir, 'file2.txt'), 'test2');
    await executeCommand('git add file1.txt file2.txt', testDir);
    
    const result = await validateStep(
      { type: 'files-staged', files: ['file1.txt', 'file2.txt'] },
      testDir
    );
    
    assert.strictEqual(result.passed, true);
  } finally {
    await cleanup(testDir);
  }
});
