import { readdir, readFile } from 'node:fs/promises'
import postgres from 'postgres'
import { parseSaveData } from '../../src/game/meta'
import { applyPush, type Push, type Stored } from '../../src/game/sync'

export const connect = (url: string) => postgres(url, { max: 10, onnotice: () => {} })

export type Sql = ReturnType<typeof connect>

/**
 * Runs the `.sql` files in `dir` that haven't run yet, in name order, each in
 * its own transaction. An advisory lock keeps two booting instances from racing.
 */
export const migrate = async (sql: Sql, dir: URL) => {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(7428)`
    await tx`create table if not exists migrations (name text primary key, ran_at timestamptz not null default now())`
    const done = new Set((await tx<{ name: string }[]>`select name from migrations`).map((r) => r.name))
    for (const file of files.filter((f) => !done.has(f))) {
      await tx.unsafe(await readFile(new URL(file, dir), 'utf8'))
      await tx`insert into migrations (name) values (${file})`
      console.log(`migrated ${file}`)
    }
  })
}

type SaveRow = { data: unknown; revision: number }

/** Stored rows go through `parseSaveData` too, so an older schema comes back current. */
const toStored = (row: SaveRow | undefined): Stored | null => (row ? { save: parseSaveData(row.data), revision: row.revision } : null)

/** Saves of players, by Clerk user id. */
export const saveStore = (sql: Sql) => ({
  read: async (userId: string) => toStored((await sql<SaveRow[]>`select data, revision from saves where user_id = ${userId}`)[0]),

  /**
   * Applies a push (`applyPush`) and returns what was stored. Locking the
   * player's row makes pushes from two devices take turns.
   */
  push: (userId: string, push: Push) =>
    sql.begin(async (tx) => {
      await tx`insert into users (id) values (${userId}) on conflict (id) do update set seen_at = now()`
      const stored = toStored((await tx<SaveRow[]>`select data, revision from saves where user_id = ${userId} for update`)[0])
      const next = applyPush(stored, push)
      await tx`
        insert into saves (user_id, version, revision, data)
        values (${userId}, ${next.save.version}, ${next.revision}, ${tx.json(next.save)})
        on conflict (user_id) do update
        set version = excluded.version, revision = excluded.revision, data = excluded.data, updated_at = now()`
      return next
    }),
})

export type SaveStore = ReturnType<typeof saveStore>
