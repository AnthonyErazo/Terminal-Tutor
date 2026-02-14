#!/usr/bin/env node

import { Command } from 'commander';
import { runLesson } from './engine/runner.js';

const program = new Command();

program
  .name('tt')
  .description('Interactive command line tutor')
  .version('1.0.0');

program
  .command('demo')
  .description('Run first 3 steps of git-basics lesson in sandbox')
  .action(async () => {
    try {
      await runLesson({
        lessonId: 'git-basics',
        useSandbox: true,
        maxSteps: 3,
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('start <lessonPack>')
  .description('Run a complete lesson pack')
  .option('--no-sandbox', 'Run in current directory instead of sandbox')
  .action(async (lessonPack: string, options: { sandbox: boolean }) => {
    try {
      await runLesson({
        lessonId: lessonPack,
        useSandbox: options.sandbox,
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse();
