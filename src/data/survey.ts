/**
 * The player survey the lobby asks (`ui/survey.ts`): how each difficulty
 * feels. Answers go to analytics as `survey_difficulty`. A new question gets
 * a new `id`, so devices that answered the old one are asked again.
 */
export const SURVEY = {
  id: 'difficulty-2026-10',
  /** Runs played before the lobby asks: a brand new player can't judge the difficulty yet. */
  minRuns: 3,
} as const

export const SURVEY_ANSWERS = ['easy', 'medium', 'hard', 'unsure'] as const

export type SurveyAnswer = (typeof SURVEY_ANSWERS)[number]
