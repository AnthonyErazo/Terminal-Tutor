import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import { executeCommand } from './executor.js';
import type { Validation } from '../types/lesson.js';

const DEBUG = process.env.TT_DEBUG === '1';
const IS_WINDOWS = os.platform() === 'win32';

export interface ValidationResult {
  passed: boolean;
  message: string;
  resolvedFile?: string;
}

function normalizeRel(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\/+/, '').trim();
}

function normalizeGitEntry(p: string): string {
  return normalizeRel(p.replace(/\r/g, ''));
}

async function getCaseMatches(dirPath: string, targetName: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath);
    const target = targetName.toLowerCase();
    return entries.filter(e => e.toLowerCase() === target);
  } catch {
    return [];
  }
}

async function getActualFilename(dirPath: string, targetName: string): Promise<string | null> {
  const matches = await getCaseMatches(dirPath, targetName);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  throw new Error(
    `Multiple entries match '${targetName}' with different casing: ${matches.join(', ')}. Keep only one.`
  );
}

async function getStagedEntries(cwd: string): Promise<string[] | null> {
  const res = await executeCommand('git diff --cached --name-only -z', cwd);
  if (!res.success) return null;
  return res.stdout
    .split('\0')
    .map(s => normalizeGitEntry(s))
    .filter(Boolean);
}

async function getTrackedEntries(cwd: string): Promise<string[] | null> {
  const res = await executeCommand('git ls-files -z', cwd);
  if (!res.success) return null;
  return res.stdout
    .split('\0')
    .map(s => normalizeGitEntry(s))
    .filter(Boolean);
}

function uniqueCaseInsensitiveMatch(list: string[], target: string): { match: string | null; ambiguous: boolean } {
  const t = target.toLowerCase();
  const hits = list.filter(x => x.toLowerCase() === t);
  if (hits.length === 0) return { match: null, ambiguous: false };
  if (hits.length === 1) return { match: hits[0], ambiguous: false };
  return { match: null, ambiguous: true };
}

export async function validateStep(
  validation: Validation,
  cwd: string
): Promise<ValidationResult> {
  try {
    switch (validation.type) {
      case 'git-initialized':
        return await validateGitInitialized(cwd);

      case 'file-exists':
        return await validateFileExists(cwd, validation.file!);

      case 'files-exist':
        return await validateFilesExist(cwd, validation.files!);

      case 'file-staged':
        return await validateFileStaged(cwd, validation.file!);

      case 'files-staged':
        return await validateFilesStaged(cwd, validation.files!);

      case 'file-committed':
        return await validateFileCommitted(cwd, validation.file!);

      case 'commit-exists':
        return await validateCommitExists(cwd, validation.message);

      case 'branch-exists':
        return await validateBranchExists(cwd, validation.branch!);

      case 'branch-active':
        return await validateBranchActive(cwd, validation.branch!);

      case 'file-contains':
        return await validateFileContains(cwd, validation.file!, validation.content!);

      default:
        return {
          passed: false,
          message: `Unknown validation type: ${validation.type}`,
        };
    }
  } catch (error) {
    return {
      passed: false,
      message: error instanceof Error ? error.message : 'Validation error',
    };
  }
}

async function validateGitInitialized(cwd: string): Promise<ValidationResult> {
  try {
    const gitDir = path.join(cwd, '.git');
    await fs.access(gitDir);
    return {
      passed: true,
      message: 'Git repository initialized successfully',
    };
  } catch {
    return {
      passed: false,
      message: 'Git repository not found. Try: git init',
    };
  }
}

async function validateFileExists(cwd: string, file: string): Promise<ValidationResult> {
  const rel = normalizeRel(file);
  const abs = path.join(cwd, rel);
  const dirAbs = path.dirname(abs);
  const expectedBase = path.basename(rel);

  let actualBase: string | null = null;
  try {
    actualBase = await getActualFilename(dirAbs, expectedBase);
  } catch (e) {
    return { passed: false, message: (e as Error).message };
  }

  if (!actualBase) {
    return {
      passed: false,
      message: `File ${file} not found`,
    };
  }

  const actualAbs = path.join(dirAbs, actualBase);
  const st = await fs.stat(actualAbs);

  if (!st.isFile()) {
    const fix = IS_WINDOWS
      ? `rmdir /s /q ${actualBase} && echo Hello>${expectedBase}`
      : `rm -rf ${actualBase} && echo "Hello" > ${expectedBase}`;

    return {
      passed: false,
      message: `A folder named '${actualBase}' exists, but a file named '${expectedBase}' is required. Do not use mkdir. Fix: ${fix}`,
      resolvedFile: normalizeRel(path.join(path.dirname(rel), actualBase)),
    };
  }

  if (actualBase !== expectedBase) {
    console.log(chalk.yellow(`Note: File exists as '${actualBase}' instead of '${expectedBase}'`));
  }

  return {
    passed: true,
    message: `File ${file} exists (as ${actualBase})`,
    resolvedFile: normalizeRel(path.join(path.dirname(rel), actualBase)),
  };
}

