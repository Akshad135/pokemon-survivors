/** Origins the game is served from. `CORS_ORIGINS` (comma separated) adds more, like a preview deploy. */
const ORIGINS = ['https://www.pokemonsurvivors.com', 'https://pokemonsurvivors.com']

const LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

const required = (name: string) => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable ${name}`)
  return value
}

/** Server config, read once at boot. Throws when a required variable is missing. */
export const loadEnv = () => {
  const origins = [...ORIGINS, ...(process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean)]
  return {
    port: Number(process.env.PORT ?? 3000),
    databaseUrl: required('DATABASE_URL'),
    clerkSecretKey: required('CLERK_SECRET_KEY'),
    /** Optional PEM public key: verifies tokens without fetching Clerk's keys. */
    clerkJwtKey: process.env.CLERK_JWT_KEY || undefined,
    /** Optional AbacatePay key (donations by Pix and Brazilian cards). Without it `POST /donations` answers 503. */
    abacatePayKey: process.env.ABACATEPAY_API_KEY || undefined,
    /**
     * Optional: the AbacatePay webhook's secret, `whsec_…` (Standard Webhooks), or for a webhook made
     * before 01/10/2026 the one in its URL (`?webhookSecret=`). Without it `POST /webhooks/abacatepay` answers 503.
     */
    abacatePayWebhookSecret: process.env.ABACATEPAY_WEBHOOK_SECRET || undefined,
    /** Optional: the Stripe webhook's signing secret (`whsec_…`). Without it `POST /webhooks/stripe` answers 503. */
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || undefined,
    /** Optional: the donation Payment Link's id (`plink_…`); set, other Checkout Sessions of the account are ignored. */
    stripePaymentLink: process.env.STRIPE_PAYMENT_LINK || null,
    /** Emails (comma separated, `ADMIN_EMAILS`) whose verified owners run the gift desk (`admin.ts`). Empty: nobody is admin. */
    adminEmails: (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
    /** Whether the game at `origin` may call the API (CORS) and own its tokens (`azp`). */
    allowedOrigin: (origin: string) => origins.includes(origin) || LOCALHOST.test(origin),
  }
}

export type Env = ReturnType<typeof loadEnv>
