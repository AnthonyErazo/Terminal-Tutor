import { z } from 'zod';

export const ValidationSchema = z.object({
  type: z.string(),
  file: z.string().optional(),
  files: z.array(z.string()).optional(),
  branch: z.string().optional(),
  message: z.string().optional(),
  content: z.string().optional(),
});

export const StepSchema = z.object({
  id: z.string(),
  goal: z.string(),
  instruction: z.string(),
  validation: ValidationSchema,
  hint: z.string().optional(),
  setupFiles: z.array(z.object({
    path: z.string(),
    content: z.string(),
  })).optional(),
});

export const LessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  steps: z.array(StepSchema),
});

export type Validation = z.infer<typeof ValidationSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
