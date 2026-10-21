// The Discord API as the community server's bot, shared by setup.mjs and pull.mjs.

export const TOKEN = process.env.DISCORD_BOT_TOKEN
export const GUILD = process.env.DISCORD_GUILD_ID
if (!TOKEN || !GUILD) throw new Error('Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID')

const API = 'https://discord.com/api/v10'

/** Calls the Discord API as the bot, waiting out rate limits. */
export const discord = async (method, path, body) => {
  for (;;) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (res.status === 429) {
      const { retry_after } = await res.json()
      await new Promise((r) => setTimeout(r, Math.ceil(retry_after * 1000) + 50))
      continue
    }
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`)
    return res.status === 204 ? null : res.json()
  }
}
