import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { LessonSchema, type Lesson } from '../types/lesson.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadLesson(lessonId: string): Promise<Lesson> {
  const lessonsDir = path.join(__dirname, '..', '..', 'lessons');
  const lessonPath = path.join(lessonsDir, `${lessonId}.yaml`);
  
  try {
    const content = await fs.readFile(lessonPath, 'utf-8');
    const data = yaml.load(content);
    
    const lesson = LessonSchema.parse(data);
    return lesson;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Lesson file not found: ${lessonPath}`);
    }
    throw new Error(`Failed to load lesson: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
