/**
 * Donations, in whole reais through AbacatePay (Pix and Brazilian cards). The
 * support page (`/apoie/`) offers the presets or any amount in range, and the
 * API (`POST /donations`) refuses anything else. What a donation brings in the game is in `game/supporters.ts`.
 */
export const DONATION = {
  presets: [5, 10, 25, 50],
  preset: 10,
  /** Pix costs a flat R$ 0,80 per payment, so smaller gifts would mostly go to fees. */
  min: 5,
  max: 1000,
} as const

/** A donation amount in reais (`25`, `"25"`), or null if it isn't a whole number in range. */
export const parseDonation = (value: unknown) => {
  const amount = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof amount === 'number' && Number.isInteger(amount) && amount >= DONATION.min && amount <= DONATION.max ? amount : null
}

/** Brazil's IANA time zones (`America/Sao_Paulo`, `America/Manaus`…). */
const BRAZIL_ZONES = new Set([
  'America/Araguaina', 'America/Bahia', 'America/Belem', 'America/Boa_Vista', 'America/Campo_Grande', 'America/Cuiaba',
  'America/Eirunepe', 'America/Fortaleza', 'America/Maceio', 'America/Manaus', 'America/Noronha', 'America/Porto_Velho',
  'America/Recife', 'America/Rio_Branco', 'America/Santarem', 'America/Sao_Paulo', 'Brazil/Acre', 'Brazil/DeNoronha',
  'Brazil/East', 'Brazil/West',
])

/**
 * Whether the device's time zone is in Brazil: the support page's guess at
 * which way to pay, without asking any server. The language says nothing
 * (plenty of Brazilians play in English), and the player can always pick the other.
 */
export const inBrazil = (timeZone: string) => BRAZIL_ZONES.has(timeZone)
