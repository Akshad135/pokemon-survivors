import { PostHog } from 'posthog-node'

/** Where an error happened: the player it happened to (when known) and anything that helps find it. */
export type ErrorContext = { userId?: string | null } & Record<string, string | number | boolean | null>

/** Reports an error that the API caught and answered for (a 500). */
export type Report = (err: unknown, context: ErrorContext) => void

/**
 * The API's error reports, to the game's PostHog project (error tracking), next
 * to the client's. With a key it also catches uncaught exceptions and
 * rejections itself; `flush` sends what's queued before the process exits.
 * Without a key, errors only go to the log.
 */
export const errorReports = (key: string | undefined): { report: Report; flush: () => Promise<void> } => {
  if (!key) return { report: () => {}, flush: async () => {} }
  const posthog = new PostHog(key, { host: 'https://us.i.posthog.com', enableExceptionAutocapture: true })
  return {
    // The player's id ties the error to their events from the game; without one PostHog makes up an anonymous id.
    report: (err, { userId, ...context }) => posthog.captureException(err, userId ?? undefined, { ...context, service: 'api' }),
    flush: () => posthog.shutdown(5000),
  }
}
