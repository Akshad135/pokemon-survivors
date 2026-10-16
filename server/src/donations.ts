const API = 'https://api.abacatepay.com/v2'

/** Where AbacatePay's checkout sends the donor back to. */
export type DonationUrls = { completionUrl: string; returnUrl: string }

/**
 * Opens a checkout for a donation of `amount` reais and returns its URL.
 * `externalId` comes back in the webhook that says it's paid (`webhooks.ts`).
 */
export type Donate = (amount: number, urls: DonationUrls, externalId: string) => Promise<string>

type Envelope<T> = { data: T | null; error: string | null; success: boolean }

/**
 * Donations through AbacatePay's hosted checkout (Pix and Brazilian cards).
 * A checkout only sells catalog products, so each amount gets its own product
 * ("Doação Pokémon Survivors (R$ 25)", `externalId` `pokemon-survivors-donation-25`, prefixed because
 * the AbacatePay account may sell other things), found or created the first time
 * someone gives it and remembered afterwards. Amounts come from `parseDonation`,
 * so there are at most a thousand of them.
 */
export const abacatePay = (apiKey: string): Donate => {
  /**
   * One API call: its `data`, or null when AbacatePay refuses the request
   * (a 4xx such as "Product not found", which it answers with 400, not 404).
   * Throws when the key is refused, on rate limits, server errors and network failures.
   */
  const call = async <T>(path: string, init?: { body: unknown }): Promise<T | null> => {
    const res = await fetch(`${API}${path}`, {
      method: init ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: init && JSON.stringify(init.body),
    })
    const body = (await res.json().catch(() => null)) as Envelope<T> | null
    if (res.ok && body?.success && body.data) return body.data
    if (res.status >= 400 && res.status < 500 && ![401, 403, 429].includes(res.status)) return null
    throw new Error(`AbacatePay ${path}: ${res.status} ${body?.error ?? ''}`)
  }

  const products = new Map<number, Promise<string>>()

  const findOrCreate = async (amount: number) => {
    const externalId = `pokemon-survivors-donation-${amount}`
    const find = () => call<{ id: string }>(`/products/get?externalId=${externalId}`)
    const create = () => call<{ id: string }>('/products/create', {
      body: {
        externalId,
        name: `Doação Pokémon Survivors (R$ ${amount})`,
        description: 'Apoio ao Pokémon Survivors, um fan game gratuito. Com uma conta, dá um agradecimento cosmético no jogo.',
        price: amount * 100,
        currency: 'BRL',
      },
    })
    // Found, else created, else found again: another instance may have just created it.
    const product = (await find()) ?? (await create()) ?? (await find())
    if (!product) throw new Error(`AbacatePay: no product ${externalId}`)
    return product.id
  }

  const productFor = (amount: number) => {
    const known = products.get(amount)
    if (known) return known
    // A failed lookup is forgotten, so the next donor tries again.
    const id = findOrCreate(amount).catch((err: unknown) => {
      products.delete(amount)
      throw err
    })
    products.set(amount, id)
    return id
  }

  return async (amount, urls, externalId) => {
    const id = await productFor(amount)
    const checkout = await call<{ url: string }>('/checkouts/create', {
      body: { items: [{ id, quantity: 1 }], methods: ['PIX', 'CARD'], externalId, ...urls },
    })
    if (!checkout) throw new Error(`AbacatePay refused a checkout of R$ ${amount}`)
    return checkout.url
  }
}
