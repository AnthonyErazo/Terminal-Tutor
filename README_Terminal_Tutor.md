# Terminal Tutor

Terminal Tutor is an interactive command line tutor that teaches real terminal workflows through hands-on practice.  
Each lesson is step-based: you type a command, Terminal Tutor executes it, then validates completion by checking real filesystem and Git state (not just the text you typed).

It is designed to be cross-platform and Windows-friendly (including filename casing quirks).

---

## What it does

- Interactive step-by-step lessons (goal plus instruction per step)
- Executes only the command you type (no auto-solving)
- State-based validation (filesystem plus Git)
- Sandbox workspace by default (isolated temp directory)
- Helpful feedback with hints
- Progress saved locally so you can resume later
- Cross-platform tolerant validation for filename casing differences

---

## Quick Start

### Prerequisites
- Node.js 18+ recommended
- Git installed and available in PATH

### Install
```bash
npm install
```

### Run (dev)

Demo mode (first steps of git-basics):
```bash
npm run dev -- demo
```

Full lesson pack:
```bash
npm run dev -- start git-basics
```

Without sandbox (runs in your current folder):
```bash
npm run dev -- start git-basics --no-sandbox
```

### Build plus run compiled
```bash
npm run build
node dist/cli.js demo
node dist/cli.js start git-basics
```

---

## Commands

- `tt demo`  
  Runs the demo flow for the default lesson pack (usually git-basics) in sandbox mode.

- `tt start <lessonPack>`  
  Runs a lesson pack by id (example: git-basics).

Options:
- `--no-sandbox` disables the isolated temp folder.

---

## Docker


```bash
docker build -t terminal-tutor .
docker run -it terminal-tutor demo
docker run -it terminal-tutor start git-basics
```

Note: each container run is naturally isolated.

---

## Screenshots

Screenshots are stored in `screens/`.

![Copilot building and verifying](screens/Captura%20de%20pantalla%202026-02-06%20105841.png)
![Validation summary](screens/Captura%20de%20pantalla%202026-02-06%20105443.png)
![Prompt and build flow](screens/Captura%20de%20pantalla%202026-02-06%20105459.png)
![Project generation steps](screens/Captura%20de%20pantalla%202026-02-06%20105511.png)


---

## Prompts used

The exact prompts used during development are documented here:

- `prompts/prompts.md`

This includes:
- initial scaffold prompt
- bugfix prompts
- containerization and review prompts

---

## Lessons

Lessons live in `lessons/` as YAML.

Example structure:

```yaml
id: git-basics
title: Git Basics
description: Learn fundamental Git commands through hands-on practice

steps:
  - id: step-1
    goal: Initialize a Git repository
    instruction: Create a new Git repository in the current directory
    validation:
      type: git-initialized
    hint: Use 'git init'
```

---

## Cross-platform note (Windows casing)

Windows filesystems are typically case-insensitive, while Git records the exact filename casing.  
To avoid false failures, the validator tolerates casing differences (example: readme.md vs README.md) and prints a warning note while allowing the lesson to continue.

---

## Debugging

Enable debug logs:

PowerShell:
```powershell
$env:TT_DEBUG="1"; npm run dev -- demo
```

Linux or macOS:
```bash
TT_DEBUG=1 npm run dev -- demo
```

---

## Local progress

Progress is stored under your user directory, for example:

- `~/.tutor-terminal/progress.json`

Exact location may vary slightly by OS.