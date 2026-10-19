/** What the browser says about installing the game (`install.ts` reads it). */
export type InstallEnv = {
  /** Running as the installed app (`display-mode` fullscreen or standalone, iOS's `navigator.standalone`), or just installed. */
  installed: boolean
  /** Chromium handed over its install prompt (`beforeinstallprompt`). */
  prompt: boolean
  ios: boolean
}

/** How Settings offers the app: Chromium's own `prompt`, the `ios` how-to sheet (Safari has no prompt API), or not at all. */
export type InstallOffer = 'prompt' | 'ios' | null

export const installOffer = (env: InstallEnv): InstallOffer => (env.installed ? null : env.prompt ? 'prompt' : env.ios ? 'ios' : null)

/** iPhone, iPod and iPad, iPadOS's Safari included: it says Macintosh, but Macs have no touch screen. */
export const isIos = (userAgent: string, touchPoints: number) => /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && touchPoints > 1)
