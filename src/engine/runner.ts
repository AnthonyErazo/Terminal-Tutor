import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import prompts from 'prompts';
import chalk from 'chalk';
import { executeCommand } from './executor.js';
import { validateStep } from './validator.js';
import { loadLesson } from './loader.js';
import { markStepComplete } from './progress.js';
import type { Lesson, Step } from '../types/lesson.js';

const DEBUG = process.env.TT_DEBUG === '1';

export interface RunnerOptions {
  lessonId: string;
  useSandbox?: boolean;
  maxSteps?: number;
}

export async function runLesson(options: RunnerOptions): Promise<void> {
  const lesson = await loadLesson(options.lessonId);
  
  console.log(chalk.bold(`\n${lesson.title}`));
  if (lesson.description) {
    console.log(chalk.dim(lesson.description));
  }
  console.log();
  
  const workdir = options.useSandbox !== false
    ? await createSandbox()
    : process.cwd();
  
  if (DEBUG) {
    console.log(`[DEBUG] Working directory: ${workdir}`);
    console.log(`[DEBUG] Sandbox mode: ${options.useSandbox !== false}`);
  }
  
  if (options.useSandbox !== false) {
    console.log(chalk.dim(`Sandbox: ${workdir}\n`));
  }
  
  const stepsToRun = options.maxSteps
    ? lesson.steps.slice(0, options.maxSteps)
    : lesson.steps;
  
  for (let i = 0; i < stepsToRun.length; i++) {
    const step = stepsToRun[i];
    const stepNum = i + 1;
    
    await setupStep(step, workdir);
    
    const success = await runStep(step, stepNum, stepsToRun.length, workdir);
    
    if (!success) {
      console.log(chalk.red('\nLesson stopped. Try again when ready.\n'));
      return;
    }
    
    await markStepComplete(lesson.id, step.id);
  }
  
  console.log(chalk.green.bold('\n✓ Lesson complete!\n'));
}

async function createSandbox(): Promise<string> {
  const tmpDir = os.tmpdir();
  const sandboxDir = path.join(tmpDir, `tutor-terminal-${Date.now()}`);
  await fs.mkdir(sandboxDir, { recursive: true });
  return sandboxDir;
}

async function setupStep(step: Step, workdir: string): Promise<void> {
  if (!step.setupFiles) return;
  
  for (const file of step.setupFiles) {
    const filePath = path.join(workdir, file.path);
    const fileDir = path.dirname(filePath);
    
    await fs.mkdir(fileDir, { recursive: true });
    await fs.writeFile(filePath, file.content, 'utf-8');
  }
}

async function runStep(
  step: Step,
  stepNum: number,
  totalSteps: number,
  workdir: string
): Promise<boolean> {
  console.log(chalk.bold(`Step ${stepNum}/${totalSteps}: ${step.goal}`));
  console.log(chalk.dim(step.instruction));
  console.log();
  
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    const response = await prompts({
      type: 'text',
      name: 'command',
      message: 'Your command:',
    });
    
    if (!response.command) {
      console.log(chalk.yellow('\nSkipping step.\n'));
      return false;
    }
    
    const command = response.command.trim();
    
    console.log(chalk.dim(`\nExecuting: ${command}`));
    
    const result = await executeCommand(command, workdir);
    
    if (result.stdout) {
      console.log(result.stdout);
    }
    if (result.stderr) {
      console.error(result.stderr);
    }
    if (result.error) {
      console.error(chalk.red(result.error));
    }
    
    console.log();
    
    if (DEBUG) {
      console.log(`[DEBUG] About to validate with workdir: ${workdir}`);
    }
    
    const validation = await validateStep(step.validation, workdir);
    
    if (validation.passed) {
      console.log(chalk.green('✓ ' + validation.message));
      console.log();
      return true;
    } else {
      attempts++;
      console.log(chalk.red('✗ ' + validation.message));
      
      if (attempts < maxAttempts && step.hint) {
        console.log(chalk.dim(`Hint: ${step.hint}`));
      }
      
      if (attempts >= maxAttempts) {
        console.log(chalk.yellow('\nMax attempts reached.'));
        return false;
      }
      
      console.log();
    }
  }
  
  return false;
}
