const API = 'https://api.abacatepay.com/v2'

/** Where AbacatePay's checkout sends the donor back to. */
export type DonationUrls = { completionUrl: string; returnUrl: string }

/** Opens a checkout for a donation of `amount` reais and returns its URL. */
export type Donate = (amount: number, urls: DonationUrls) => Promise<string>

type Envelope<T> = { data: T | null; error: string | null; success: boolean }

/**
 * Donations through AbacatePay's hosted checkout (Pix and Brazilian cards).
 * A checkout only sells catalog products, so each amount gets its own product
 * ("Doação R$ 25", `externalId` `donation-25`), found or created the first time
 * someone gives it and remembered afterwards. Amounts come from `parseDonation`,
 * so there are at most a thousand of them.
 */
export const abacatePay = (apiKey: string): Donate => {
  /** One API call: its `data`, null for a 404, and a throw for any other failure. */
  const call = async <T>(path: string, init?: { body: unknown }): Promise<T | null> => {
    const res = await fetch(`${API}${path}`, {
      method: init ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: init && JSON.stringify(init.body),
    })
    const body = (await res.json().catch(() => null)) as Envelope<T> | null
    if (res.status === 404) return null
    if (!res.ok || !body?.success || !body.data) throw new Error(`AbacatePay ${path}: ${res.status} ${body?.error ?? ''}`)
    return body.data
  }

  const products = new Map<number, Promise<string>>()

  const findOrCreate = async (amount: number) => {
    const externalId = `donation-${amount}`
    const known = await call<{ id: string }>(`/products/get?externalId=${externalId}`)
    if (known) return known.id
    const product = await call<{ id: string }>('/products/create', {
      body: {
        externalId,
        name: `Doação R$ ${amount}`,
        description: 'Apoio ao Pokémon Survivors, um fan game gratuito. Não dá nada dentro do jogo.',
        price: amount * 100,
        currency: 'BRL',
      },
    })
    if (!product) throw new Error('AbacatePay /products/create: 404')
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

  return async (amount, urls) => {
    const id = await productFor(amount)
    const checkout = await call<{ url: string }>('/checkouts/create', {
      body: { items: [{ id, quantity: 1 }], methods: ['PIX', 'CARD'], ...urls },
    })
    if (!checkout) throw new Error('AbacatePay /checkouts/create: 404')
    return checkout.url
  }
}
