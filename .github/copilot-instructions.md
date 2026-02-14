# Repository context

## Purpose
Build a small, reliable command line learning tool that teaches basic terminal workflows through guided practice.
The user follows short steps and the program validates success by checking real system state, not by interpreting the exact text of the command.

## Implementation Status
✅ **Complete** - All core features implemented and tested.

## What the program does
- Runs interactive lessons composed of steps.
- Each step shows a goal and an instruction, then asks the user to type a command.
- The program executes only the command the user typed.
- After execution, the program validates the step by checking filesystem state and Git state.
- The program provides short, actionable feedback and optional hints.

## Build and development

**Note:** Project uses **ES modules** (not CommonJS) - `package.json` has `"type": "module"`.

### Commands
```bash
# Install dependencies
npm install

# Compile TypeScript to dist/
npm run build

# Run during development (with auto-reload)
npm run dev -- demo
npm run dev -- start git-basics

# Run compiled version
node dist/cli.js demo
node dist/cli.js start git-basics
```

### Running lesson commands
```bash
# Demo mode - first 3 steps in sandbox
npm run dev -- demo

# Full lesson pack in sandbox
npm run dev -- start git-basics

# Run in current directory (no sandbox)
npm run dev -- start git-basics --no-sandbox
```

## Technology stack

- **Node.js and TypeScript** - Target ES2022, NodeNext module resolution
- **CLI Framework**: `commander` for command parsing
- **Interactive Input**: `prompts` for user interaction
- **Command Execution**: `execa` with `{ shell: true }` and timeout
- **Lesson Format**: YAML files (parsed with `js-yaml`)
- **Schema Validation**: `zod` for validating lesson structure
- **Terminal Output**: `chalk` for colored output (keep it minimal)
- **Progress Storage**: JSON file in user home directory (`~/.tutor-terminal/progress.json` or similar)

## Architecture

### Directory structure
```
src/
  cli.ts            # Commander CLI entry point
  engine/           # Core lesson execution logic
    runner.ts       # Lesson step runner
    validator.ts    # State validation (filesystem, git)
    executor.ts     # Command execution wrapper (execa)
lessons/            # YAML lesson definitions
prompts/            # Lesson prompt templates (optional)
screens/            # UI/screen components (optional)
```

### Lesson flow
1. **Load** - Parse YAML lesson file with js-yaml, validate with zod
2. **Setup** - Create isolated sandbox directory (OS temp + unique folder)
3. **Execute Step** - Show instruction → wait for user command → execute with execa
4. **Validate** - Check filesystem/git state (not command text)
5. **Feedback** - Display result with optional hints
6. **Progress** - Save completion state to home directory JSON

### Validation approach
- **State-based, not command-based** - Check if files exist, git status, directory contents
- Example: Instead of checking if user typed `git add .`, check if files are staged with `git diff --staged`
- Use Node.js `fs` API and `execa` to verify state after command execution

### YAML lesson schema (expected structure)
```yaml
id: lesson-git-basics
title: Git Basics
steps:
  - id: step-1
    goal: Initialize a git repository
    instruction: Use git to initialize a new repository
    validation:
      type: git-initialized  # Validator checks .git directory exists
    hint: Try 'git init'
  - id: step-2
    goal: Stage a file
    instruction: Stage the README.md file
    validation:
      type: file-staged
      file: README.md
```

## Safety rules
- **Never execute commands automatically** - Only run commands the user explicitly types during a session
- **Avoid destructive operations** - Prefer read-only checks and minimal filesystem changes
- **Use sandbox isolation** - Default to running lessons in `os.tmpdir()` subdirectory
- **Validate user input** - Never use `shell: true` with unsanitized interpolation
- **Timeout protection** - All `execa` calls should have reasonable timeouts (e.g., 5-10 seconds)

## Code conventions

### Module imports
- Use `.js` extension in imports even though source is `.ts` (required for NodeNext)
  ```typescript
  import { validateStep } from './engine/validator.js'
  ```

### Error handling
- Provide actionable error messages that explain what's missing and how to fix it
- Example: `"Lesson file not found at lessons/git-basics.yaml. Create it or check the path."`

### Output style
- Keep terminal output plain and compatible across environments (Windows, Linux, macOS)
- Use chalk sparingly for emphasis (success green, error red, hints dim)
- Avoid Unicode box-drawing characters - use simple dashes and pipes

### Code organization
- Keep the codebase minimal - prefer simple modules over abstractions
- One concern per module (runner, validator, executor, loader)
- Clear naming: `validateGitStatus()` not `checkGit()`
- Complete file outputs for generated code (not snippets)

## Development workflow
1. Create/modify TypeScript source in `src/`
2. Test with `npx tsx src/cli.ts` during development
3. Compile with `npx tsc` to verify type correctness
4. Test compiled output with `node dist/cli.js` before committing
