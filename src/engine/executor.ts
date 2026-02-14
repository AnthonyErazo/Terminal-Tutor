import { execa } from 'execa';

const DEBUG = process.env.TT_DEBUG === '1';

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}

export async function executeCommand(
  command: string,
  cwd: string
): Promise<ExecutionResult> {
  if (DEBUG) {
    console.log(`[DEBUG] Executing in: ${cwd}`);
    console.log(`[DEBUG] Command: ${command}`);
  }
  
  try {
    const result = await execa(command, {
      shell: true,
      cwd,
      timeout: 20000,
      reject: false,
    });

    if (DEBUG) {
      console.log(`[DEBUG] Exit code: ${result.exitCode}`);
      console.log(`[DEBUG] Stdout length: ${result.stdout.length} bytes`);
      console.log(`[DEBUG] Stdout: ${JSON.stringify(result.stdout)}`);
    }

    return {
      success: result.exitCode === 0,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    if (DEBUG) {
      console.log(`[DEBUG] Execution error: ${error}`);
    }
    return {
      success: false,
      stdout: '',
      stderr: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
