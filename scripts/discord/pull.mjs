// Pulls the community server as it is now into snapshot.json, read-only.
// Staff edit names, order and looks by hand, so commit a pull before and after
// any setup.mjs run: git keeps every past state and the diff shows hand edits.
//
//   node --env-file=.env.local scripts/discord/pull.mjs

import { writeFileSync } from 'node:fs'
import { discord, GUILD } from './api.mjs'

/** Drops fields that change on their own (activity, counters), so diffs only show edits. */
const strip = (object, keys) => Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)))

const [guild, roles, channels, onboarding, welcomeScreen, automod, emojis] = await Promise.all([
  discord('GET', `/guilds/${GUILD}`),
  discord('GET', `/guilds/${GUILD}/roles`),
  discord('GET', `/guilds/${GUILD}/channels`),
  discord('GET', `/guilds/${GUILD}/onboarding`),
  discord('GET', `/guilds/${GUILD}/welcome-screen`),
  discord('GET', `/guilds/${GUILD}/auto-moderation/rules`),
  discord('GET', `/guilds/${GUILD}/emojis`),
])

// Channels in sidebar order: categories by position, each followed by its own.
const byPosition = (a, b) => a.position - b.position || a.id.localeCompare(b.id)
const categories = channels.filter((c) => c.type === 4).sort(byPosition)
const inside = (parentId) => channels.filter((c) => c.type !== 4 && (c.parent_id ?? null) === parentId).sort(byPosition)
const sidebar = [...inside(null), ...categories.flatMap((cat) => [cat, ...inside(cat.id)])]

const snapshot = {
  guild: strip(guild, ['roles', 'emojis', 'stickers', 'premium_subscription_count', 'premium_tier', 'approximate_member_count', 'approximate_presence_count']),
  roles: roles.sort((a, b) => b.position - a.position),
  channels: sidebar.map((c) => strip(c, ['last_message_id', 'last_pin_timestamp'])),
  onboarding,
  welcomeScreen,
  automod,
  emojis: emojis.map((e) => strip(e, ['user'])).sort((a, b) => a.name.localeCompare(b.name)),
}

const file = new URL('./snapshot.json', import.meta.url)
writeFileSync(file, `${JSON.stringify(snapshot, null, 2)}\n`)
console.log(`Pulled "${guild.name}": ${roles.length} roles, ${channels.length} channels, ${emojis.length} emojis → scripts/discord/snapshot.json`)
