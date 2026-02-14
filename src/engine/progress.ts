import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface Progress {
  [lessonId: string]: {
    completedSteps: string[];
    lastUpdated: string;
  };
}

function getProgressPath(): string {
  const homeDir = os.homedir();
  const configDir = path.join(homeDir, '.tutor-terminal');
  return path.join(configDir, 'progress.json');
}

export async function loadProgress(): Promise<Progress> {
  const progressPath = getProgressPath();
  
  try {
    const content = await fs.readFile(progressPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export async function saveProgress(progress: Progress): Promise<void> {
  const progressPath = getProgressPath();
  const configDir = path.dirname(progressPath);
  
  try {
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(progressPath, JSON.stringify(progress, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
}

export async function markStepComplete(lessonId: string, stepId: string): Promise<void> {
  const progress = await loadProgress();
  
  if (!progress[lessonId]) {
    progress[lessonId] = {
      completedSteps: [],
      lastUpdated: new Date().toISOString(),
    };
  }
  
  if (!progress[lessonId].completedSteps.includes(stepId)) {
    progress[lessonId].completedSteps.push(stepId);
  }
  
  progress[lessonId].lastUpdated = new Date().toISOString();
  
  await saveProgress(progress);
}

export async function isStepComplete(lessonId: string, stepId: string): Promise<boolean> {
  const progress = await loadProgress();
  return progress[lessonId]?.completedSteps.includes(stepId) ?? false;
}
