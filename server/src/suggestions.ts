import { SUGGESTION, type Suggestion, type SuggestionDraft, type SuggestionSort, type SuggestionStatus, type Vote } from '../../src/game/suggestions'
import type { Sql } from './db'

/** An idea's id (a uuid): anything else is an unknown idea, never a query. */
export const SUGGESTION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Row = {
  id: string
  title: string
  body: string
  handle: string
  name: string | null
  status: 'open' | 'done'
  score: number
  created_at: Date
  done_at: Date | null
  vote: number
  mine: boolean
}

const toSuggestion = (r: Row): Suggestion => ({
  id: r.id,
  title: r.title,
  body: r.body,
  handle: r.handle,
  name: r.name ?? r.handle,
  status: r.status,
  score: r.score,
  at: r.created_at.toISOString(),
  doneAt: r.done_at?.toISOString() ?? null,
  vote: r.vote === 1 || r.vote === -1 ? r.vote : 0,
  mine: r.mine,
})

export type Posted = { ok: true; suggestion: Suggestion } | { ok: false; error: 'profile' | 'limit' }

export type Voted = { ok: true; score: number; vote: Vote } | { ok: false; error: 'unknown' | 'closed' }

/**
 * The idea board. Posting needs a handle (the board shows who suggested
 * it) and comes with the author's own up vote; a player posts
 * `SUGGESTION.perDay` ideas in 24 hours at most. Anyone with an account
 * votes on open ideas, once each (changing or taking it back). Only the
 * admin changes a status (the desk's route in `app.ts`); hidden ideas, and
 * the ideas of a banned player, leave every list.
 */
export const suggestionStore = (sql: Sql) => {
  const ORDER = {
    top: sql`s.score desc, s.created_at desc`,
    new: sql`s.created_at desc`,
    done: sql`s.done_at desc`,
  } as const satisfies Record<SuggestionSort, unknown>

  /** Ideas as `viewer` sees them (their vote, whether they posted it). */
  const select = (viewer: string | null) => sql`
    select s.id, s.title, s.body, u.handle, u.name, s.status, s.score, s.created_at, s.done_at,
      coalesce((select v.value from suggestion_votes v where v.suggestion_id = s.id and v.user_id = ${viewer}), 0)::int as vote,
      coalesce(s.user_id = ${viewer}, false) as mine
    from suggestions s join users u on u.id = s.user_id`

  return {
    /** A tab of the board: open ideas by votes or newest first, or the shipped ones. */
    list: async (sort: SuggestionSort, viewer: string | null): Promise<Suggestion[]> => {
      const status = sort === 'done' ? 'done' : 'open'
      const rows = await sql<Row[]>`${select(viewer)} where s.status = ${status} and u.handle is not null and u.banned_at is null order by ${ORDER[sort]} limit ${SUGGESTION.list}`
      return rows.map(toSuggestion)
    },

    /** Posts an idea for `userId`, with their up vote. `profile`: no handle yet; `limit`: too many in the last 24 hours. */
    post: (userId: string, draft: SuggestionDraft): Promise<Posted> =>
      sql.begin(async (tx) => {
        // Locking the author's row makes two posts at once take turns, so the limit holds.
        const [user] = await tx<{ handle: string | null }[]>`select handle from users where id = ${userId} for update`
        if (!user?.handle) return { ok: false, error: 'profile' } as const
        const [recent] = await tx<{ n: number }[]>`select count(*)::int as n from suggestions where user_id = ${userId} and created_at > now() - interval '1 day'`
        if ((recent?.n ?? 0) >= SUGGESTION.perDay) return { ok: false, error: 'limit' } as const
        const [row] = await tx<{ id: string }[]>`insert into suggestions (user_id, title, body, score) values (${userId}, ${draft.title}, ${draft.body}, 1) returning id`
        await tx`insert into suggestion_votes (suggestion_id, user_id, value) values (${row!.id}, ${userId}, 1)`
        const [posted] = await tx<Row[]>`${select(userId)} where s.id = ${row!.id}`
        console.log(`suggestion ${row!.id} posted by ${userId}`)
        return { ok: true, suggestion: toSuggestion(posted!) } as const
      }),

    /** `userId`'s vote on an idea (0 takes it back), and its score after it. `unknown`: no such idea (or hidden); `closed`: it shipped. */
    vote: (userId: string, id: string, vote: Vote): Promise<Voted> =>
      sql.begin(async (tx) => {
        const [idea] = await tx<{ status: SuggestionStatus }[]>`select status from suggestions where id = ${id} for update`
        if (!idea || idea.status === 'hidden') return { ok: false, error: 'unknown' } as const
        if (idea.status !== 'open') return { ok: false, error: 'closed' } as const
        await tx`insert into users (id) values (${userId}) on conflict (id) do nothing`
        if (vote === 0) await tx`delete from suggestion_votes where suggestion_id = ${id} and user_id = ${userId}`
        else {
          await tx`
            insert into suggestion_votes (suggestion_id, user_id, value) values (${id}, ${userId}, ${vote})
            on conflict (suggestion_id, user_id) do update set value = excluded.value, voted_at = now()`
        }
        const [after] = await tx<{ score: number }[]>`
          update suggestions set score = (select coalesce(sum(value), 0) from suggestion_votes where suggestion_id = ${id})
          where id = ${id} returning score`
        return { ok: true, score: after!.score, vote } as const
      }),

    /** The admin sets an idea's status (`done` stamps when it shipped). False for an unknown idea. */
    setStatus: async (id: string, status: SuggestionStatus) => {
      const rows = await sql`
        update suggestions set status = ${status}, done_at = case when ${status} = 'done' then coalesce(done_at, now()) end
        where id = ${id} returning id`
      return rows.length > 0
    },
  }
}

export type SuggestionStore = ReturnType<typeof suggestionStore>
