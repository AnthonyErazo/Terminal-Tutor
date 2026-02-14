# First Prompt
 Act as a senior Node.js and TypeScript engineer focused on shipping a minimal, reliable CLI. You
  are allowed to create and modify files in this repository and you must apply changes directly.
  Read the current repo first, then implement without asking questions.

  Implement terminal tutor, an interactive command line tutor. Each step shows a goal and
  instruction, the user types a command, the program executes only that exact command, and then
  validates completion by checking real filesystem and Git state. Validation must be state based,
  not by parsing the command text. Provide short actionable messages and optional hints. Default to
  a sandbox workspace under the OS temp directory, with an option to disable sandbox.

  Use Node.js and TypeScript as ES modules and compile under NodeNext. Use commander for CLI,
  prompts for input, execa for execution with shell true and a 20000 ms timeout, js-yaml for
  lessons, and zod for schema validation. Local internal imports must use .js extensions so the
  compiled output works. Persist progress to a JSON file under the user home directory and recover
  gracefully if the file is missing or corrupted.

  Provide commands tt demo (runs the first three steps of a default pack in sandbox) and tt start
  <lessonPack> (runs full pack). Create at least one lesson pack named git-basics. Update README
  with exact verification commands. The work is done only if npm install, npm run dev -- demo, npm
  run dev -- start git-basics, npm run build, and node dist/cli.js demo all succeed.

# Second Prompt
Act ad a senior Typescript debugger. The lesson expects a file named README.md. On Windows, the
  filesystem is case-insenstive, so the fsExists validator reports README.md exists even when the
  actual file is readme.md. Then the staged-file validator checks Git index entries, wich preserve
  the actual path casing, so it fails because it expects README.md exactly. Fix this coherently.
  Implement a cross-platform path comparison strategy for calidators: For fsExists, detect
  case-mismatch on Windows by checking directory entries and require the exact expected casing. If a
   case-mismatch is found, fail with an actionable message explaining how to fix it (two-step rename
   or git mv). For gitStagedFile, normalize paths and handle case-mismatch on Windows consistently
  with fsExists. The validator should not claim README.md is taged if only readme.md is staged, and
  should return a clear message to rename using git mv. Keep changes minimal. Do not change the
  lesson content. Apply changes directly and output the verification commands to return the demo.

# Third Prompt
Act as a senior Node.js TypeScript maintainer hardening a cross-platform CLI. The project currently fails in Windows due to filename casing issues: a step expects README.md but users may create readme.md; filesystem checks can pass while Git staging checks fail. Fix this so the app is robust on Windows, Linux, and macOS.

You may edit the repository directly. Do not ask questions. Keep changes minimal but complete.

Requirements:

Make filename validation consistent across validators. Decide and implement one coherent policy:

Preferred policy: tolerate casing differences, detect the actual existing filename, and use that resolved name for subsequent validation within the same session, while showing a short warning.

For staged-file validation, keep using git diff --cached --name-only -z and parse with null-byte splitting. Normalize paths and handle CRLF safely.

Fix user guidance. Never suggest git mv for an untracked file. Provide correct cross-platform hints for fixing casing:

Windows: ren to temp then ren to the expected name, or delete and recreate with correct casing.

Linux/macOS: mv to temp then mv to expected name.

Add automated tests that reproduce the casing scenario and validate correct behavior. Use a lightweight approach (node:test or similar). Tests must run on Windows and Linux.

Add CI (GitHub Actions) with an OS matrix (ubuntu, windows, macos) running build and tests.

Optional but preferred: add a Dockerfile that can run the CLI in a consistent environment, and document it in README.

Deliverables:

Apply all changes directly.

Update README with how to run locally and with Docker.

Output only: files changed list and exact verification commands.

# Forth Prompt
You are a senior software engineer and DevOps reviewer. Review this repository end to end with two goals reliability and portability across Windows Linux and Docker. First skim the project structure and the main CLI entry point lesson runner and validators. Then review the containerization setup including Dockerfile dockerignore and any compose configuration. Identify the top issues that could break the app or make the developer experience confusing. Pay special attention to cross platform shell command differences Git behavior on case insensitive file systems line endings and path separators. Also check that the container build is reproducible and that running the CLI inside the container is straightforward.

Deliverables
Provide a prioritized list of findings with severity and rationale. For each high severity item propose a concrete fix. When the fix is code show the exact file path and the full updated content for the file. When the fix is docker related show the exact file path and full content for Dockerfile and any related files. Include a short section called verification steps with exact commands to build and run locally and in Docker. Keep the response actionable and specific to this codebase.

Constraints
Do not add new features. Only improve correctness clarity and cross platform robustness. Keep changes minimal. Preserve the current lesson format and CLI commands.