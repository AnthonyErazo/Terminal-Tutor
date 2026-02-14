# Terminal Tutor

An interactive command line tutor that teaches terminal workflows through hands-on practice. Cross-platform with robust filename handling on Windows, Linux, and macOS.

## Features

- **Interactive Learning**: Each step shows a goal and instruction, you type a command, the program validates completion
- **State-Based Validation**: Checks real filesystem and Git state, not command text
- **Cross-Platform**: Tolerates filename casing differences, works on Windows/Linux/macOS
- **Sandbox Workspace**: Runs in isolated temp directory by default (optional)
- **Progress Tracking**: Saves progress to `~/.tutor-terminal/progress.json`
- **Helpful Feedback**: Short actionable messages with optional hints

## Installation

```bash
npm install
```

## Usage

### Demo Mode
Run the first 3 steps of git-basics in a sandbox:

```bash
npm run dev -- demo
# or
node dist/cli.js demo
```

### Full Lesson Pack
Run a complete lesson pack:

```bash
npm run dev -- start git-basics
# or
node dist/cli.js start git-basics
```

### Without Sandbox
Run in your current directory:

```bash
npm run dev -- start git-basics --no-sandbox
```

## Docker Usage

Build and run with Docker:

```bash
# Build the image
docker build -t terminal-tutor .

# Run demo mode
docker run -it terminal-tutor demo

# Run full lesson
docker run -it terminal-tutor start git-basics

# Show help
docker run -it terminal-tutor --help
```

**Note:** Docker runs in sandbox mode by default. Each container run creates a fresh isolated environment.

## Development

### Build TypeScript

```bash
npm run build
```

### Run in Development Mode

```bash
npm run dev -- demo
npm run dev -- start git-basics
```

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage (experimental)
npm run test:coverage
```

Tests validate cross-platform behavior including filename casing tolerance.

### Project Structure

```
src/
  cli.ts                # Commander CLI entry point
  engine/
    runner.ts           # Lesson step runner
    validator.ts        # State validation (filesystem, git)
    executor.ts         # Command execution (execa)
    loader.ts           # YAML lesson loader
    progress.ts         # Progress tracking
  types/
    lesson.ts           # Zod schemas
lessons/
  git-basics.yaml       # Git basics lesson pack
tests/
  validator.test.ts     # Automated validator tests
```

## Cross-Platform Behavior

The tutor tolerates filename casing differences:

- **Windows**: Filesystem is case-insensitive, Git preserves case
- **Linux/macOS**: Filesystem is case-sensitive

The validator will:
1. Accept files with different casing (e.g., `readme.md` when expecting `README.md`)
2. Show a yellow warning note about the case difference
3. Continue the lesson successfully

This prevents frustration while teaching correct conventions.

## Verification Commands

All of these must succeed:

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Run demo in dev mode
npm run dev -- demo

# Run compiled demo
node dist/cli.js demo

# Test with Docker
docker build -t terminal-tutor . && docker run -it terminal-tutor demo
```

## Creating Lessons

Lessons are YAML files in the `lessons/` directory. Example:

```yaml
id: git-basics
title: Git Basics
description: Learn fundamental Git commands

steps:
  - id: step-1
    goal: Initialize a Git repository
    instruction: Create a new Git repository
    validation:
      type: git-initialized
    hint: Use 'git init'
```

### Validation Types

- `git-initialized` - Check if `.git` directory exists
- `file-exists` - Check if a file exists (`file: README.md`)
- `files-exist` - Check if multiple files exist (`files: [...]`)
- `file-staged` - Check if file is staged (`file: README.md`)
- `files-staged` - Check if files are staged (`files: [...]`)
- `file-committed` - Check if file has commits (`file: README.md`)
- `commit-exists` - Check if any commit exists (`message: "text"` optional)
- `branch-exists` - Check if branch exists (`branch: feature`)
- `branch-active` - Check if branch is active (`branch: main`)
- `file-contains` - Check file content (`file: app.js`, `content: "text"`)

## Technology Stack

- **Node.js + TypeScript** (ES Modules, NodeNext)
- **commander** - CLI framework
- **prompts** - Interactive input
- **execa** - Command execution (shell: true, 20s timeout)
- **js-yaml** - YAML parsing
- **zod** - Schema validation
- **chalk** - Terminal colors
- **node:test** - Built-in test runner

## Continuous Integration

GitHub Actions runs tests on:
- Ubuntu (Linux)
- Windows
- macOS

See `.github/workflows/ci.yml` for details.

## Debugging

Enable debug mode to see detailed execution information:

```bash
# Windows PowerShell
$env:TT_DEBUG="1"; npm run dev -- demo

# Linux/macOS
TT_DEBUG=1 npm run dev -- demo
```

Debug output shows:
- Working directory paths
- Git command output (hex dump)
- File matching logic
- Validation details

## License

ISC