async function validateFilesExist(cwd: string, files: string[]): Promise<ValidationResult> {
  const missing: string[] = [];
  const wrongType: Array<{ expected: string; actual: string }> = [];
  const wrongCase: Array<{ expected: string; actual: string }> = [];

  for (const file of files) {
    const rel = normalizeRel(file);
    const abs = path.join(cwd, rel);
    const dirAbs = path.dirname(abs);
    const expectedBase = path.basename(rel);

    let actualBase: string | null = null;
    try {
      actualBase = await getActualFilename(dirAbs, expectedBase);
    } catch (e) {
      return { passed: false, message: (e as Error).message };
    }

    if (!actualBase) {
      missing.push(file);
      continue;
    }

    const actualAbs = path.join(dirAbs, actualBase);
    const st = await fs.stat(actualAbs);

    if (!st.isFile()) {
      wrongType.push({ expected: expectedBase, actual: actualBase });
      continue;
    }

    if (actualBase !== expectedBase) {
      wrongCase.push({ expected: expectedBase, actual: actualBase });
    }
  }

  if (wrongType.length > 0) {
    const detail = wrongType.map(w => `${w.expected} (found folder: ${w.actual})`).join(', ');
    return {
      passed: false,
      message: `A folder exists where a file is required: ${detail}`,
    };
  }

  if (wrongCase.length > 0) {
    wrongCase.forEach(wc => console.log(chalk.yellow(`Note: File exists as '${wc.actual}' instead of '${wc.expected}'`)));
  }

  if (missing.length === 0) {
    return {
      passed: true,
      message: 'All files exist',
    };
  }

  return {
    passed: false,
    message: `Missing files: ${missing.join(', ')}`,
  };
}

async function validateFileStaged(cwd: string, file: string): Promise<ValidationResult> {
  if (DEBUG) {
    console.log(`[DEBUG] validateFileStaged called`);
    console.log(`[DEBUG] cwd: ${cwd}`);
    console.log(`[DEBUG] target file: ${file}`);
  }

  const stagedFiles = await getStagedEntries(cwd);
  if (!stagedFiles) {
    return { passed: false, message: 'Failed to check git status' };
  }

  const target = normalizeGitEntry(file);

  if (stagedFiles.includes(target)) {
    return { passed: true, message: `File ${file} is staged` };
  }

  const { match, ambiguous } = uniqueCaseInsensitiveMatch(stagedFiles, target);
  if (ambiguous) {
    return {
      passed: false,
      message: `Multiple staged files match '${file}' ignoring case. Keep only one.`,
    };
  }

  if (match) {
    if (match !== target) {
      console.log(chalk.yellow(`Note: File staged as '${match}' instead of '${file}'`));
    }
    return { passed: true, message: `File ${file} is staged (as ${match})` };
  }

  return {
    passed: false,
    message: `File ${file} is not staged. Try: git add ${file}`,
  };
}

async function validateFilesStaged(cwd: string, files: string[]): Promise<ValidationResult> {
  const stagedFiles = await getStagedEntries(cwd);
  if (!stagedFiles) {
    return { passed: false, message: 'Failed to check git status' };
  }

  const unstaged: string[] = [];

  for (const f of files) {
    const target = normalizeGitEntry(f);

    if (stagedFiles.includes(target)) continue;

    const { match, ambiguous } = uniqueCaseInsensitiveMatch(stagedFiles, target);
    if (ambiguous) {
      return {
        passed: false,
        message: `Multiple staged files match '${f}' ignoring case. Keep only one.`,
      };
    }
    if (match) {
      if (match !== target) {
        console.log(chalk.yellow(`Note: File staged as '${match}' instead of '${f}'`));
      }
      continue;
    }

    unstaged.push(f);
  }

  if (unstaged.length === 0) {
    return { passed: true, message: 'All files are staged' };
  }

  return {
    passed: false,
    message: `Files not staged: ${unstaged.join(', ')}`,
  };
}

