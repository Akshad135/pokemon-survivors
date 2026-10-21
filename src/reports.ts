import { apiCall } from './api'
import { isRecord } from './game/parse'
import type { ReportDraft } from './game/reports'

/**
 * Reporting a player or a run (`POST /reports`, `game/reports.ts`). Signed-in
 * players only. The API never says what became of the target, so `sent` is
 * all a report can come to, besides what's about the sender.
 */

/** What sending came to: `self` (one's own run or profile), `limit` (`REPORT.perDay` reached), `banned` (this account can't), or the API out of reach. */
export type ReportSent = 'sent' | 'self' | 'limit' | 'banned' | 'invalid' | 'offline'

export const sendReport = async (draft: ReportDraft): Promise<ReportSent> => {
  const { status, body } = await apiCall('/reports', { method: 'POST', body: draft, auth: true })
  if (status === 202) return 'sent'
  if (status === 429) return 'limit'
  if (status === 403) return 'banned'
  if (status === 400) return isRecord(body) && body.error === 'self' ? 'self' : 'invalid'
  return 'offline'
}
