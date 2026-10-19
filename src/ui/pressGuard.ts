/**
 * Which confirms a menu takes, by the time since it opened (ms): none before
 * `ms`, and each one refused pushes that moment to `rearm` ms after it. So a
 * button still being mashed for something else (A and Space fire the special
 * in a run and confirm in menus) never lands on the menu that interrupted it,
 * and the first press after a short pause does. `ms = 0` takes every press.
 */
export const pressGuard = (ms: number, rearm = 300) => {
  let opensAt = ms
  return (elapsed: number) => {
    if (elapsed >= opensAt) return true
    opensAt = Math.max(opensAt, elapsed + rearm)
    return false
  }
}