async function validateFileCommitted(cwd: string, file: string): Promise<ValidationResult> {
  const rel = normalizeRel(file);
  const abs = path.join(cwd, rel);
  const dirAbs = path.dirname(abs);
  const expectedBase = path.basename(rel);

  let actualBase: string | null = null;
  try {
    actualBase = await getActualFilename(dirAbs, expectedBase);
  } catch (e) {
    return { passed: false, message: (e as Error).message };
  }

  if (!actualBase) {
    const createHint = IS_WINDOWS ? `echo hello>${expectedBase}` : `echo "hello" > ${expectedBase}`;
    return {
      passed: false,
      message: `Progress: create the file '${expectedBase}'. Example: ${createHint}`,
    };
  }

  const actualAbs = path.join(dirAbs, actualBase);
  const st = await fs.stat(actualAbs);
  if (!st.isFile()) {
    return {
      passed: false,
      message: `A folder named '${actualBase}' exists, but a file named '${expectedBase}' is required. Do not use mkdir.`,
    };
  }

  const resolvedRel = normalizeRel(path.join(path.dirname(rel), actualBase));

  const tracked = await getTrackedEntries(cwd);
  let commitTarget = resolvedRel;

  if (tracked) {
    if (tracked.includes(resolvedRel)) {
      commitTarget = resolvedRel;
    } else {
      const { match, ambiguous } = uniqueCaseInsensitiveMatch(tracked, resolvedRel);
      if (ambiguous) {
        return {
          passed: false,
          message: `Multiple tracked files match '${file}' ignoring case. Keep only one.`,
        };
      }
      if (match) commitTarget = match;
    }
  }

  const logRes = await executeCommand(`git log --oneline -- "${commitTarget}"`, cwd);
  if (logRes.success && logRes.stdout.trim()) {
    if (commitTarget !== normalizeGitEntry(file)) {
      console.log(chalk.yellow(`Note: File is tracked as '${commitTarget}' instead of '${file}'`));
    }
    return {
      passed: true,
      message: `File ${file} has been committed`,
      resolvedFile: commitTarget,
    };
  }

  const staged = await getStagedEntries(cwd);
  if (!staged) return { passed: false, message: 'Failed to check git status' };

  if (staged.includes(commitTarget)) {
    return {
      passed: false,
      message: `Progress: file staged. Next: commit it. Run: git commit -m "add ${path.basename(commitTarget)}"`,
      resolvedFile: commitTarget,
    };
  }

  const { match: stagedMatch, ambiguous: stagedAmb } = uniqueCaseInsensitiveMatch(staged, commitTarget);
  if (stagedAmb) {
    return {
      passed: false,
      message: `Multiple staged files match '${file}' ignoring case. Keep only one.`,
    };
  }
  if (stagedMatch) {
    if (stagedMatch !== commitTarget) {
      console.log(chalk.yellow(`Note: File staged as '${stagedMatch}' instead of '${commitTarget}'`));
    }
    return {
      passed: false,
      message: `Progress: file staged. Next: commit it. Run: git commit -m "add ${path.basename(stagedMatch)}"`,
      resolvedFile: stagedMatch,
    };
  }

  return {
    passed: false,
    message: `Progress: file created. Next: stage it. Run: git add ${actualBase}`,
    resolvedFile: commitTarget,
  };
}

async function validateCommitExists(cwd: string, message?: string): Promise<ValidationResult> {
  const result = await executeCommand('git log --oneline -1', cwd);

  if (!result.success || !result.stdout.trim()) {
    return {
      passed: false,
      message: 'No commits found. Try: git commit -m "message"',
    };
  }

  if (message) {
    const commitMessage = result.stdout.split(' ').slice(1).join(' ').trim();
    if (commitMessage.includes(message)) {
      return { passed: true, message: 'Commit created with expected message' };
    }
    return {
      passed: false,
      message: `Commit message doesn't match. Expected: "${message}"`,
    };
  }

  return { passed: true, message: 'Commit exists' };
}

async function validateBranchExists(cwd: string, branch: string): Promise<ValidationResult> {
  const result = await executeCommand('git branch', cwd);

  if (!result.success) {
    return { passed: false, message: 'Failed to list branches' };
  }

  const branches = result.stdout.split('\n').map(b => b.replace('*', '').trim());

  if (branches.includes(branch)) {
    return { passed: true, message: `Branch ${branch} exists` };
  }

  return {
    passed: false,
    message: `Branch ${branch} not found. Try: git branch ${branch}`,
  };
}

async function validateBranchActive(cwd: string, branch: string): Promise<ValidationResult> {
  const result = await executeCommand('git branch --show-current', cwd);

  if (!result.success) {
    return { passed: false, message: 'Failed to check current branch' };
  }

  const currentBranch = result.stdout.trim();

  if (currentBranch === branch) {
    return { passed: true, message: `On branch ${branch}` };
  }

  return {
    passed: false,
    message: `Not on branch ${branch}. Current: ${currentBranch}. Try: git checkout ${branch}`,
  };
}

async function validateFileContains(
  cwd: string,
  file: string,
  content: string
): Promise<ValidationResult> {
  try {
    const rel = normalizeRel(file);
    const filePath = path.join(cwd, rel);
    const st = await fs.stat(filePath);

    if (!st.isFile()) {
      return { passed: false, message: `Expected a file but found a folder: ${file}` };
    }

    const fileContent = await fs.readFile(filePath, 'utf-8');
    if (fileContent.includes(content)) {
      return { passed: true, message: `File ${file} contains expected content` };
    }

    return { passed: false, message: `File ${file} doesn't contain expected content` };
  } catch {
    return { passed: false, message: `Failed to read ${file}` };
  }
}
