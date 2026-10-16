import type { Locale } from '../../i18n'
import { SITE_MESSAGES } from '../../i18n/site'
import { CHANGELOG, type ChangelogEntry } from '../changelog'
import { html } from '../html'
import { layout } from '../layout'
import { REPO_URL } from '../routes'

/** Entries grouped by date, keeping the file's newest-first order. */
const byDate = (entries: readonly ChangelogEntry[]) =>
  entries.reduce<Array<{ date: string; entries: ChangelogEntry[] }>>((groups, entry) => {
    const last = groups[groups.length - 1]
    if (last?.date === entry.date) last.entries.push(entry)
    else groups.push({ date: entry.date, entries: [entry] })
    return groups
  }, [])

/** `/novidades/`: the changelog, in every language, from `site/changelog.ts`. */
export const changelogPage = (locale: Locale) => {
  const m = SITE_MESSAGES[locale]
  const longDate = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(m.lang.tag, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const main = html`<div class="page-head">
    <h1>${m.changelog.h1}</h1>
    <p class="lead">${m.changelog.intro}</p>
  </div>
  <div class="doc-body narrow">
    ${byDate(CHANGELOG).map(
      (group) => html`<section class="changelog-day">
      <h2><time datetime="${group.date}">${longDate(group.date)}</time></h2>
      ${group.entries.map(
        (e) => html`<article class="box doc-section">
        <h3>${e.title[locale]}${e.pr !== undefined && html` <a class="pr" href="${REPO_URL}/pull/${e.pr}">${m.changelog.pr(e.pr)}</a>`}</h3>
        <ul>${e.notes.map((note) => html`<li>${note[locale]}</li>`)}</ul>
      </article>`,
      )}
    </section>`,
    )}
  </div>`
  return layout({ id: 'changelog', locale, title: m.changelog.title, description: m.changelog.description }, main)
}
