import type { QuestionStepId } from './quizModel';

/** Question copy for each quiz step: the question, a sub-line, and "Why we ask". */
export interface StepCopy {
  question: string;
  sub: string;
  why: string;
}

export const STEP_COPY: Record<QuestionStepId, StepCopy> = {
  sleep: {
    question: 'How do you usually sleep?',
    sub: 'Pick the position you spend most of the night in.',
    why: 'Your position decides where your weight presses into the mattress, and so which firmness range keeps your spine level.',
  },
  body: {
    question: 'Which range fits your body weight?',
    sub: 'A range is enough. If you prefer, add an exact number instead.',
    why: 'Heavier bodies sink further, so they need a firmer surface to stay aligned. Your weight is used only to calculate scores. It is not saved to an account and never sent to analytics.',
  },
  comfort: {
    question: 'What should your mattress feel like?',
    sub: 'Set the feel you enjoy. We compare it with every mattress’s listed firmness.',
    why: 'Mattresses far from your preferred feel lose points. A support area shifts weight toward pressure relief (shoulders, hips) or alignment (lower back).',
  },
  environment: {
    question: 'How warm do you sleep?',
    sub: 'Think about a typical night, not the hottest one.',
    why: 'If you sleep warm, cooling counts for more in your score. If a partner’s movement wakes you, motion isolation counts for more.',
  },
  priorities: {
    question: 'What else matters to you?',
    sub: 'All optional. Leave anything blank and it won’t narrow your results.',
    why: 'Type and budget filter the catalog before scoring. Edge importance changes how much edge support counts.',
  },
};
